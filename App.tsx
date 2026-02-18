import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Partner, Project, Transaction, TransactionType } from './types';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { PartnerSummary } from './components/PartnerSummary';
import { ProjectSummary } from './components/ProjectSummary';
import { Settings } from './components/Settings';
import { LayoutDashboard, FolderKanban, Users, Settings as SettingsIcon, PieChart, BarChart3 } from 'lucide-react';
import { googleSheetsService } from './services/googleSheetsService';

// Mock Data for Initial State (Fallback)
const INITIAL_DATA: AppState = {
  partners: [
    { id: 'p1', name: 'คุณเอก', avatar: '👨‍💼', color: '#818CF8' },
    { id: 'p2', name: 'คุณโท', avatar: '👩‍💼', color: '#34D399' },
    { id: 'p3', name: 'คุณตรี', avatar: '👨‍💻', color: '#F472B6' },
  ],
  projects: [
    { id: 'proj1', name: 'ร้านกาแฟ สาขา 1', description: 'Renovate ตึกเก่าทำร้านกาแฟสไตล์ Loft', status: 'active', startDate: '2023-01-15' },
  ],
  transactions: [
    { id: 't1', projectId: 'proj1', partnerId: 'p1', type: TransactionType.INVESTMENT, amount: 500000, date: '2023-01-15', note: 'เงินลงทุนก้อนแรก' },
    { id: 't2', projectId: 'proj1', partnerId: 'p2', type: TransactionType.INVESTMENT, amount: 300000, date: '2023-01-16', note: 'ร่วมทุน' },
  ]
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [data, setData] = useState<AppState>(INITIAL_DATA);
  const isConnected = googleSheetsService.isConnected();
  const [isLoading, setIsLoading] = useState(false);

  // Load data
  useEffect(() => {
    const initData = async () => {
      if (isConnected) {
        setIsLoading(true);
        const cloudData = await googleSheetsService.loadData();
        if (cloudData) {
            setData(cloudData);
        } else {
            console.error("Failed to load data from Google Sheets");
        }
        setIsLoading(false);
      } else {
        // Fallback: LocalStorage
        const saved = localStorage.getItem('coInvestData');
        if (saved) setData(JSON.parse(saved));
      }
    };

    initData();
  }, [isConnected]);

  // Sync to LocalStorage (Only if NOT using Cloud, or as backup)
  useEffect(() => {
    if (!isConnected) {
      localStorage.setItem('coInvestData', JSON.stringify(data));
    }
  }, [data, isConnected]);

  // --- Actions (Optimistic UI: Update Local -> Sync Remote) ---

  const handleAddProject = async (project: Omit<Project, 'id'>) => {
    const newProject: Project = { ...project, id: Math.random().toString(36).substr(2, 9) };
    
    // 1. Optimistic Update (Show immediately)
    setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));

    // 2. Sync to Cloud
    if (isConnected) {
      const result = await googleSheetsService.addProject(newProject);
      if (result.error) {
        console.error("Add Project Failed:", result.error);
        alert("บันทึกข้อมูลไม่สำเร็จ");
      }
    }
  };

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...transaction, id: Math.random().toString(36).substr(2, 9) };
    
    // 1. Optimistic Update
    setData(prev => ({ ...prev, transactions: [...prev.transactions, newTransaction] }));

    // 2. Sync to Cloud
    if (isConnected) {
      const result = await googleSheetsService.addTransaction(newTransaction);
      if (result.error) {
         console.error("Add Transaction Failed:", result.error);
         alert("บันทึกข้อมูลไม่สำเร็จ");
      }
    }
  };

  const handleUpdateTransaction = async (transaction: Transaction) => {
    // 1. Optimistic Update
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === transaction.id ? transaction : t)
    }));

    // 2. Sync to Cloud
    if (isConnected) {
      const result = await googleSheetsService.updateTransaction(transaction);
      if (result.error) {
         console.error("Update Transaction Failed:", result.error);
         alert("แก้ไขข้อมูลไม่สำเร็จ");
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    // 1. Optimistic Update
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));

    // 2. Sync to Cloud
    if (isConnected) {
      const result = await googleSheetsService.deleteTransaction(id);
      if (result.error) {
         console.error("Delete Transaction Failed:", result.error);
         alert("ลบข้อมูลไม่สำเร็จ");
      }
    }
  };

  const handleAddPartner = async (partner: Omit<Partner, 'id'>) => {
    const newPartner: Partner = { ...partner, id: Math.random().toString(36).substr(2, 9) };

    // 1. Optimistic Update
    setData(prev => ({ ...prev, partners: [...prev.partners, newPartner] }));

    // 2. Sync to Cloud
    if (isConnected) {
      const result = await googleSheetsService.addPartner(newPartner);
      if (result.error) {
         console.error("Add Partner Failed:", result.error);
         alert("บันทึกข้อมูลไม่สำเร็จ");
      }
    }
  };

  const handleDeletePartner = async (id: string) => {
    const hasTransactions = data.transactions.some(t => t.partnerId === id);
    if (hasTransactions) {
      alert("ไม่สามารถลบหุ้นส่วนที่มีรายการธุรกรรมอยู่ได้");
      return;
    }

    // 1. Optimistic Update
    setData(prev => ({ ...prev, partners: prev.partners.filter(p => p.id !== id) }));

    // 2. Sync to Cloud
    if (isConnected) {
      const result = await googleSheetsService.deletePartner(id);
      if (result.error) {
         console.error("Delete Partner Failed:", result.error);
         alert("ลบข้อมูลไม่สำเร็จ");
      }
    }
  };

  const handleImportData = async (importedData: AppState) => {
    if (isConnected) {
      const confirmUpload = confirm(
        "⚠️ คุณกำลังเชื่อมต่อกับ Google Sheets\n\n" +
        "กด 'OK' เพื่ออัปโหลดข้อมูลจากไฟล์ JSON นี้ไปทับข้อมูลบน Cloud (ข้อมูลเก่าบน Sheet จะหายไป)\n" +
        "กด 'Cancel' เพื่อดูข้อมูลแบบ Offline เท่านั้น (ข้อมูลจะไม่ถูกบันทึก)"
      );

      if (confirmUpload) {
        setIsLoading(true);
        const result = await googleSheetsService.importData(importedData);
        setIsLoading(false);
        
        if (result.error) {
           alert("เกิดข้อผิดพลาดในการอัปโหลดข้อมูลไปยัง Google Sheets: " + JSON.stringify(result.error));
           if (confirm("ต้องการโหลดข้อมูลนี้เพื่อดูแบบ Offline หรือไม่?")) {
              setData(importedData);
              setView('DASHBOARD');
           }
        } else {
           alert("นำเข้าและอัปโหลดข้อมูลสำเร็จ!");
           setData(importedData);
           setView('DASHBOARD');
        }
      } else {
         // View Offline Mode
         setData(importedData);
         setView('DASHBOARD');
      }
    } else {
      if (confirm("การนำเข้าข้อมูลจะเขียนทับข้อมูลปัจจุบันในเครื่อง คุณต้องการดำเนินการต่อหรือไม่?")) {
        setData(importedData);
        setView('DASHBOARD');
      }
    }
  };

  const NavItem = ({ viewName, label, icon: Icon }: { viewName: ViewState, label: string, icon: any }) => (
    <button
      onClick={() => setView(viewName)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left font-medium ${
        view === viewName 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col p-6 z-10">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-md">
            <PieChart size={22} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            CoInvest
          </h1>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem viewName="DASHBOARD" label="ภาพรวม" icon={LayoutDashboard} />
          <NavItem viewName="PROJECTS" label="โครงการ & บัญชี" icon={FolderKanban} />
          <NavItem viewName="PROJECT_SUMMARY" label="สรุปภาพรวมโครงการ" icon={BarChart3} />
          <NavItem viewName="PARTNERS" label="สรุปยอดหุ้นส่วน" icon={Users} />
          
          <div className="pt-4 mt-4 border-t border-slate-100">
             <NavItem viewName="SETTINGS" label="จัดการข้อมูล" icon={SettingsIcon} />
          </div>
        </nav>

        <div className="mt-auto px-4 py-4 bg-indigo-50 rounded-2xl">
           {isConnected ? (
             <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               Google Sheets Mode
             </div>
           ) : (
             <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
               <span className="w-2 h-2 rounded-full bg-slate-300"></span>
               Local Storage Mode
             </div>
           )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-100 p-4 flex justify-between items-center">
           <h1 className="text-lg font-bold text-indigo-600">CoInvest</h1>
           <div className="flex gap-2">
             <button onClick={() => setView('DASHBOARD')} className={`p-2 rounded-lg ${view === 'DASHBOARD' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><LayoutDashboard/></button>
             <button onClick={() => setView('PROJECTS')} className={`p-2 rounded-lg ${view === 'PROJECTS' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><FolderKanban/></button>
             <button onClick={() => setView('PROJECT_SUMMARY')} className={`p-2 rounded-lg ${view === 'PROJECT_SUMMARY' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><BarChart3/></button>
             <button onClick={() => setView('PARTNERS')} className={`p-2 rounded-lg ${view === 'PARTNERS' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><Users/></button>
             <button onClick={() => setView('SETTINGS')} className={`p-2 rounded-lg ${view === 'SETTINGS' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><SettingsIcon/></button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-[1920px] mx-auto">
            {view === 'SETTINGS' ? (
              <Settings 
                data={data} 
                onImport={handleImportData} 
                onAddPartner={handleAddPartner}
                onDeletePartner={handleDeletePartner}
              />
            ) : (
              <>
                <div className="mb-8 flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {view === 'DASHBOARD' ? 'ภาพรวมการลงทุน' : 
                     view === 'PROJECTS' ? 'จัดการโครงการ' : 
                     view === 'PROJECT_SUMMARY' ? 'สรุปภาพรวมโครงการ' :
                     'สรุปยอดหุ้นส่วน'}
                  </h2>
                  {isLoading && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg animate-pulse">กำลังโหลดข้อมูล...</span>}
                </div>

                {view === 'DASHBOARD' && <Dashboard data={data} />}
                {view === 'PROJECTS' && (
                  <Projects 
                    data={data} 
                    onAddProject={handleAddProject} 
                    onAddTransaction={handleAddTransaction}
                    onUpdateTransaction={handleUpdateTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                  />
                )}
                {view === 'PROJECT_SUMMARY' && <ProjectSummary data={data} />}
                {view === 'PARTNERS' && <PartnerSummary data={data} />}
              </>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94A3B8; }
      `}</style>
    </div>
  );
};

export default App;