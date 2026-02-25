import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Project, Transaction, TransactionType, Partner } from '../types';
import { Card, Button, Input, Select, Badge } from './ui/Components';
import { Plus, FolderOpen, ArrowRight, Trash2, Calendar, FileText, DollarSign, Pencil, X, User, Wallet, Split, CheckCircle2, AlertCircle, Building2, FolderKanban, ChevronDown, ChevronUp, Image as ImageIcon, Receipt, Eye, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

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
  const [isFormOpen, setIsFormOpen] = useState(false); // For Transaction Form Modal
  
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
  const [transImage2, setTransImage2] = useState<string>(''); // Base64 string
  const [transImage3, setTransImage3] = useState<string>(''); // Base64 string
  const [transImage4, setTransImage4] = useState<string>(''); // Base64 string
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isProcessingImage2, setIsProcessingImage2] = useState(false);
  const [isProcessingImage3, setIsProcessingImage3] = useState(false);
  const [isProcessingImage4, setIsProcessingImage4] = useState(false);

  // Split Payment State
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});

  const selectedProject = data.projects.find(p => p.id === selectedProjectId);
  
  // Filter other projects
  const otherProjects = data.projects.filter(p => p.id !== selectedProjectId);
  
  // Ensure strict date sorting (Newest -> Oldest)
  const projectTransactions = useMemo(() => data.transactions
    .filter(t => t.projectId === selectedProjectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [data.transactions, selectedProjectId]);

  // Calculate Stats
  const projectStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let investment = 0;

    projectTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME) income += t.amount;
      else if (t.type === TransactionType.EXPENSE) expense += t.amount;
      else if (t.type === TransactionType.INVESTMENT) investment += t.amount;
    });

    return {
      income,
      expense,
      investment,
      balance: income + investment - expense
    };
  }, [projectTransactions]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    projectTransactions.forEach(t => {
      const dateKey = t.date; // YYYY-MM-DD
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [projectTransactions]);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, imageIndex: number = 1) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
    let setImage: React.Dispatch<React.SetStateAction<string>>;

    if (imageIndex === 1) {
      setProcessing = setIsProcessingImage;
      setImage = setTransImage;
    } else if (imageIndex === 2) {
      setProcessing = setIsProcessingImage2;
      setImage = setTransImage2;
    } else if (imageIndex === 3) {
      setProcessing = setIsProcessingImage3;
      setImage = setTransImage3;
    } else {
      setProcessing = setIsProcessingImage4;
      setImage = setTransImage4;
    }

    setProcessing(true);

    // Google Sheets Cell Limit is 50,000 characters.
    // 1. If file is small (< 35KB), use original directly (Best Quality)
    if (file.size < 35 * 1024) {
       const reader = new FileReader();
       reader.onload = (ev) => {
          setImage(ev.target?.result as string);
          setProcessing(false);
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

        setImage(dataUrl);
        setProcessing(false);
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
    if (!selectedProjectId || !transAmount || isProcessingImage || isProcessingImage2 || isProcessingImage3 || isProcessingImage4) return;

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
               receiptImage: transImage,
               receiptImage2: transImage2,
               receiptImage3: transImage3,
               receiptImage4: transImage4
            });

            if (sourceProject) {
               // 1. Expense in Source Project (Money leaving)
               onAddTransaction({
                   projectId: sourceProject.id,
                   type: TransactionType.EXPENSE,
                   amount: totalAmount,
                   date: transDate,
                   note: `(ปรับปรุงรายการ) โอนไปโครงการ: ${selectedProject?.name} - ${transNote}`,
                   partnerId: undefined
                });

               // 2. Income in Current Project (Money entering) - FIX for Double Counting
               onAddTransaction({
                   projectId: selectedProjectId,
                   type: TransactionType.INCOME,
                   amount: totalAmount,
                   date: transDate,
                   note: `(ปรับปรุงรายการ) รับเงินโอนจากโครงการ: ${sourceProject.name} - ${transNote}`,
                   partnerId: undefined
                });
            }
            
            setEditingId(null);
            resetForm();
            setIsFormOpen(false);
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
          
          // 1. The Expense in the Current Project (The one spending the money)
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: `${transNote} (จ่ายโดยโครงการ: ${sourceProj?.name})`,
             partnerId: undefined,
             receiptImage: transImage,
             receiptImage2: transImage2,
             receiptImage3: transImage3,
             receiptImage4: transImage4
          });

          // 2. The Expense in the Source Project (Money leaving as a loan/transfer)
          onAddTransaction({
             projectId: sourceKey,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: `(ให้ยืม/โอนไปโครงการ: ${selectedProject?.name}) ${transNote}`,
             partnerId: undefined
          });

          // 3. The Income in the Current Project (Money entering as a loan/transfer) - FIX for Double Counting
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.INCOME,
             amount: amount,
             date: transDate,
             note: `(รับเงินยืม/โอนจากโครงการ: ${sourceProj?.name}) สำหรับ: ${transNote}`,
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
             receiptImage: transImage,
             receiptImage2: transImage2,
             receiptImage3: transImage3,
             receiptImage4: transImage4
          });

       } else {
          onAddTransaction({
             projectId: selectedProjectId,
             type: TransactionType.EXPENSE,
             amount: amount,
             date: transDate,
             note: isSplitMode ? `${transNote} (กองกลาง)` : transNote,
             partnerId: undefined,
             receiptImage: transImage,
             receiptImage2: transImage2,
             receiptImage3: transImage3,
             receiptImage4: transImage4
          });
       }
    });

    setEditingId(null);
    resetForm();
    setIsFormOpen(false);
  };

  const resetForm = () => {
    setTransAmount('');
    setTransNote('');
    setTransImage('');
    setTransImage2('');
    setTransImage3('');
    setTransImage4('');
    setIsProcessingImage(false);
    setIsProcessingImage2(false);
    setIsProcessingImage3(false);
    setIsProcessingImage4(false);
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
    setTransImage2(t.receiptImage2 || '');
    setTransImage3(t.receiptImage3 || '');
    setTransImage4(t.receiptImage4 || '');
    setIsSplitMode(false); 
    setIsFormOpen(true);
    // Scroll to form on mobile
    if (window.innerWidth < 1024) {
      document.getElementById('transaction-form')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    resetForm();
    setIsSplitMode(false);
    setIsFormOpen(false);
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
    <>
    <div className="flex flex-col gap-6 h-auto min-h-screen relative pb-10">
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

      {/* Top Bar List of Projects */}
      <div className="w-full flex flex-col gap-4 transition-all duration-300">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <FolderKanban className="text-indigo-600" size={24}/> โครงการทั้งหมด
          </h2>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowNewProjectForm(!showNewProjectForm); }} className="rounded-xl px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200 shadow-sm">
            <Plus size={18} className="mr-1" /> สร้างโครงการใหม่
          </Button>
        </div>

        {/* Collapsible Area on Mobile */}
        <div className="space-y-4">
          {showNewProjectForm && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-300 bg-white p-5 rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <FolderOpen size={100}/>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 relative z-10">สร้างโครงการใหม่</h3>
              <form onSubmit={handleCreateProject} className="flex flex-col sm:flex-row gap-4 relative z-10">
                <div className="flex-1 space-y-1">
                   <label className="text-xs font-semibold text-slate-500 uppercase ml-1">ชื่อโครงการ</label>
                   <Input 
                     placeholder="เช่น สร้างบ้านลูกค้า A..." 
                     value={newProjectName} 
                     onChange={e => setNewProjectName(e.target.value)} 
                     autoFocus
                     className="w-full bg-slate-50 border-slate-200 focus:bg-white transition-all"
                   />
                </div>
                <div className="flex-1 space-y-1">
                   <label className="text-xs font-semibold text-slate-500 uppercase ml-1">รายละเอียด</label>
                   <Input 
                     placeholder="รายละเอียดสั้นๆ (ถ้ามี)" 
                     value={newProjectDesc} 
                     onChange={e => setNewProjectDesc(e.target.value)} 
                     className="w-full bg-slate-50 border-slate-200 focus:bg-white transition-all"
                   />
                </div>
                <div className="flex gap-2 justify-end mt-2 sm:mt-0 items-end">
                  <Button type="button" variant="ghost" onClick={() => setShowNewProjectForm(false)} className="h-10 px-4 rounded-xl hover:bg-slate-100 text-slate-500">ยกเลิก</Button>
                  <Button type="submit" className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 font-medium">บันทึก</Button>
                </div>
              </form>
            </div>
          )}

          <div className="flex overflow-x-auto space-x-4 pb-4 px-1 custom-scrollbar snap-x">
            {data.projects.map(p => (
              <div 
                key={p.id}
                onClick={() => handleSelectProject(p.id)}
                className={`snap-start p-5 rounded-2xl cursor-pointer transition-all duration-200 border group relative min-w-[280px] shrink-0 flex flex-col justify-between h-[140px] ${
                  selectedProjectId === p.id 
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-600 shadow-lg shadow-indigo-200 text-white transform scale-[1.02]' 
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl ${selectedProjectId === p.id ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                     <Building2 size={20}/>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    selectedProjectId === p.id 
                      ? (p.status === 'active' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100')
                      : (p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
                  }`}>
                    {p.status === 'active' ? 'Active' : 'Planning'}
                  </div>
                </div>
                
                <div>
                  <h3 className={`font-bold text-lg tracking-tight line-clamp-1 mb-1 ${selectedProjectId === p.id ? 'text-white' : 'text-slate-800'}`}>{p.name}</h3>
                  <p className={`text-xs line-clamp-1 ${selectedProjectId === p.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {p.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                  </p>
                </div>
              </div>
            ))}
            
            {data.projects.length === 0 && (
              <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 w-full flex flex-col items-center justify-center min-h-[140px]">
                <FolderOpen size={32} className="mb-2 opacity-50"/>
                <p className="font-medium text-sm">ยังไม่มีโครงการ</p>
                <p className="text-xs opacity-70">สร้างโครงการแรกของคุณเลย</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {selectedProject ? (
          <div className="flex flex-col h-full gap-6">
             {/* Project Header & Stats */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
                {/* Main Info Card */}
                <Card className="lg:col-span-3 bg-white border-slate-200 relative overflow-hidden p-6 shadow-sm">
                   <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                       <FolderKanban size={150} className="text-indigo-500 transform translate-x-10 -translate-y-10"/>
                   </div>
                   <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{selectedProject.name}</h2>
                           <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${selectedProject.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                             {selectedProject.status === 'active' ? 'Active' : 'Planning'}
                           </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
                           <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                             <Calendar size={14} className="text-slate-400"/> 
                             {new Date(selectedProject.startDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                           </span>
                           {selectedProject.description && (
                             <span className="flex items-center gap-1.5 px-2">
                               {selectedProject.description}
                             </span>
                           )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <div className="text-right hidden md:block mr-2">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">คงเหลือสุทธิ</p>
                            <p className={`text-2xl font-bold ${projectStats.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                              {projectStats.balance.toLocaleString()}
                            </p>
                         </div>
                         <Button onClick={() => { resetForm(); setIsFormOpen(true); }} className="shrink-0 shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl">
                           <Plus size={20} className="mr-2" /> บันทึกรายการ
                         </Button>
                      </div>
                   </div>
                </Card>

                {/* Stat Cards */}
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between">
                   <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">รายรับรวม</p>
                      <p className="text-2xl font-bold text-emerald-700">+{projectStats.income.toLocaleString()}</p>
                   </div>
                   <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                      <TrendingUp size={20}/>
                   </div>
                </div>

                <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 flex items-center justify-between">
                   <div>
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">รายจ่ายรวม</p>
                      <p className="text-2xl font-bold text-rose-700">-{projectStats.expense.toLocaleString()}</p>
                   </div>
                   <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                      <TrendingDown size={20}/>
                   </div>
                </div>

                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between">
                   <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">เงินลงทุน</p>
                      <p className="text-2xl font-bold text-indigo-700">+{projectStats.investment.toLocaleString()}</p>
                   </div>
                   <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <DollarSign size={20}/>
                   </div>
                </div>
             </div>

             {/* Content: List & Form */}
             <div className="flex-1 flex flex-col gap-6 min-h-0">
                
                {/* Transaction List */}
                <Card className="flex-1 flex flex-col min-h-[500px] overflow-hidden shadow-sm border-slate-200" title="รายการเคลื่อนไหว (Timeline)">
                   <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-1">
                      {Object.keys(groupedTransactions).length === 0 ? (
                        <div className="text-center py-20 text-slate-300 flex flex-col items-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                             <FileText size={40} className="opacity-20 text-slate-500"/>
                          </div>
                          <p className="text-lg font-medium text-slate-500">ยังไม่มีรายการบันทึก</p>
                          <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">เริ่มบันทึกรายรับหรือรายจ่ายแรกของคุณได้ที่ปุ่ม "บันทึกรายการ" ด้านบน</p>
                        </div>
                      ) : (
                        <div className="space-y-8 pb-10">
                          {Object.entries(groupedTransactions).map(([date, transactions]) => (
                            <div key={date} className="relative">
                               {/* Date Header */}
                               <div className="sticky top-0 z-10 flex items-center gap-4 mb-4 bg-white/95 backdrop-blur-sm py-2 border-b border-slate-50">
                                  <div className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-50"></div>
                                  <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                    {new Date(date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                  </span>
                                  <div className="h-px flex-1 bg-slate-100"></div>
                               </div>

                               {/* Timeline Line */}
                               <div className="absolute left-1.5 top-10 bottom-0 w-px bg-slate-100 -z-10"></div>

                               <div className="space-y-3 pl-8">
                                  {transactions.map(t => {
                                    const partner = data.partners.find(p => p.id === t.partnerId);
                                    const isDirectPayment = t.type === TransactionType.EXPENSE && t.partnerId;
                                    
                                    return (
                                    <div key={t.id} className={`relative flex flex-col sm:flex-row sm:items-start justify-between p-4 rounded-2xl border transition-all duration-200 group gap-4 ${editingId === t.id ? 'bg-amber-50 border-amber-300 shadow-md ring-1 ring-amber-200' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'}`}>
                                       
                                       {/* Connector Dot */}
                                       <div className="absolute -left-[30px] top-6 w-2 h-2 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-100 group-hover:bg-indigo-400 transition-colors"></div>

                                       {/* Left: Icon & Info */}
                                       <div className="flex items-start gap-4 overflow-hidden flex-1 min-w-0">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 ${getTransactionColor(t.type)}`}>
                                             {t.type === TransactionType.INCOME ? <Plus size={20} strokeWidth={3}/> : t.type === TransactionType.INVESTMENT ? <DollarSign size={20} strokeWidth={3}/> : <ArrowRight size={20} strokeWidth={3} className="-rotate-45"/>}
                                          </div>
                                          <div className="min-w-0 flex-1 pt-0.5">
                                             <div className="mb-1.5 pr-2">
                                               <p className="font-bold text-slate-800 text-base leading-snug break-words">
                                                 {t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}
                                               </p>
                                             </div>
                                             
                                             <div className="flex flex-wrap items-center gap-2">
                                                {partner ? (
                                                   <span 
                                                     className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg max-w-[140px] truncate border"
                                                     style={{ backgroundColor: `${partner.color}10`, color: partner.color, borderColor: `${partner.color}20` }}
                                                   >
                                                     <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: partner.color}}></div> {partner.name}
                                                   </span>
                                                ) : (
                                                   <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                                     <Wallet size={10}/> กองกลาง
                                                   </span>
                                                )}

                                                {isDirectPayment && (
                                                 <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100 font-bold whitespace-nowrap">
                                                   จ่ายตรง
                                                 </span>
                                                )}

                                                {/* Receipt Badges */}
                                                {[t.receiptImage, t.receiptImage2, t.receiptImage3, t.receiptImage4].map((img, idx) => img && (
                                                  <button 
                                                    key={idx}
                                                    onClick={(e) => { e.stopPropagation(); setViewImage(img); }}
                                                    className="flex items-center gap-1 text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-200 font-medium hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                                                  >
                                                     <ImageIcon size={12} /> สลิป {idx + 1}
                                                  </button>
                                                ))}
                                             </div>
                                          </div>
                                       </div>
                                       
                                       {/* Right: Amount & Actions */}
                                       <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 pl-0 sm:pl-4 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                          <span className={`font-bold text-xl tracking-tight ${
                                            t.type === TransactionType.INCOME ? 'text-emerald-600' : 
                                            t.type === TransactionType.INVESTMENT ? 'text-indigo-600' : 'text-rose-600'
                                          }`}>
                                            {t.type === TransactionType.EXPENSE ? '-' : '+'}{t.amount.toLocaleString()}
                                          </span>
                                          
                                          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-y-2 sm:group-hover:translate-y-0">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); startEditing(t); }}
                                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                              title="แก้ไข"
                                            >
                                              <Pencil size={16} />
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }}
                                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                              title="ลบ"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                       </div>
                                    </div>
                                  )})}
                               </div>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                </Card>

             </div>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-300 min-h-[50vh]">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                 <FolderOpen size={48} className="opacity-40"/>
              </div>
              <p className="text-xl font-bold text-slate-400">เลือกโครงการ</p>
              <p className="text-sm">เพื่อจัดการรายรับรายจ่าย</p>
           </div>
        )}
      </div>
    </div>
    
    {/* Transaction Form Modal */}
    {isFormOpen && (
      <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h3 className="text-xl font-bold text-slate-800">{editingId ? "แก้ไขรายการ" : "บันทึกรายการ"}</h3>
            <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
              <X size={24}/>
            </button>
          </div>
          <div className="p-5">
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
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
                 className="font-mono text-2xl font-bold text-slate-800 text-right tracking-tight bg-slate-50 border-slate-200 focus:bg-white transition-all"
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
                 className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
               />

               {/* Image Upload - Sequential */}
               <div>
                 <label className="text-sm font-medium text-slate-600 mb-2 block">รูปสลิป/ใบเสร็จ (สูงสุด 4 รูป)</label>
                 <div className="flex flex-col gap-3">
                   {/* Image 1 */}
                   <div className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="relative flex-1">
                         <input 
                           type="file" 
                           accept="image/*" 
                           onChange={(e) => handleImageChange(e, 1)}
                           className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-600 hover:file:bg-indigo-200 cursor-pointer"
                         />
                      </div>
                      {isProcessingImage && (
                        <div className="text-xs text-indigo-500 flex items-center gap-1 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-indigo-100">
                          <Loader2 size={12} className="animate-spin"/> กำลังย่อ...
                        </div>
                      )}
                      {transImage && !isProcessingImage && (
                         <div className="w-12 h-12 shrink-0 relative group cursor-pointer" onClick={() => setViewImage(transImage)}>
                            <img src={transImage} className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm" alt="Preview"/>
                            <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 cursor-pointer shadow-md border border-slate-100 hover:bg-rose-50 hover:border-rose-200 transition-colors" onClick={(e) => {e.stopPropagation(); setTransImage('');}}>
                               <X size={12} className="text-slate-500 hover:text-rose-500"/>
                            </div>
                         </div>
                      )}
                   </div>

                   {/* Image 2 (Shows if Image 1 exists) */}
                   {transImage && (
                     <div className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-top-2">
                        <div className="relative flex-1">
                           <input 
                             type="file" 
                             accept="image/*" 
                             onChange={(e) => handleImageChange(e, 2)}
                             className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-600 hover:file:bg-indigo-200 cursor-pointer"
                           />
                        </div>
                        {isProcessingImage2 && (
                          <div className="text-xs text-indigo-500 flex items-center gap-1 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-indigo-100">
                            <Loader2 size={12} className="animate-spin"/> กำลังย่อ...
                          </div>
                        )}
                        {transImage2 && !isProcessingImage2 && (
                           <div className="w-12 h-12 shrink-0 relative group cursor-pointer" onClick={() => setViewImage(transImage2)}>
                              <img src={transImage2} className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm" alt="Preview 2"/>
                              <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 cursor-pointer shadow-md border border-slate-100 hover:bg-rose-50 hover:border-rose-200 transition-colors" onClick={(e) => {e.stopPropagation(); setTransImage2('');}}>
                                 <X size={12} className="text-slate-500 hover:text-rose-500"/>
                              </div>
                           </div>
                        )}
                     </div>
                   )}

                   {/* Image 3 (Shows if Image 2 exists) */}
                   {transImage2 && (
                     <div className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-top-2">
                        <div className="relative flex-1">
                           <input 
                             type="file" 
                             accept="image/*" 
                             onChange={(e) => handleImageChange(e, 3)}
                             className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-600 hover:file:bg-indigo-200 cursor-pointer"
                           />
                        </div>
                        {isProcessingImage3 && (
                          <div className="text-xs text-indigo-500 flex items-center gap-1 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-indigo-100">
                            <Loader2 size={12} className="animate-spin"/> กำลังย่อ...
                          </div>
                        )}
                        {transImage3 && !isProcessingImage3 && (
                           <div className="w-12 h-12 shrink-0 relative group cursor-pointer" onClick={() => setViewImage(transImage3)}>
                              <img src={transImage3} className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm" alt="Preview 3"/>
                              <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 cursor-pointer shadow-md border border-slate-100 hover:bg-rose-50 hover:border-rose-200 transition-colors" onClick={(e) => {e.stopPropagation(); setTransImage3('');}}>
                                 <X size={12} className="text-slate-500 hover:text-rose-500"/>
                              </div>
                           </div>
                        )}
                     </div>
                   )}

                   {/* Image 4 (Shows if Image 3 exists) */}
                   {transImage3 && (
                     <div className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-top-2">
                        <div className="relative flex-1">
                           <input 
                             type="file" 
                             accept="image/*" 
                             onChange={(e) => handleImageChange(e, 4)}
                             className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-600 hover:file:bg-indigo-200 cursor-pointer"
                           />
                        </div>
                        {isProcessingImage4 && (
                          <div className="text-xs text-indigo-500 flex items-center gap-1 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-indigo-100">
                            <Loader2 size={12} className="animate-spin"/> กำลังย่อ...
                          </div>
                        )}
                        {transImage4 && !isProcessingImage4 && (
                           <div className="w-12 h-12 shrink-0 relative group cursor-pointer" onClick={() => setViewImage(transImage4)}>
                              <img src={transImage4} className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm" alt="Preview 4"/>
                              <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 cursor-pointer shadow-md border border-slate-100 hover:bg-rose-50 hover:border-rose-200 transition-colors" onClick={(e) => {e.stopPropagation(); setTransImage4('');}}>
                                 <X size={12} className="text-slate-500 hover:text-rose-500"/>
                              </div>
                           </div>
                        )}
                     </div>
                   )}
                 </div>
               </div>

               {/* Payment Source Logic */}
               {transType === TransactionType.EXPENSE ? (
                  <div className="flex flex-col gap-3 w-full pt-4 border-t border-slate-100 mt-2">
                    {/* Label & Toggle */}
                    <div className="flex justify-between items-center">
                       <label className="text-sm font-medium text-slate-600">
                         {editingId ? "แหล่งเงินที่จ่าย (แก้ไข)" : "แหล่งเงินที่จ่าย"}
                       </label>
                       <button 
                         type="button"
                         onClick={handleToggleSplitMode}
                         className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors border shadow-sm ${isSplitMode ? 'bg-indigo-600 border-indigo-600 text-white font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                       >
                          <Split size={14}/> {isSplitMode ? 'จ่ายหลายทาง' : 'จ่ายทางเดียว'}
                       </button>
                    </div>

                     {/* Split Mode */}
                    {isSplitMode ? (
                        <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200 max-h-72 overflow-y-auto custom-scrollbar shadow-inner">
                           <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                             <span>ยอดที่ต้องจ่าย</span>
                             <span className={calculateSplitTotal() === parseFloat(transAmount || '0') ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                               {calculateSplitTotal().toLocaleString()} / {parseFloat(transAmount || '0').toLocaleString()}
                             </span>
                           </div>
                           
                           <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-600 shrink-0 shadow-sm"><Wallet size={16}/></div>
                              <span className="text-sm font-medium text-slate-600 flex-1">กองกลาง</span>
                              <input 
                                type="number" 
                                placeholder="0"
                                className="w-24 px-2 py-1.5 text-sm rounded-lg border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm"
                                value={splitAmounts['POOL'] || ''}
                                onChange={e => setSplitAmounts(prev => ({...prev, 'POOL': e.target.value}))}
                              />
                           </div>

                           {data.partners.map(p => (
                             <div key={p.id} className="flex items-center gap-2">
                               <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs text-white shrink-0 shadow-sm ring-2 ring-white" style={{background: p.color}}>
                                 {p.avatar}
                               </div>
                               <span className="text-sm font-medium text-slate-600 flex-1 truncate">{p.name}</span>
                               <input 
                                 type="number" 
                                 placeholder="0"
                                 className="w-24 px-2 py-1.5 text-sm rounded-lg border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm"
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
                                   <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                                     <Building2 size={16}/>
                                   </div>
                                   <span className="text-sm font-medium text-slate-600 flex-1 truncate">{p.name}</span>
                                   <input 
                                     type="number" 
                                     placeholder="0"
                                     className="w-24 px-2 py-1.5 text-sm rounded-lg border border-slate-200 text-right bg-white focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm"
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
               
               <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={cancelEditing}>
                     ยกเลิก
                  </Button>
                  <Button type="submit" className={`flex-1 py-3 text-base font-medium shadow-md shadow-indigo-200 ${isProcessingImage || isProcessingImage2 || isProcessingImage3 || isProcessingImage4 ? 'opacity-80 cursor-wait' : ''}`} disabled={!transAmount || isProcessingImage || isProcessingImage2 || isProcessingImage3 || isProcessingImage4}>
                    {isProcessingImage || isProcessingImage2 || isProcessingImage3 || isProcessingImage4 ? 'กำลังเตรียมรูป...' : editingId ? 'บันทึกแก้ไข' : 'เพิ่มรายการ'}
                  </Button>
               </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </>
  );
};