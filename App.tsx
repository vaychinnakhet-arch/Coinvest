import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Cloud,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react';
import { AppState, Partner, Project, Transaction, TransactionType, ViewState } from './types';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { PartnerSummary } from './components/PartnerSummary';
import { ProjectSummary } from './components/ProjectSummary';
import { Settings } from './components/Settings';
import { Accounts } from './components/Accounts';
import { googleSheetsService } from './services/googleSheetsService';

const INITIAL_DATA: AppState = { partners: [], projects: [], transactions: [] };

const DEMO_DATA: AppState = {
  partners: [
    { id: 'demo-a', name: 'A', avatar: 'A', color: '#0f766e' },
    { id: 'demo-b', name: 'B', avatar: 'B', color: '#3b82f6' },
  ],
  projects: [
    { id: 'demo-project', name: 'โครงการตัวอย่าง', description: 'ข้อมูลจำลองสำหรับตรวจหน้าจอและเอกสาร', status: 'active', startDate: '2026-08-01' },
  ],
  transactions: [
    { id: 'demo-invest-a', projectId: 'demo-project', partnerId: 'demo-a', type: TransactionType.INVESTMENT, amount: 10, date: '2026-08-01', note: 'A ลงเงิน' },
    { id: 'demo-invest-b', projectId: 'demo-project', partnerId: 'demo-b', type: TransactionType.INVESTMENT, amount: 10, date: '2026-08-01', note: 'B ลงเงิน' },
    { id: 'demo-income', projectId: 'demo-project', type: TransactionType.INCOME, amount: 5, date: '2026-08-02', note: 'รายรับจากการขาย' },
    ...Array.from({ length: 20 }, (_, index) => ({
      id: `demo-expense-${index + 1}`,
      projectId: 'demo-project',
      type: TransactionType.EXPENSE,
      amount: 1,
      date: `2026-08-${String(index + 3).padStart(2, '0')}`,
      note: `ค่าใช้จ่ายรายการที่ ${index + 1}`,
    })),
  ],
};

const navItems: { view: ViewState; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { view: 'DASHBOARD', label: 'ภาพรวม', shortLabel: 'ภาพรวม', icon: LayoutDashboard },
  { view: 'PROJECTS', label: 'โครงการและบันทึกรายการ', shortLabel: 'บันทึก', icon: FolderKanban },
  { view: 'ACCOUNTS', label: 'บัญชีรายรับ-รายจ่าย', shortLabel: 'บัญชี', icon: FileText },
  { view: 'PROJECT_SUMMARY', label: 'รายงานโครงการ', shortLabel: 'รายงาน', icon: BarChart3 },
  { view: 'PARTNERS', label: 'ผู้ถือหุ้น', shortLabel: 'ผู้ถือหุ้น', icon: Users },
];

const pageTitles: Record<ViewState, { title: string; description: string }> = {
  DASHBOARD: { title: 'ภาพรวมการเงิน', description: 'เห็นเงินคงเหลือและสถานะทั้งหมดในหน้าเดียว' },
  PROJECTS: { title: 'โครงการและบันทึกรายการ', description: 'เพิ่มรายรับ รายจ่าย และเงินลงทุน' },
  ACCOUNTS: { title: 'บัญชีรายรับ-รายจ่าย', description: 'ค้นหา ตรวจสอบ และส่งออกเอกสาร' },
  PROJECT_SUMMARY: { title: 'รายงานโครงการ', description: 'วิเคราะห์ผลการดำเนินงานแยกโครงการ' },
  PARTNERS: { title: 'ผู้ถือหุ้น', description: 'ติดตามเงินที่ลงและยอดคงเหลือรายคน' },
  SETTINGS: { title: 'ตั้งค่าและข้อมูล', description: 'จัดการผู้ถือหุ้น การสำรอง และการเชื่อมต่อ' },
};

