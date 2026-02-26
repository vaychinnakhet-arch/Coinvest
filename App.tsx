import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Partner, Project, Transaction, TransactionType } from './types';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { PartnerSummary } from './components/PartnerSummary';
import { ProjectSummary } from './components/ProjectSummary';
import { Settings } from './components/Settings';
import { Accounts } from './components/Accounts';
import { LayoutDashboard, FolderKanban, Users, Settings as SettingsIcon, PieChart, BarChart3, Database, FileText } from 'lucide-react';
import { googleSheetsService } from './services/googleSheetsService';

// Initial Empty State
const INITIAL_DATA: AppState = {
  partners: [],
  projects: [],
  transactions: []
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
        className={`relative group flex items-center gap-4 px-4 py-3.5 rounded-[24px] transition-all duration-300 w-full text-left mb-2 ${
          isActive 
            ? 'bg-teal-400 text-white shadow-md shadow-teal-400/30 scale-[1.02]' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-teal-500'
        }`}
      >
        {/* Icon Container */}
        <div className={`p-2.5 rounded-2xl transition-all duration-300 flex items-center justify-center ${
          isActive 
            ? 'bg-white/20 text-white shadow-inner' 
            : 'bg-white text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500 shadow-sm ring-1 ring-slate-100'
        }`}>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        
        {/* Text */}
        <div className="flex flex-col">
          <span className={`font-bold text-[15px] tracking-tight ${isActive ? 'text-white' : 'text-slate-700 group-hover:text-teal-900'}`}>
            {label}
          </span>
          {description && (
             <span className={`text-[11px] font-medium mt-0.5 ${isActive ? 'text-teal-50' : 'text-slate-400'}`}>
               {description}
             </span>
          )}
        </div>
      </button>
    );
  };

  const MobileNavItem = ({ viewName, label, icon: Icon, isCenter = false }: { viewName: ViewState, label: string, icon: any, isCenter?: boolean }) => {
    const isActive = view === viewName;
    
    if (isCenter) {
      return (
        <button
          onClick={() => setView(viewName)}
          className="relative -top-5 flex flex-col items-center justify-center"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
            isActive ? 'bg-teal-500 shadow-teal-500/40' : 'bg-teal-400 shadow-teal-400/30'
          }`}>
            <Icon size={28} strokeWidth={2.5} />
          </div>
          <span className={`text-[10px] font-bold mt-1 ${isActive ? 'text-teal-600' : 'text-slate-400'}`}>{label}</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => setView(viewName)}
        className={`flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors ${
          isActive ? 'text-teal-500' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-teal-50' : ''}`}>
          <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#F0F4F8] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar - Enhanced Desktop */}
      <aside className="w-72 bg-white border-r border-slate-100 hidden md:flex flex-col p-6 z-20 relative shadow-[4px_0_24px_rgba(0,0,0,0.02)] rounded-r-[40px]">
        {/* Logo Section */}
        <div className="flex items-center gap-4 mb-10 px-2">
          <div className="relative">
            <div className="w-12 h-12 bg-teal-400 rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-teal-400/30">
               <PieChart size={24} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-none mb-1">
              CoInvest
            </h1>
            <p className="text-[10px] font-bold text-teal-500 uppercase tracking-[0.2em]">Finance Tracker</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-hide">
          <div className="space-y-1">
            <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 mt-2">Menu</p>
            <NavItem viewName="DASHBOARD" label="ภาพรวม" icon={LayoutDashboard} description="Dashboard Overview" />
            <NavItem viewName="PROJECTS" label="โครงการ & บัญชี" icon={FolderKanban} description="Manage Projects" />
            <NavItem viewName="ACCOUNTS" label="บัญชีรายรับ-จ่าย" icon={FileText} description="All Transactions" />
            <NavItem viewName="PROJECT_SUMMARY" label="สรุปภาพรวม" icon={BarChart3} description="Project Analytics" />
            <NavItem viewName="PARTNERS" label="สรุปยอดหุ้นส่วน" icon={Users} description="Partner Shares" />
          </div>
          
          <div className="my-8 border-t border-slate-100/80 mx-4"></div>
          
          <div className="space-y-1">
            <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">System</p>
            <NavItem viewName="SETTINGS" label="จัดการข้อมูล" icon={SettingsIcon} description="Settings & Backup" />
          </div>
        </nav>

        {/* Bottom Status Card */}
        <div className="mt-6 pt-4">
           <div className={`p-4 rounded-[24px] border transition-all duration-300 ${
             isConnected 
               ? 'bg-teal-50/50 border-teal-100/50 shadow-sm shadow-teal-100/20' 
               : 'bg-slate-50 border-slate-100'
           }`}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className={`text-xs font-bold ${isConnected ? 'text-teal-700' : 'text-slate-500'}`}>
                  {isConnected ? 'Cloud Sync Active' : 'Local Storage'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                {isConnected 
                  ? 'ข้อมูลซิงค์กับ Google Sheets อัตโนมัติ' 
                  : 'ข้อมูลบันทึกในเครื่องนี้เท่านั้น'}
              </p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F0F4F8] relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-[#F0F4F8] p-6 flex justify-between items-center sticky top-0 z-30">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-teal-400 rounded-[16px] flex items-center justify-center text-white shadow-md shadow-teal-400/20">
                <PieChart size={20} />
             </div>
             <div>
               <h1 className="text-xl font-extrabold text-slate-800 leading-none">CoInvest</h1>
               <p className="text-[10px] font-bold text-teal-500 uppercase tracking-wider mt-1">Finance Tracker</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             {isLoading && (
               <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-1 rounded-full animate-pulse border border-teal-100 font-medium flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div> Syncing
               </span>
             )}
             <button onClick={() => setView('SETTINGS')} className={`p-2.5 rounded-full bg-white shadow-sm border border-slate-100 transition-all ${view === 'SETTINGS' ? 'text-teal-500' : 'text-slate-400 hover:text-slate-600'}`}>
               <SettingsIcon size={20} />
             </button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar relative z-10 pb-32 md:pb-8">
          <div className="max-w-[1600px] mx-auto">
            {view === 'SETTINGS' ? (
              <Settings 
                data={data} 
                onImport={handleImportData} 
                onAddPartner={handleAddPartner}
                onDeletePartner={handleDeletePartner}
              />
            ) : view === 'ACCOUNTS' ? (
              <Accounts data={data} />
            ) : (
              <>
                <div className="mb-6 md:mb-8 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-[20px] shadow-sm border border-slate-100 hidden md:block">
                     {view === 'DASHBOARD' && <LayoutDashboard className="text-teal-500"/>}
                     {view === 'PROJECTS' && <FolderKanban className="text-teal-500"/>}
                     {view === 'PROJECT_SUMMARY' && <BarChart3 className="text-teal-500"/>}
                     {view === 'PARTNERS' && <Users className="text-teal-500"/>}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                      {view === 'DASHBOARD' ? 'ภาพรวมการลงทุน' : 
                      view === 'PROJECTS' ? 'จัดการโครงการ' : 
                      view === 'PROJECT_SUMMARY' ? 'สรุปภาพรวมโครงการ' :
                      'สรุปยอดหุ้นส่วน'}
                    </h2>
                    <p className="text-sm text-slate-500 hidden md:block mt-1 font-medium">
                      {view === 'DASHBOARD' ? 'Overview & Statistics' : 
                      view === 'PROJECTS' ? 'Manage Projects & Accounts' : 
                      view === 'PROJECT_SUMMARY' ? 'Project Analytics Report' :
                      'Partner Investment Summary'}
                    </p>
                  </div>
                  {isLoading && <span className="ml-auto text-xs bg-teal-50 text-teal-600 px-3 py-1.5 rounded-full animate-pulse border border-teal-100 font-medium hidden md:flex items-center gap-2"><div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div> Updating...</span>}
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

        {/* Mobile Bottom Navigation - Floating Pill */}
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-40">
          <nav className="bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100/50 backdrop-blur-xl bg-white/90">
            <div className="flex items-center justify-between h-16 px-4">
              <MobileNavItem viewName="DASHBOARD" label="Home" icon={LayoutDashboard} />
              <MobileNavItem viewName="PROJECTS" label="Projects" icon={FolderKanban} />
              <MobileNavItem viewName="ACCOUNTS" label="Add" icon={FileText} isCenter={true} />
              <MobileNavItem viewName="PROJECT_SUMMARY" label="Reports" icon={BarChart3} />
              <MobileNavItem viewName="PARTNERS" label="Partners" icon={Users} />
            </div>
          </nav>
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