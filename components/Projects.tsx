import React, { useState, useEffect } from 'react';
import { AppState, Project, Transaction, TransactionType, Partner } from '../types';
import { Card, Button, Input, Select, Badge } from './ui/Components';
import { Plus, FolderOpen, ArrowRight, Trash2, Calendar, FileText, DollarSign, Pencil, X, User, Wallet, Split, CheckCircle2, AlertCircle, Building2, FolderKanban, ChevronDown, ChevronUp, Image as ImageIcon, Receipt, Eye, Loader2 } from 'lucide-react';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Mobile toggle
  const [viewImage, setViewImage] = useState<string | null>(null); // For Image Modal
  
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
  const [transImage, setTransImage] = useState<string>(''); // Base64 string
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Split Payment State
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});

  const selectedProject = data.projects.find(p => p.id === selectedProjectId);
  
  // Filter other projects
  const otherProjects = data.projects.filter(p => p.id !== selectedProjectId);
  
  // Ensure strict date sorting (Newest -> Oldest)
  const projectTransactions = data.transactions
    .filter(t => t.projectId === selectedProjectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Reset split state when opening form
  useEffect(() => {
    if (!editingId) {
      setSplitAmounts({ 'POOL': '' });
    }
  }, [editingId]);

  // Auto-collapse sidebar on mobile selection
  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);

    // Google Sheets Cell Limit is 50,000 characters.
    // Base64 size is ~1.33x original file size.
    // 35KB file ~ 47KB Base64 string.
    
    // 1. If file is small (< 35KB), use original directly (Best Quality)
    if (file.size < 35 * 1024) {
       const reader = new FileReader();
       reader.onload = (ev) => {
          setTransImage(ev.target?.result as string);
          setIsProcessingImage(false);
       };
       reader.readAsDataURL(file);
       return;
    }

    // 2. Compress Image logic (Smart Fit)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Increase resolution from 400 to 800 to improve readability
        const MAX_WIDTH = 800; 
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Start with high quality (0.8)
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Downgrade quality step-by-step only if it exceeds Google Sheets limit (50k chars)
        while (dataUrl.length > 50000 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        setTransImage(dataUrl);
        setIsProcessingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const calculateSplitTotal = () => {
    return (Object.values(splitAmounts) as string[]).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const handleToggleSplitMode = () => {
    const nextState = !isSplitMode;
    setIsSplitMode(nextState);
    
    if (nextState && editingId) {
        const sourceKey = transPartner || 'POOL';
        setSplitAmounts({ [sourceKey]: transAmount });
    } else if (!nextState && !editingId) {
        setSplitAmounts({ 'POOL': '' });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !transAmount || isProcessingImage) return;

    const totalAmount = parseFloat(transAmount);

    if (editingId) {
      if (isSplitMode) {
           const currentSplitTotal = calculateSplitTotal();
           if (Math.abs(currentSplitTotal - totalAmount) > 1) {
             alert(`ยอดรวมที่กระจาย (${currentSplitTotal.toLocaleString()}) ไม่ตรงกับยอดรายการ (${totalAmount.toLocaleString()})`);
             return;
           }
           onDeleteTransaction(editingId);
      } else {
           const sourceProject = data.projects.find(p => p.id === transPartner);
            onUpdateTransaction({
               id: editingId,
               projectId: selectedProjectId,
               type: transType,
               amount: totalAmount,
               date: transDate,
               note: sourceProject ? `${transNote} (ปรับปรุง: รับเงินจาก ${sourceProject.name})` : transNote,
               partnerId: sourceProject ? undefined : (transPartner || undefined),
               receiptImage: transImage
            });

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
            return; 
      }
    }

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

    Object.entries(sourcesToProcess).forEach(([sourceKey, amount]) => {
       const isPartner = data.partners.some(p => p.id === sourceKey);
       const isProject = data.projects.some(p => p.id === sourceKey);
       
       if (isProject) {
          const sourceProj = data.projects.find(p => p.id === sourceKey);
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: `${transNote} (ดึงเงินจากโครงการ: ${sourceProj?.name})`,
             partnerId: undefined,
             receiptImage: transImage
          });
          onAddTransaction({
             projectId: sourceKey,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: `(นำเงินไปหมุนให้โครงการ: ${selectedProject?.name}) ${transNote}`,
             partnerId: undefined
          });

       } else if (isPartner) {
          const partnerName = data.partners.find(p => p.id === sourceKey)?.name;
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: isSplitMode ? `${transNote} (จ่ายโดย ${partnerName})` : transNote,
             partnerId: sourceKey,
             receiptImage: transImage
          });

       } else {
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: isSplitMode ? `${transNote} (กองกลาง)` : transNote,
             partnerId: undefined,
             receiptImage: transImage
          });
       }
    });

    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setTransAmount('');
    setTransNote('');
    setTransImage('');
    setIsProcessingImage(false);
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
    setTransImage(t.receiptImage || '');
    setIsSplitMode(false); 
    // Scroll to form on mobile
    if (window.innerWidth < 1024) {
      document.getElementById('transaction-form')?.scrollIntoView({ behavior: 'smooth' });
    }
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
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)] h-auto min-h-screen relative">
      {/* Image Modal */}
      {viewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setViewImage(null)}
        >
          <div className="relative max-w-2xl w-full max-h-[90vh]">
             <img src={viewImage} className="w-full h-auto rounded-lg shadow-2xl object-contain max-h-[85vh]" alt="Receipt" />
             <button 
               className="absolute -top-10 right-0 text-white hover:text-gray-300"
               onClick={() => setViewImage(null)}
             >
               <X size={32}/>
             </button>
          </div>
        </div>
      )}

      {/* Sidebar List of Projects */}
      <div className={`w-full lg:w-1/4 flex flex-col gap-4 transition-all duration-300 ${isSidebarOpen ? '' : 'lg:flex hidden'}`}>
        <div className="flex justify-between items-center px-1 cursor-pointer lg:cursor-default" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            โครงการทั้งหมด 
            <span className="lg:hidden text-slate-400 bg-slate-100 rounded-full p-1">
              {isSidebarOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </span>
          </h2>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowNewProjectForm(!showNewProjectForm); }}>
            <Plus size={16} className="mr-1" /> สร้าง
          </Button>
        </div>

        {/* Collapsible Area on Mobile */}
        <div className={`${isSidebarOpen ? 'block' : 'hidden lg:block'} space-y-4`}>
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

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[300px] lg:max-h-none">
            {data.projects.map(p => (
              <div 
                key={p.id}
                onClick={() => handleSelectProject(p.id)}
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
      </div>

      {/* Main Content Area */}
      <div className="w-full lg:w-3/4 flex flex-col h-full overflow-hidden">
        {selectedProject ? (
          <div className="flex flex-col h-full gap-6">
             {/* Mobile Header for Selected Project (When sidebar hidden) */}
             {!isSidebarOpen && (
               <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-2" onClick={() => setIsSidebarOpen(true)}>
                  <span className="font-bold text-slate-700 flex items-center gap-2">
                    <FolderKanban size={18} className="text-indigo-500"/>
                    {selectedProject.name}
                  </span>
                  <ChevronDown size={16} className="text-slate-400"/>
               </div>
             )}

             {/* Project Header */}
             <Card className="shrink-0 bg-white border-slate-200 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                    <FolderKanban size={150} className="text-indigo-500 transform translate-x-10 -translate-y-10"/>
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                         <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedProject.name}</h2>
                         <p className="text-slate-500 mb-4 max-w-2xl text-sm">{selectedProject.description}</p>
                         <div className="flex flex-wrap gap-4 text-sm text-slate-600 font-medium">
                           <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                             <Calendar size={14} className="text-slate-500"/> เริ่ม: {new Date(selectedProject.startDate).toLocaleDateString('th-TH')}
                           </div>
                         </div>
                    </div>
                </div>
             </Card>

             <div className="flex-1 flex flex-col-reverse xl:flex-row gap-6 min-h-0">
                {/* Transaction List */}
                <Card className="flex-1 flex flex-col min-h-[400px] xl:min-h-0 overflow-hidden" title="รายการเคลื่อนไหว">
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
                          <div key={t.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors group gap-3 sm:gap-0 ${editingId === t.id ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'}`}>
                             {/* Left: Icon & Info */}
                             <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${getTransactionColor(t.type)}`}>
                                   {t.type === TransactionType.INCOME ? <Plus size={20}/> : t.type === TransactionType.INVESTMENT ? <DollarSign size={20}/> : <ArrowRight size={20} className="-rotate-45"/>}
                                </div>
                                <div className="min-w-0">
                                   <div className="flex items-center gap-2 mb-1 flex-wrap">
                                     <p className="font-bold text-slate-700 text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs">{t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}</p>
                                     {isDirectPayment && (
                                       <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium whitespace-nowrap">จ่ายตรง</span>
                                     )}
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <p className="text-xs text-slate-400 flex items-center gap-2">
                                        <span className="whitespace-nowrap">{new Date(t.date).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}</span>
                                        <span>•</span>
                                        {partner ? (
                                           <span className="flex items-center gap-1 text-slate-500 truncate">
                                             <User size={12}/> {partner.name}
                                           </span>
                                        ) : (
                                           <span className="flex items-center gap-1 text-slate-500 truncate">
                                             <Wallet size={12}/> กองกลาง
                                           </span>
                                        )}
                                      </p>
                                      {t.receiptImage && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); setViewImage(t.receiptImage || null); }}
                                          className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full hover:bg-slate-200 transition-colors"
                                        >
                                           <ImageIcon size={10} /> สลิป
                                        </button>
                                      )}
                                   </div>
                                </div>
                             </div>
                             
                             {/* Right: Amount & Actions */}
                             <div className="flex items-center justify-between sm:justify-end gap-4 pl-14 sm:pl-0 w-full sm:w-auto">
                                <span className={`font-bold text-lg ${
                                  t.type === TransactionType.INCOME ? 'text-emerald-600' : 
                                  t.type === TransactionType.INVESTMENT ? 'text-indigo-600' : 'text-rose-600'
                                }`}>
                                  {t.type === TransactionType.EXPENSE ? '-' : '+'}{t.amount.toLocaleString()}
                                </span>
                                
                                <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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

                {/* Add/Edit Transaction Form */}
                <Card 
                  id="transaction-form"
                  className={`w-full xl:w-96 shrink-0 h-fit transition-colors duration-300 ${editingId ? 'ring-2 ring-amber-400 border-amber-200' : ''}`} 
                  title={editingId ? "แก้ไขรายการ" : "บันทึกรายการ"}
                  action={editingId && (
                    <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  )}
                >
                   <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                      {/* Transaction Type Tabs */}
                      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
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
                            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
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

                      {/* Image Upload */}
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">รูปสลิป/ใบเสร็จ</label>
                        <div className="flex items-center gap-3">
                           <div className="relative flex-1">
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageChange}
                                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                              />
                           </div>
                           {isProcessingImage && (
                             <div className="text-xs text-indigo-500 flex items-center gap-1 font-medium">
                               <Loader2 size={12} className="animate-spin"/> กำลังย่อรูป...
                             </div>
                           )}
                           {transImage && !isProcessingImage && (
                              <div className="w-10 h-10 shrink-0 relative group cursor-pointer" onClick={() => setViewImage(transImage)}>
                                 <img src={transImage} className="w-full h-full object-cover rounded-lg border border-slate-200" alt="Preview"/>
                                 <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 cursor-pointer shadow-sm border border-slate-200" onClick={(e) => {e.stopPropagation(); setTransImage('');}}>
                                    <X size={10} className="text-slate-500"/>
                                 </div>
                              </div>
                           )}
                        </div>
                      </div>

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

                            {/* Split Mode */}
                           {isSplitMode ? (
                               <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200 max-h-72 overflow-y-auto custom-scrollbar">
                                  <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                                    <span>กระจายยอดจ่าย</span>
                                    <span className={calculateSplitTotal() === parseFloat(transAmount || '0') ? 'text-emerald-600' : 'text-rose-500'}>
                                      รวม: {calculateSplitTotal().toLocaleString()} / {parseFloat(transAmount || '0').toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                     <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 shrink-0"><Wallet size={16}/></div>
                                     <span className="text-sm font-medium text-slate-600 flex-1">กองกลาง</span>
                                     <input 
                                       type="number" 
                                       placeholder="0"
                                       className="w-24 px-2 py-1.5 text-sm rounded border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                                       value={splitAmounts['POOL'] || ''}
                                       onChange={e => setSplitAmounts(prev => ({...prev, 'POOL': e.target.value}))}
                                     />
                                  </div>

                                  {data.partners.map(p => (
                                    <div key={p.id} className="flex items-center gap-2">
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs text-white shrink-0 shadow-sm" style={{background: p.color}}>
                                        {p.avatar}
                                      </div>
                                      <span className="text-sm font-medium text-slate-600 flex-1 truncate">{p.name}</span>
                                      <input 
                                        type="number" 
                                        placeholder="0"
                                        className="w-24 px-2 py-1.5 text-sm rounded border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                                        value={splitAmounts[p.id] || ''}
                                        onChange={e => setSplitAmounts(prev => ({...prev, [p.id]: e.target.value}))}
                                      />
                                    </div>
                                  ))}
                                  
                                  {otherProjects.length > 0 && (
                                     <>
                                      <div className="text-[11px] text-slate-400 font-bold mt-3 pt-2 border-t border-slate-200">โครงการอื่น</div>
                                      {otherProjects.map(p => (
                                        <div key={p.id} className="flex items-center gap-2">
                                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                            <Building2 size={16}/>
                                          </div>
                                          <span className="text-sm font-medium text-slate-600 flex-1 truncate">{p.name}</span>
                                          <input 
                                            type="number" 
                                            placeholder="0"
                                            className="w-24 px-2 py-1.5 text-sm rounded border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                                            value={splitAmounts[p.id] || ''}
                                            onChange={e => setSplitAmounts(prev => ({...prev, [p.id]: e.target.value}))}
                                          />
                                        </div>
                                      ))}
                                     </>
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
                         <Button type="submit" className="flex-1 py-3 text-base" disabled={!transAmount || isProcessingImage}>
                           {isProcessingImage ? 'กำลังเตรียมรูป...' : editingId ? 'บันทึกแก้ไข' : 'เพิ่มรายการ'}
                         </Button>
                      </div>
                   </form>
                </Card>
             </div>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[50vh]">
              <FolderOpen size={64} className="mb-4 opacity-20"/>
              <p className="text-lg">เลือกโครงการ</p>
              <p className="text-sm">เพื่อจัดการรายรับรายจ่าย</p>
           </div>
        )}
      </div>
    </div>
  );
};