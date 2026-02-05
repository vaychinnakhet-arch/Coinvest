import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Partner, Project, Transaction, TransactionType } from './types';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { PartnerSummary } from './components/PartnerSummary';
import { Settings } from './components/Settings';
import { LayoutDashboard, FolderKanban, Users, Settings as SettingsIcon, PieChart } from 'lucide-react';
import { supabaseService } from './services/supabaseService';

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
  const isSupabaseConnected = supabaseService.isConnected();

  // Load data & Setup Realtime
  useEffect(() => {
    const initData = async () => {
      if (isSupabaseConnected) {
        // 1. Initial Fetch
        const cloudData = await supabaseService.loadData();
        if (cloudData) setData(cloudData);

        // 2. Setup Realtime Subscription
        const channel = supabaseService.subscribeToChanges(
          (payload) => handleRealtimeUpdate('partners', payload),
          (payload) => handleRealtimeUpdate('projects', payload),
          (payload) => handleRealtimeUpdate('transactions', payload)
        );

        return () => {
          channel?.unsubscribe();
        };
      } else {
        // Fallback: LocalStorage
        const saved = localStorage.getItem('coInvestData');
        if (saved) setData(JSON.parse(saved));
      }
    };

    initData();
  }, [isSupabaseConnected]);

  // Sync to LocalStorage (Only if NOT using Supabase, or as backup)
  useEffect(() => {
    if (!isSupabaseConnected) {
      localStorage.setItem('coInvestData', JSON.stringify(data));
    }
  }, [data, isSupabaseConnected]);

  // --- Realtime Handler ---
  const handleRealtimeUpdate = (table: keyof AppState, payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setData(prev => {
      let updatedList = [...prev[table]] as any[];

      // Helper to map DB snake_case to CamelCase
      const mapRecord = (rec: any) => {
        if (!rec) return rec;
        if (table === 'projects') {
          return { ...rec, startDate: rec.start_date || rec.startDate };
        } else if (table === 'transactions') {
          return { ...rec, projectId: rec.project_id || rec.projectId, partnerId: rec.partner_id || rec.partnerId };
        }
        return rec;
      };

      if (eventType === 'INSERT') {
        const record = mapRecord(newRecord);
        // CRITICAL: Check for duplicates (Optimistic UI might have already added it)
        if (!updatedList.find(item => item.id === record.id)) {
           updatedList = [...updatedList, record];
        }
      } 
      else if (eventType === 'UPDATE') {
        const record = mapRecord(newRecord);
        updatedList = updatedList.map(item => item.id === record.id ? record : item);
      } 
      else if (eventType === 'DELETE') {
        updatedList = updatedList.filter(item => item.id !== oldRecord.id);
      }

      return { ...prev, [table]: updatedList };
    });
  };

  // --- Actions (Optimistic UI: Update Local -> Sync Remote) ---

  const handleAddProject = async (project: Omit<Project, 'id'>) => {
    const newProject: Project = { ...project, id: Math.random().toString(36).substr(2, 9) };
    
    // 1. Optimistic Update (Show immediately)
    setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));

    // 2. Sync to Supabase
    if (isSupabaseConnected) {
      const { error } = await supabaseService.addProject(newProject);
      if (error) {
        console.error("Add Project Failed:", error);
        // Revert on error
        setData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== newProject.id) }));
        alert("บันทึกข้อมูลไม่สำเร็จ: " + error.message);
      }
    }
  };

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...transaction, id: Math.random().toString(36).substr(2, 9) };
    
    // 1. Optimistic Update
    setData(prev => ({ ...prev, transactions: [...prev.transactions, newTransaction] }));

    // 2. Sync to Supabase
    if (isSupabaseConnected) {
      const { error } = await supabaseService.addTransaction(newTransaction);
      if (error) {
         console.error("Add Transaction Failed:", error);
         setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== newTransaction.id) }));
         alert("บันทึกข้อมูลไม่สำเร็จ: " + error.message);
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    // 1. Optimistic Update
    const previousTransactions = [...data.transactions];
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));

    // 2. Sync to Supabase
    if (isSupabaseConnected) {
      const { error } = await supabaseService.deleteTransaction(id);
      if (error) {
         console.error("Delete Transaction Failed:", error);
         setData(prev => ({ ...prev, transactions: previousTransactions }));
         alert("ลบข้อมูลไม่สำเร็จ: " + error.message);
      }
    }
  };

  const handleAddPartner = async (partner: Omit<Partner, 'id'>) => {
    const newPartner: Partner = { ...partner, id: Math.random().toString(36).substr(2, 9) };

    // 1. Optimistic Update
    setData(prev => ({ ...prev, partners: [...prev.partners, newPartner] }));

    // 2. Sync to Supabase
    if (isSupabaseConnected) {
      const { error } = await supabaseService.addPartner(newPartner);
      if (error) {
         console.error("Add Partner Failed:", error);
         setData(prev => ({ ...prev, partners: prev.partners.filter(p => p.id !== newPartner.id) }));
         alert("บันทึกข้อมูลไม่สำเร็จ: " + error.message);
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
    const previousPartners = [...data.partners];
    setData(prev => ({ ...prev, partners: prev.partners.filter(p => p.id !== id) }));

    // 2. Sync to Supabase
    if (isSupabaseConnected) {
      const { error } = await supabaseService.deletePartner(id);
      if (error) {
         console.error("Delete Partner Failed:", error);
         setData(prev => ({ ...prev, partners: previousPartners }));
         alert("ลบข้อมูลไม่สำเร็จ: " + error.message);
      }
    }
  };

  const handleImportData = (importedData: AppState) => {
    if (confirm("การนำเข้าข้อมูลจะเขียนทับข้อมูลปัจจุบัน (เฉพาะ Local Mode) คุณต้องการดำเนินการต่อหรือไม่?")) {
      setData(importedData);
      setView('DASHBOARD');
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
          <NavItem viewName="PARTNERS" label="สรุปยอดหุ้นส่วน" icon={Users} />
          
          <div className="pt-4 mt-4 border-t border-slate-100">
             <NavItem viewName="SETTINGS" label="จัดการข้อมูล" icon={SettingsIcon} />
          </div>
        </nav>

        <div className="mt-auto px-4 py-4 bg-indigo-50 rounded-2xl">
           {isSupabaseConnected ? (
             <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               Supabase Realtime On
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
             <button onClick={() => setView('PARTNERS')} className={`p-2 rounded-lg ${view === 'PARTNERS' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><Users/></button>
             <button onClick={() => setView('SETTINGS')} className={`p-2 rounded-lg ${view === 'SETTINGS' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'}`}><SettingsIcon/></button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {view === 'SETTINGS' ? (
              <Settings 
                data={data} 
                onImport={handleImportData} 
                onAddPartner={handleAddPartner}
                onDeletePartner={handleDeletePartner}
              />
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {view === 'DASHBOARD' ? 'ภาพรวมการลงทุน' : view === 'PROJECTS' ? 'จัดการโครงการ' : 'สรุปยอดหุ้นส่วน'}
                  </h2>
                </div>

                {view === 'DASHBOARD' && <Dashboard data={data} />}
                {view === 'PROJECTS' && (
                  <Projects 
                    data={data} 
                    onAddProject={handleAddProject} 
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                  />
                )}
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