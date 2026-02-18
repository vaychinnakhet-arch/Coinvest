import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Partner, Project, Transaction, TransactionType } from './types';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { PartnerSummary } from './components/PartnerSummary';
import { ProjectSummary } from './components/ProjectSummary';
import { Settings } from './components/Settings';
import { LayoutDashboard, FolderKanban, Users, Settings as SettingsIcon, PieChart, BarChart3, Database } from 'lucide-react';
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

  const NavItem = ({ viewName, label, icon: Icon, description }: { viewName: ViewState, label: string, icon: any, description?: string }) => {
    const isActive = view === viewName;
    return (
      <button
        onClick={() => setView(viewName)}
        className={`relative group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 w-full text-left ${
          isActive 
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-200 scale-100' 
            : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md hover:shadow-slate-100 hover:scale-[1.02]'
        }`}
      >
        {/* Icon Container */}
        <div className={`p-2.5 rounded-xl transition-all duration-300 ${
          isActive 
            ? 'bg-white/20 text-white' 
            : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
        }`}>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        
        {/* Text */}
        <div className="flex flex-col">
          <span className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-indigo-900'}`}>
            {label}
          </span>
          {description && (
             <span className={`text-[10px] ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
               {description}
             </span>
          )}
        </div>

        {/* Active Indicator (Right Arrow or similar) */}
        {isActive && (
           <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar - Enhanced */}
      <aside className="w-72 bg-slate-50/50 backdrop-blur-xl border-r border-slate-200/60 hidden md:flex flex-col p-6 z-20 relative">
        {/* Logo Section */}
        <div className="flex items-center gap-3 mb-10 px-2 mt-2">
          <div className="relative">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 transform rotate-3">
               <PieChart size={24} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              CoInvest
            </h1>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Finance Tracker</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
          <NavItem viewName="DASHBOARD" label="ภาพรวม" icon={LayoutDashboard} description="Dashboard Overview" />
          <NavItem viewName="PROJECTS" label="โครงการ & บัญชี" icon={FolderKanban} description="Manage Projects" />
          <NavItem viewName="PROJECT_SUMMARY" label="สรุปภาพรวม" icon={BarChart3} description="Project Analytics" />
          <NavItem viewName="PARTNERS" label="สรุปยอดหุ้นส่วน" icon={Users} description="Partner Shares" />
          
          <div className="my-6 border-t border-slate-200/60 mx-4"></div>
          
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System</p>
          <NavItem viewName="SETTINGS" label="จัดการข้อมูล" icon={SettingsIcon} description="Settings & Backup" />
        </nav>

        {/* Bottom Status Card */}
        <div className="mt-auto">
           <div className={`p-4 rounded-2xl border transition-all duration-300 ${
             isConnected 
               ? 'bg-emerald-50/80 border-emerald-100' 
               : 'bg-white border-slate-100 shadow-sm'
           }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className={`text-xs font-bold ${isConnected ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {isConnected ? 'Google Sheets Sync' : 'Local Storage'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {isConnected 
                  ? 'ระบบกำลังซิงค์ข้อมูลกับ Cloud โดยอัตโนมัติ' 
                  : 'ข้อมูลถูกบันทึกในเครื่องนี้เท่านั้น'}
              </p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-100 p-4 flex justify-between items-center z-20">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <PieChart size={16} />
             </div>
             <h1 className="text-lg font-bold text-indigo-900">CoInvest</h1>
           </div>
           <div className="flex gap-2">
             <button onClick={() => setView('DASHBOARD')} className={`p-2 rounded-lg ${view === 'DASHBOARD' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><LayoutDashboard/></button>
             <button onClick={() => setView('PROJECTS')} className={`p-2 rounded-lg ${view === 'PROJECTS' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><FolderKanban/></button>
             <button onClick={() => setView('PROJECT_SUMMARY')} className={`p-2 rounded-lg ${view === 'PROJECT_SUMMARY' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><BarChart3/></button>
             <button onClick={() => setView('PARTNERS')} className={`p-2 rounded-lg ${view === 'PARTNERS' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><Users/></button>
             <button onClick={() => setView('SETTINGS')} className={`p-2 rounded-lg ${view === 'SETTINGS' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><SettingsIcon/></button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar relative z-10">
          <div className="max-w-[1600px] mx-auto">
            {view === 'SETTINGS' ? (
              <Settings 
                data={data} 
                onImport={handleImportData} 
                onAddPartner={handleAddPartner}
                onDeletePartner={handleDeletePartner}
              />
            ) : (
              <>
                <div className="mb-8 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hidden md:block">
                     {view === 'DASHBOARD' && <LayoutDashboard className="text-indigo-600"/>}
                     {view === 'PROJECTS' && <FolderKanban className="text-indigo-600"/>}
                     {view === 'PROJECT_SUMMARY' && <BarChart3 className="text-indigo-600"/>}
                     {view === 'PARTNERS' && <Users className="text-indigo-600"/>}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      {view === 'DASHBOARD' ? 'ภาพรวมการลงทุน' : 
                      view === 'PROJECTS' ? 'จัดการโครงการ' : 
                      view === 'PROJECT_SUMMARY' ? 'สรุปภาพรวมโครงการ' :
                      'สรุปยอดหุ้นส่วน'}
                    </h2>
                    <p className="text-sm text-slate-500 hidden md:block">
                      {view === 'DASHBOARD' ? 'Overview & Statistics' : 
                      view === 'PROJECTS' ? 'Manage Projects & Accounts' : 
                      view === 'PROJECT_SUMMARY' ? 'Project Analytics Report' :
                      'Partner Investment Summary'}
                    </p>
                  </div>
                  {isLoading && <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full animate-pulse border border-indigo-100 font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Updating...</span>}
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