const App: React.FC = () => {
  const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [data, setData] = useState<AppState>(isDemo ? DEMO_DATA : INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(isDemo);
  const [syncError, setSyncError] = useState(false);
  const isConnected = !isDemo && googleSheetsService.isConnected();

  useEffect(() => {
    const initData = async () => {
      if (isDemo) return;

      // Show the most recently known data immediately while cloud data loads.
      const saved = localStorage.getItem('coInvestData');
      if (saved) {
        try { setData(JSON.parse(saved)); } catch { console.error('Invalid local data'); }
      }

      if (isConnected) {
        setIsLoading(true);
        setSyncError(false);
        const cloudData = await googleSheetsService.loadData();
        if (cloudData) {
          setData(cloudData);
          localStorage.setItem('coInvestData', JSON.stringify(cloudData));
        } else {
          setSyncError(true);
        }
        setIsLoading(false);
      }
      setHasHydrated(true);
    };
    initData();
  }, [isConnected, isDemo]);

  useEffect(() => {
    if (hasHydrated && !isDemo) localStorage.setItem('coInvestData', JSON.stringify(data));
  }, [data, hasHydrated, isDemo]);

  const addProject = async (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: crypto.randomUUID() };
    setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
    if (isConnected) {
      const result = await googleSheetsService.addProject(newProject);
      if (result.error) {
        setSyncError(true);
        console.warn('บันทึกโครงการขึ้นคลาวด์ไม่สำเร็จ (บันทึกในเครื่องแล้ว):', result.error);
      } else {
        setSyncError(false);
      }
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...transaction, id: crypto.randomUUID() };
    setData(prev => ({ ...prev, transactions: [...prev.transactions, newTransaction] }));
    if (isConnected) {
      const result = await googleSheetsService.addTransaction(newTransaction);
      if (result.error) {
        setSyncError(true);
        console.warn('บันทึกรายการขึ้นคลาวด์ไม่สำเร็จ (บันทึกในเครื่องแล้ว):', result.error);
      } else {
        setSyncError(false);
      }
    }
  };

  const updateTransaction = async (transaction: Transaction) => {
    setData(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === transaction.id ? transaction : t) }));
    if (isConnected) {
      const result = await googleSheetsService.updateTransaction(transaction);
      if (result.error) {
        setSyncError(true);
        console.warn('แก้ไขรายการขึ้นคลาวด์ไม่สำเร็จ (บันทึกในเครื่องแล้ว):', result.error);
      } else {
        setSyncError(false);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
    if (isConnected) {
      const result = await googleSheetsService.deleteTransaction(id);
      if (result.error) {
        setSyncError(true);
        console.warn('ลบรายการบนคลาวด์ไม่สำเร็จ (ลบในเครื่องแล้ว):', result.error);
      } else {
        setSyncError(false);
      }
    }
  };

  const addPartner = async (partner: Omit<Partner, 'id'>) => {
    const newPartner = { ...partner, id: crypto.randomUUID() };
    setData(prev => ({ ...prev, partners: [...prev.partners, newPartner] }));
    if (isConnected) {
      const result = await googleSheetsService.addPartner(newPartner);
      if (result.error) {
        setSyncError(true);
        console.warn('บันทึกผู้ถือหุ้นขึ้นคลาวด์ไม่สำเร็จ (บันทึกในเครื่องแล้ว):', result.error);
      } else {
        setSyncError(false);
      }
    }
  };

  const updatePartner = async (partner: Partner) => {
    setData(prev => ({
      ...prev,
      partners: prev.partners.map(p => p.id === partner.id ? partner : p)
    }));
    if (isConnected) {
      const result = await googleSheetsService.updatePartner(partner);
      if (result.error) {
        setSyncError(true);
        console.warn('แก้ไขผู้ถือหุ้นขึ้นคลาวด์ไม่สำเร็จ (บันทึกในเครื่องแล้ว):', result.error);
      } else {
        setSyncError(false);
      }
    }
  };

  const deletePartner = async (id: string) => {
    if (data.transactions.some(t => t.partnerId === id)) {
      alert('ไม่สามารถลบผู้ถือหุ้นที่มีรายการอยู่ได้');
      return;
    }
    setData(prev => ({ ...prev, partners: prev.partners.filter(p => p.id !== id) }));
    if (isConnected) {
      const result = await googleSheetsService.deletePartner(id);
      if (result.error) {
        setSyncError(true);
        console.warn('ลบผู้ถือหุ้นบนคลาวด์ไม่สำเร็จ (ลบในเครื่องแล้ว):', result.error);
      } else {
        setSyncError(false);
      }
    }
  };

  const importData = async (importedData: AppState) => {
    if (isConnected) {
      const confirmed = confirm('นำเข้าข้อมูลนี้และเขียนทับข้อมูลบน Google Sheets หรือไม่?');
      if (!confirmed) return;
      setIsLoading(true);
      const result = await googleSheetsService.importData(importedData);
      setIsLoading(false);
      if (result.error) {
        alert('นำเข้าข้อมูลไม่สำเร็จ');
        return;
      }
    } else if (!confirm('นำเข้าข้อมูลและเขียนทับข้อมูลปัจจุบันในเครื่องหรือไม่?')) {
      return;
    }
    setData(importedData);
    setView('DASHBOARD');
  };

  const navigate = (nextView: ViewState) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentPage = pageTitles[view];

  return (
    <div className="min-h-screen pb-24 text-[#2f3a3d] md:pb-0">
      <header className="sticky top-0 z-40 border-b-2 border-[#2f3a3d] bg-[#f4f0e6]/95 backdrop-blur-lg">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button onClick={() => navigate('DASHBOARD')} className="pressable flex shrink-0 items-center gap-3 text-left" aria-label="ไปหน้าภาพรวม">
            <BrandLogo />
            <span className="hidden sm:block">
              <strong className="block text-[19px] font-bold leading-none tracking-[-0.04em] text-[#2f3a3d]">CO<span className="text-[#d96b5f]">/</span>INVEST</strong>
              <small className="mt-1 block text-[10px] font-semibold tracking-wide text-[#687477]">เงินร่วมกัน เห็นภาพเดียวกัน</small>
            </span>
          </button>

          <nav className="desktop-nav mx-auto hidden items-center gap-1 p-1 lg:flex" aria-label="เมนูหลัก">
            {navItems.map(item => <TopNavButton key={item.view} item={item} active={view === item.view} onClick={() => navigate(item.view)} />)}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <div className="hidden items-center gap-2 rounded-[10px] border-2 border-[#2f3a3d] bg-[#fffdf7] px-3 py-2 xl:flex">
              <Cloud size={15} className={syncError ? 'text-[#d96b5f]' : isConnected ? 'text-[#7b9e87]' : 'text-[#879092]'} />
              <span className="text-[11px] font-bold">{isLoading ? 'กำลังซิงค์...' : syncError ? 'ออฟไลน์ · ใช้ข้อมูลสำรอง' : isConnected ? 'Google Sheets' : 'ในเครื่อง'}</span>
            </div>
            <button onClick={() => navigate('SETTINGS')} className={`pressable grid h-11 w-11 place-items-center rounded-[11px] border-2 border-[#2f3a3d] shadow-[2px_2px_0_#2f3a3d] ${view === 'SETTINGS' ? 'bg-[#e7be69] text-[#2f3a3d]' : 'bg-[#fffdf7] text-[#566164] hover:bg-[#eee8da]'}`} aria-label="ตั้งค่าและข้อมูล">
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 md:py-7 lg:px-8">
          <section className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-7">
            <div>
              <span className="mb-2 inline-block rounded-md bg-[#e7be69] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#2f3a3d]">COINVEST BOARD</span>
              <h1 className="page-heading font-bold text-[#2f3a3d]">{currentPage.title}</h1>
              <p className="mt-1 max-w-2xl text-xs font-medium text-[#687477] sm:text-sm">{currentPage.description}</p>
            </div>
            {isLoading && <span className="rounded-lg border-2 border-[#2f3a3d] bg-[#dce9e1] px-3 py-1.5 text-[11px] font-bold">กำลังอัปเดตข้อมูล</span>}
          </section>

          {view === 'DASHBOARD' && <Dashboard data={data} onNavigate={navigate} />}
          {view === 'PROJECTS' && <Projects data={data} onAddProject={addProject} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} />}
          {view === 'ACCOUNTS' && <Accounts data={data} />}
          {view === 'PROJECT_SUMMARY' && <ProjectSummary data={data} />}
          {view === 'PARTNERS' && <PartnerSummary data={data} onUpdatePartner={updatePartner} />}
          {view === 'SETTINGS' && <Settings data={data} onImport={importData} onAddPartner={addPartner} onUpdatePartner={updatePartner} onDeletePartner={deletePartner} />}
        </div>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[14px] border-2 border-[#2f3a3d] bg-[#fffdf7]/95 p-1.5 shadow-[3px_3px_0_#2f3a3d] backdrop-blur md:hidden" aria-label="เมนูบนมือถือ">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button key={item.view} onClick={() => navigate(item.view)} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[9px] text-[10px] font-bold transition-colors ${active ? 'bg-[#d96b5f] text-white' : 'text-[#687477] hover:bg-[#eee8da]'}`}>
              <Icon size={19} strokeWidth={active ? 2.4 : 1.9} /> {item.shortLabel}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

const BrandLogo = () => (
  <span className="brand-mark" aria-hidden="true"><span className="brand-link" /></span>
);

const TopNavButton = ({ item, active, onClick }: { item: { label: string; shortLabel: string; icon: React.ElementType }; active: boolean; onClick: () => void }) => {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className={`flex items-center gap-2 whitespace-nowrap rounded-[9px] px-3 py-2 text-xs font-bold transition-colors xl:px-4 xl:text-sm ${active ? 'bg-[#d96b5f] text-white' : 'text-[#566164] hover:bg-[#eee8da] hover:text-[#2f3a3d]'}`}>
      <Icon size={17} strokeWidth={active ? 2.5 : 2} /> {item.shortLabel}
    </button>
  );
};

export default App;
