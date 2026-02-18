import React, { useState, useEffect } from 'react';
import { AppState, Project, Transaction, TransactionType, Partner } from '../types';
import { Card, Button, Input, Select, Badge } from './ui/Components';
import { Plus, FolderOpen, ArrowRight, Trash2, Calendar, FileText, DollarSign, Pencil, X, User, Wallet, Split, CheckCircle2, AlertCircle, Building2, FolderKanban } from 'lucide-react';

interface ProjectsProps {
  data: AppState;
  onAddProject: (p: Omit<Project, 'id'>) => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Projects: React.FC<ProjectsProps> = ({ data, onAddProject, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(data.projects.length > 0 ? data.projects[0].id : null);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  
  // New Project State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Transaction Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transType, setTransType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [transAmount, setTransAmount] = useState('');
  const [transPartner, setTransPartner] = useState(''); // Empty = Central Pool, ID = Partner OR ProjectID (for cross-project)
  const [transNote, setTransNote] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);

  // Split Payment State
  const [isSplitMode, setIsSplitMode] = useState(false);
  // Dictionary to hold amount per source: key = 'POOL' | partnerId | projectId, value = amount string
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});

  const selectedProject = data.projects.find(p => p.id === selectedProjectId);
  
  // Filter other projects (to use as funding source)
  const otherProjects = data.projects.filter(p => p.id !== selectedProjectId);
  
  // Ensure strict date sorting (Newest -> Oldest)
  const projectTransactions = data.transactions
    .filter(t => t.projectId === selectedProjectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Reset split state when opening form (only for fresh add)
  useEffect(() => {
    if (!editingId) {
      setSplitAmounts({ 'POOL': '' });
    }
  }, [editingId]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;
    onAddProject({
      name: newProjectName,
      description: newProjectDesc,
      status: 'planning',
      startDate: new Date().toISOString(),
    });
    setNewProjectName('');
    setNewProjectDesc('');
    setShowNewProjectForm(false);
  };

  const calculateSplitTotal = () => {
    return (Object.values(splitAmounts) as string[]).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const handleToggleSplitMode = () => {
    const nextState = !isSplitMode;
    setIsSplitMode(nextState);
    
    // If turning ON split mode while editing, pre-fill with current values
    if (nextState && editingId) {
        const sourceKey = transPartner || 'POOL';
        setSplitAmounts({ [sourceKey]: transAmount });
    } else if (!nextState && !editingId) {
        // Reset if turning off (and not editing)
        setSplitAmounts({ 'POOL': '' });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !transAmount) return;

    const totalAmount = parseFloat(transAmount);

    // --- EDIT MODE HANDLER ---
    if (editingId) {
      // Sub-case: Edit Mode with Split Mode Active -> Convert Single to Multiple Transactions
      if (isSplitMode) {
           const currentSplitTotal = calculateSplitTotal();
           if (Math.abs(currentSplitTotal - totalAmount) > 1) {
             alert(`ยอดรวมที่กระจาย (${currentSplitTotal.toLocaleString()}) ไม่ตรงกับยอดรายการ (${totalAmount.toLocaleString()})`);
             return;
           }
           
           // Implicitly confirm splitting: Delete original, create new ones.
           onDeleteTransaction(editingId);
           
           // Proceed to execute the Creation Logic below (FALL THROUGH)
      } else {
           // Sub-case: Standard Single Edit
           const sourceProject = data.projects.find(p => p.id === transPartner);
    
            // 1. Update the Main Transaction
            onUpdateTransaction({
               id: editingId,
               projectId: selectedProjectId,
               type: transType,
               amount: totalAmount,
               date: transDate,
               note: sourceProject ? `${transNote} (ปรับปรุง: รับเงินจาก ${sourceProject.name})` : transNote,
               partnerId: sourceProject ? undefined : (transPartner || undefined)
            });

            // 2. Automatic Deduction in Source Project
            if (sourceProject) {
               onAddTransaction({
                   projectId: sourceProject.id,
                   type: TransactionType.EXPENSE,
                   amount: totalAmount,
                   date: transDate,
                   note: `(ปรับปรุงรายการ) โอนไปโครงการ: ${selectedProject?.name} - ${transNote}`,
                   partnerId: undefined
                });
            }
            
            setEditingId(null);
            resetForm();
            return; // Stop here for single edit
      }
    }

    // --- CREATION LOGIC (Used for New OR Edit-Split-Conversion) ---
    let sourcesToProcess: Record<string, number> = {};

    if (isSplitMode) {
       const currentSplitTotal = calculateSplitTotal();
       if (Math.abs(currentSplitTotal - totalAmount) > 1) {
         alert(`ยอดรวมที่กระจาย (${currentSplitTotal.toLocaleString()}) ไม่ตรงกับยอดรายการ (${totalAmount.toLocaleString()})`);
         return;
       }
       (Object.entries(splitAmounts) as [string, string][]).forEach(([key, val]) => {
          const amt = parseFloat(val);
          if (amt > 0) sourcesToProcess[key] = amt;
       });
    } else {
       const sourceKey = transPartner || 'POOL';
       sourcesToProcess[sourceKey] = totalAmount;
    }

    // Process all sources
    Object.entries(sourcesToProcess).forEach(([sourceKey, amount]) => {
       const isPartner = data.partners.some(p => p.id === sourceKey);
       const isProject = data.projects.some(p => p.id === sourceKey);
       
       if (isProject) {
          // CASE 1: Cross-Project Funding
          const sourceProj = data.projects.find(p => p.id === sourceKey);
          
          // 1.1 Record Expense in Current Project
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: `${transNote} (ดึงเงินจากโครงการ: ${sourceProj?.name})`,
             partnerId: undefined
          });

          // 1.2 Automatically Record Deduction in Source Project
          onAddTransaction({
             projectId: sourceKey,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: `(นำเงินไปหมุนให้โครงการ: ${selectedProject?.name}) ${transNote}`,
             partnerId: undefined
          });

       } else if (isPartner) {
          // CASE 2: Partner Paid (Investment)
          const partnerName = data.partners.find(p => p.id === sourceKey)?.name;
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: isSplitMode ? `${transNote} (จ่ายโดย ${partnerName})` : transNote,
             partnerId: sourceKey
          });

       } else {
          // CASE 3: Central Pool
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: isSplitMode ? `${transNote} (กองกลาง)` : transNote,
             partnerId: undefined
          });
       }
    });

    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setTransAmount('');
    setTransNote('');
    setSplitAmounts({});
    if (editingId) {
      setTransType(TransactionType.EXPENSE);
      setTransPartner('');
      setTransDate(new Date().toISOString().split('T')[0]);
      setIsSplitMode(false);
    }
  };

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setTransType(t.type);
    setTransAmount(t.amount.toString());
    setTransDate(t.date);
    setTransNote(t.note);
    setTransPartner(t.partnerId || '');
    setIsSplitMode(false); 
  };

  const cancelEditing = () => {
    setEditingId(null);
    resetForm();
    setIsSplitMode(false);
  };

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME: return 'text-emerald-600 bg-emerald-50';
      case TransactionType.EXPENSE: return 'text-rose-600 bg-rose-50';
      case TransactionType.INVESTMENT: return 'text-indigo-600 bg-indigo-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  // Build Options for Single Select
  const sourceOptions = [
    { value: '', label: 'กองกลาง (Central Pool)' },
    { label: '--- หุ้นส่วน (Partners) ---', value: 'disabled_1', disabled: true },
    ...data.partners.map(p => ({ value: p.id, label: `👤 ${p.name}` })),
  ];
  
  if (otherProjects.length > 0) {
    sourceOptions.push({ label: '--- โครงการอื่น (Cross-Project) ---', value: 'disabled_2', disabled: true });
    otherProjects.forEach(p => {
      sourceOptions.push({ value: p.id, label: `🏢 ${p.name}` });
    });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar List of Projects (Reduced Width) */}
      <div className="w-full lg:w-1/4 flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-bold text-slate-700">โครงการทั้งหมด</h2>
          <Button size="sm" onClick={() => setShowNewProjectForm(!showNewProjectForm)}>
            <Plus size={16} className="mr-1" /> สร้าง
          </Button>
        </div>

        {showNewProjectForm && (
          <Card className="animate-in slide-in-from-top-4 fade-in duration-300">
            <form onSubmit={handleCreateProject} className="flex flex-col gap-3">
              <Input 
                placeholder="ชื่อโครงการ" 
                value={newProjectName} 
                onChange={e => setNewProjectName(e.target.value)} 
                autoFocus
              />
              <Input 
                placeholder="รายละเอียดสั้นๆ" 
                value={newProjectDesc} 
                onChange={e => setNewProjectDesc(e.target.value)} 
              />
              <div className="flex gap-2 justify-end mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewProjectForm(false)}>ยกเลิก</Button>
                <Button type="submit" size="sm">บันทึก</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {data.projects.map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                selectedProjectId === p.id 
                  ? 'bg-white border-indigo-400 shadow-md ring-1 ring-indigo-100 relative overflow-hidden' 
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              {selectedProjectId === p.id && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              )}
              <div className="flex justify-between items-start mb-2 pl-2">
                <h3 className={`font-bold ${selectedProjectId === p.id ? 'text-indigo-700' : 'text-slate-700'}`}>{p.name}</h3>
              </div>
              <div className="flex justify-between items-center pl-2">
                 <p className="text-xs text-slate-500 line-clamp-1">{p.description || "ไม่มีรายละเอียด"}</p>
                 <Badge color={p.status === 'active' ? 'green' : 'yellow'}>
                    {p.status === 'active' ? 'Active' : 'Plan'}
                 </Badge>
              </div>
            </div>
          ))}
          
          {data.projects.length === 0 && (
            <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-50"/>
              <p>ยังไม่มีโครงการ</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area (Selected Project Details) - Increased Width */}
      <div className="w-full lg:w-3/4 flex flex-col h-full overflow-hidden">
        {selectedProject ? (
          <div className="flex flex-col h-full gap-6">
             {/* Enhanced Project Header */}
             <Card className="shrink-0 bg-white border-slate-200 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                    <FolderKanban size={150} className="text-indigo-500 transform translate-x-10 -translate-y-10"/>
                </div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                         <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedProject.name}</h2>
                         <p className="text-slate-500 mb-4 max-w-2xl">{selectedProject.description}</p>
                         <div className="flex gap-4 text-sm text-slate-600 font-medium">
                           <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                             <Calendar size={14} className="text-slate-500"/> เริ่ม: {new Date(selectedProject.startDate).toLocaleDateString('th-TH')}
                           </div>
                         </div>
                    </div>
                </div>
             </Card>

             <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
                {/* Transaction List */}
                <Card className="flex-1 flex flex-col min-h-0 overflow-hidden" title="รายการเคลื่อนไหว">
                   <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                      {projectTransactions.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                          <FileText size={32} className="mx-auto mb-2 opacity-50"/>
                          <p>ยังไม่มีรายการบันทึก</p>
                        </div>
                      ) : (
                        projectTransactions.map(t => {
                          const partner = data.partners.find(p => p.id === t.partnerId);
                          const isDirectPayment = t.type === TransactionType.EXPENSE && t.partnerId;
                          
                          return (
                          <div key={t.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors group ${editingId === t.id ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'}`}>
                             <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getTransactionColor(t.type)}`}>
                                   {t.type === TransactionType.INCOME ? <Plus size={20}/> : t.type === TransactionType.INVESTMENT ? <DollarSign size={20}/> : <ArrowRight size={20} className="-rotate-45"/>}
                                </div>
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                     <p className="font-bold text-slate-700 text-base">{t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}</p>
                                     {isDirectPayment && (
                                       <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium">จ่ายตรง</span>
                                     )}
                                   </div>
                                   <p className="text-xs text-slate-400 flex items-center gap-2">
                                     <span>{new Date(t.date).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}</span>
                                     <span>•</span>
                                     {partner ? (
                                        <span className="flex items-center gap-1 text-slate-500">
                                          <User size={12}/> {partner.name}
                                        </span>
                                     ) : (
                                        <span className="flex items-center gap-1 text-slate-500">
                                          <Wallet size={12}/> กองกลาง
                                        </span>
                                     )}
                                   </p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                <span className={`font-bold text-lg ${
                                  t.type === TransactionType.INCOME ? 'text-emerald-600' : 
                                  t.type === TransactionType.INVESTMENT ? 'text-indigo-600' : 'text-rose-600'
                                }`}>
                                  {t.type === TransactionType.EXPENSE ? '-' : '+'}{t.amount.toLocaleString()}
                                </span>
                                
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startEditing(t); }}
                                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="แก้ไข"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="ลบ"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                             </div>
                          </div>
                        )})
                      )}
                   </div>
                </Card>

                {/* Add/Edit Transaction Form - Increased Width */}
                <Card 
                  className={`w-full xl:w-96 shrink-0 h-fit transition-colors duration-300 ${editingId ? 'ring-2 ring-amber-400 border-amber-200' : ''}`} 
                  title={editingId ? "แก้ไขรายการ" : "บันทึกรายการ"}
                  action={editingId && (
                    <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  )}
                >
                   <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                      {/* Transaction Type Tabs */}
                      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl">
                        {[
                          { val: TransactionType.EXPENSE, label: 'รายจ่าย' },
                          { val: TransactionType.INCOME, label: 'รายรับ' },
                          { val: TransactionType.INVESTMENT, label: 'ลงทุน' },
                        ].map(type => (
                          <button
                            key={type.val}
                            type="button"
                            onClick={() => {
                               setTransType(type.val as TransactionType);
                               if (type.val !== TransactionType.EXPENSE) setIsSplitMode(false);
                            }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                              transType === type.val ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>

                      {/* Amount and Date */}
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        label="จำนวนเงินรวม (THB)"
                        value={transAmount}
                        onChange={e => setTransAmount(e.target.value)}
                        required
                        className="font-mono text-xl font-bold text-slate-700"
                      />

                      <Input 
                        type="date" 
                        label="วันที่"
                        value={transDate}
                        onChange={e => setTransDate(e.target.value)}
                        required
                      />

                      <Input 
                        placeholder="เช่น ค่าวัสดุ, ค่าเช่า..." 
                        label="บันทึกช่วยจำ"
                        value={transNote}
                        onChange={e => setTransNote(e.target.value)}
                      />

                      {/* Payment Source Logic */}
                      {transType === TransactionType.EXPENSE ? (
                         <div className="flex flex-col gap-2 w-full pt-2 border-t border-slate-100 mt-2">
                           {/* Label & Toggle */}
                           <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-slate-600">
                                {editingId ? "แหล่งเงินที่จ่าย (แก้ไข)" : "แหล่งเงินที่จ่าย"}
                              </label>
                              <button 
                                type="button"
                                onClick={handleToggleSplitMode}
                                className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors border ${isSplitMode ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              >
                                 <Split size={14}/> {isSplitMode ? 'จ่ายหลายทาง' : 'จ่ายทางเดียว'}
                              </button>
                           </div>

                            {/* Split Mode (Creation or Edit-Split) */}
                           {isSplitMode ? (
                               <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200 max-h-72 overflow-y-auto custom-scrollbar">
                                  <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                                    <span>กระจายยอดจ่าย</span>
                                    <span className={calculateSplitTotal() === parseFloat(transAmount || '0') ? 'text-emerald-600' : 'text-rose-500'}>
                                      รวม: {calculateSplitTotal().toLocaleString()} / {parseFloat(transAmount || '0').toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  {/* Central Pool Input */}
                                  <div className="flex items-center gap-2">
                                     <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 shrink-0"><Wallet size={16}/></div>
                                     <span className="text-sm font-medium text-slate-600 flex-1">กองกลาง</span>
                                     <input 
                                       type="number" 
                                       placeholder="0"
                                       className="w-28 px-2 py-1.5 text-sm rounded border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                                       value={splitAmounts['POOL'] || ''}
                                       onChange={e => setSplitAmounts(prev => ({...prev, 'POOL': e.target.value}))}
                                     />
                                  </div>

                                  {/* Partners Input */}
                                  {data.partners.map(p => (
                                    <div key={p.id} className="flex items-center gap-2">
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs text-white shrink-0 shadow-sm" style={{background: p.color}}>
                                        {p.avatar}
                                      </div>
                                      <span className="text-sm font-medium text-slate-600 flex-1">{p.name}</span>
                                      <input 
                                        type="number" 
                                        placeholder="0"
                                        className="w-28 px-2 py-1.5 text-sm rounded border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                                        value={splitAmounts[p.id] || ''}
                                        onChange={e => setSplitAmounts(prev => ({...prev, [p.id]: e.target.value}))}
                                      />
                                    </div>
                                  ))}
                                  
                                  {/* Other Projects Input */}
                                  {otherProjects.length > 0 && (
                                     <>
                                      <div className="text-[11px] text-slate-400 font-bold mt-3 pt-2 border-t border-slate-200">โครงการอื่น (Cross-Project)</div>
                                      {otherProjects.map(p => (
                                        <div key={p.id} className="flex items-center gap-2">
                                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                            <Building2 size={16}/>
                                          </div>
                                          <span className="text-sm font-medium text-slate-600 flex-1 truncate">{p.name}</span>
                                          <input 
                                            type="number" 
                                            placeholder="0"
                                            className="w-28 px-2 py-1.5 text-sm rounded border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                                            value={splitAmounts[p.id] || ''}
                                            onChange={e => setSplitAmounts(prev => ({...prev, [p.id]: e.target.value}))}
                                          />
                                        </div>
                                      ))}
                                     </>
                                  )}

                                  {Math.abs(calculateSplitTotal() - parseFloat(transAmount || '0')) > 1 && (
                                     <div className="text-xs text-rose-500 flex items-center gap-1 mt-2 bg-rose-50 p-2 rounded border border-rose-100">
                                        <AlertCircle size={14}/> ยอดรวมยังไม่ตรงกับจำนวนเงิน
                                     </div>
                                  )}
                               </div>
                           ) : (
                               // ... Single Select UI ...
                               <div className="space-y-2">
                                 <select
                                     className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-slate-800 ${transPartner === '' ? 'text-indigo-600 font-medium' : ''}`}
                                     value={transPartner}
                                     onChange={e => setTransPartner(e.target.value)}
                                   >
                                     {sourceOptions.map((opt, idx) => (
                                       <option key={idx} value={opt.value} disabled={opt.disabled}>
                                         {opt.label}
                                       </option>
                                     ))}
                                 </select>
                                 {/* Helper Texts */}
                                 {transPartner === '' && (
                                   <p className="text-[11px] text-slate-400 pl-1">
                                     *ใช้เงินจากกองกลาง
                                   </p>
                                 )}
                                 {data.projects.find(p => p.id === transPartner) && (
                                   <div className="pl-1">
                                      <p className="text-[11px] text-indigo-500">
                                        *ดึงเงินจากโครงการ {data.projects.find(p => p.id === transPartner)?.name}
                                      </p>
                                      {editingId && (
                                          <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                                            <CheckCircle2 size={12}/> ระบบจะสร้างรายการตัดยอดในโครงการต้นทางให้อัตโนมัติเมื่อบันทึก
                                          </p>
                                      )}
                                   </div>
                                 )}
                                 {!isSplitMode && !editingId && data.partners.find(p => p.id === transPartner) && (
                                    <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-100 flex items-center gap-1">
                                      <DollarSign size={14}/> ระบบจะนับเป็นเงินลงทุนเพิ่มของหุ้นส่วนโดยอัตโนมัติ
                                    </div>
                                 )}
                               </div>
                           )}
                         </div>
                      ) : (
                         /* Select for other types */
                         <Select 
                           label={transType === TransactionType.INVESTMENT ? "หุ้นส่วนที่ลงทุน" : transType === TransactionType.INCOME ? "เก็บเงินไว้ที่" : "หุ้นส่วน"}
                           options={[
                             { value: '', label: transType === TransactionType.INVESTMENT ? '-- เลือกหุ้นส่วน --' : 'กองกลาง (Central Pool)' },
                             ...data.partners.map(p => ({ value: p.id, label: p.name }))
                           ]}
                           value={transPartner}
                           onChange={e => setTransPartner(e.target.value)}
                           required={transType === TransactionType.INVESTMENT} 
                           className={transPartner === '' ? 'text-slate-500 italic' : ''}
                         />
                      )}
                      
                      <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                         {editingId && (
                            <Button type="button" variant="secondary" className="flex-1" onClick={cancelEditing}>
                               ยกเลิก
                            </Button>
                         )}
                         <Button type="submit" className="flex-1 py-3 text-base" disabled={!transAmount}>
                           {editingId ? 'บันทึกแก้ไข' : 'เพิ่มรายการ'}
                         </Button>
                      </div>
                   </form>
                </Card>
             </div>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <FolderOpen size={64} className="mb-4 opacity-20"/>
              <p className="text-lg">เลือกโครงการทางซ้ายมือ</p>
              <p className="text-sm">เพื่อดูรายละเอียดและจัดการรายรับรายจ่าย</p>
           </div>
        )}
      </div>
    </div>
  );
};