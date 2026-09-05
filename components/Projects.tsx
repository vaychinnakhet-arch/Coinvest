import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  FilePlus2,
  FolderKanban,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Split,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { AppState, Project, Transaction, TransactionType } from '../types';
import { formatMoney, getFinancialSummary } from '../services/finance';

interface ProjectsProps {
  data: AppState;
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

interface FundingPromptState {
  numericAmount: number;
  availableCash: number;
  shortfall: number;
  selectedPartnerId: string;
  strategy: 'FULL' | 'SPLIT' | 'DEFICIT';
}

const typeConfig = {
  [TransactionType.EXPENSE]: { label: 'รายจ่าย', color: 'text-rose-700 bg-rose-50', icon: ArrowDown },
  [TransactionType.INCOME]: { label: 'รายรับ', color: 'text-teal-700 bg-teal-50', icon: ArrowUp },
  [TransactionType.INVESTMENT]: { label: 'เงินลงทุน', color: 'text-blue-700 bg-blue-50', icon: Wallet },
};

export const Projects: React.FC<ProjectsProps> = ({ data, onAddProject, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(data.projects[0]?.id || null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [source, setSource] = useState('POOL');
  const [splitMode, setSplitMode] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [receipts, setReceipts] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fundingPrompt, setFundingPrompt] = useState<FundingPromptState | null>(null);

  useEffect(() => {
    if (!selectedProjectId && data.projects[0]) setSelectedProjectId(data.projects[0].id);
  }, [data.projects, selectedProjectId]);

  const selectedProject = data.projects.find(project => project.id === selectedProjectId);
  const projectTransactions = useMemo(() => data.transactions
    .filter(transaction => transaction.projectId === selectedProjectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [data.transactions, selectedProjectId]);
  const projectSummary = useMemo(() => getFinancialSummary({ transactions: projectTransactions }, projectTransactions), [projectTransactions]);
  const otherProjects = data.projects.filter(project => project.id !== selectedProjectId);

  const effectiveAvailableCash = useMemo(() => {
    let cash = projectSummary.availableCash;
    if (editingTransaction && editingTransaction.type === TransactionType.EXPENSE && !editingTransaction.partnerId) {
      cash += editingTransaction.amount;
    }
    return cash;
  }, [projectSummary.availableCash, editingTransaction]);

  const numericAmount = Number(amount || 0);
  const isCashInsufficient = type === TransactionType.EXPENSE && !splitMode && source === 'POOL' && numericAmount > 0 && numericAmount > effectiveAvailableCash;
  const shortfallAmount = Math.max(0, numericAmount - Math.max(0, effectiveAvailableCash));

  const resetTransactionForm = () => {
    setEditingTransaction(null);
    setType(TransactionType.EXPENSE);
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setSource('POOL');
    setSplitMode(false);
    setSplitAmounts({});
    setReceipts([]);
    setProcessingImages(false);
    setFundingPrompt(null);
  };

  const openNewTransaction = () => {
    resetTransactionForm();
    setShowTransactionForm(true);
  };

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setDate(transaction.date);
    setNote(transaction.note);
    setSource(transaction.partnerId || 'POOL');
    setSplitMode(false);
    setSplitAmounts({});
    setReceipts([transaction.receiptImage, transaction.receiptImage2, transaction.receiptImage3, transaction.receiptImage4].filter(Boolean) as string[]);
    setShowTransactionForm(true);
  };

  const createProject = (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectName.trim()) return;
    onAddProject({ name: projectName.trim(), description: projectDescription.trim(), status: 'active', startDate: new Date().toISOString() });
    setProjectName('');
    setProjectDescription('');
    setShowProjectForm(false);
  };

  const compressImage = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = event => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.82;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > 49000 && quality > 0.18) {
          quality -= 0.08;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      image.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

  const addReceiptImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 4 - receipts.length);
    if (!files.length) return;
    setProcessingImages(true);
    try {
      const compressed = await Promise.all(files.map(compressImage));
      setReceipts(current => [...current, ...compressed].slice(0, 4));
    } catch {
      alert('อ่านไฟล์รูปไม่สำเร็จ กรุณาลองเลือกรูปใหม่');
    } finally {
      setProcessingImages(false);
      event.target.value = '';
    }
  };

  const receiptFields = (images: string[]) => ({
    receiptImage: images[0] || undefined,
    receiptImage2: images[1] || undefined,
    receiptImage3: images[2] || undefined,
    receiptImage4: images[3] || undefined,
  });

  const addExpenseFromSource = (sourceKey: string, sourceAmount: number, customNote?: string) => {
    if (!selectedProjectId) return;
    const common = { amount: sourceAmount, date, ...receiptFields(receipts) };
    const partner = data.partners.find(item => item.id === sourceKey);
    const sourceProject = data.projects.find(item => item.id === sourceKey);
    const finalNote = customNote !== undefined
      ? customNote
      : (splitMode && partner ? `${note || 'รายจ่าย'} (จ่ายโดย ${partner.name})` : note);

    if (sourceProject) {
      onAddTransaction({ projectId: selectedProjectId, type: TransactionType.EXPENSE, note: `${note || 'รายจ่าย'} (จ่ายโดยโครงการ: ${sourceProject.name})`, partnerId: undefined, ...common });
      onAddTransaction({ projectId: sourceProject.id, type: TransactionType.EXPENSE, note: `(ให้ยืม/โอนไปโครงการ: ${selectedProject?.name}) ${note}`, partnerId: undefined, amount: sourceAmount, date });
      onAddTransaction({ projectId: selectedProjectId, type: TransactionType.INCOME, note: `(รับเงินยืม/โอนจากโครงการ: ${sourceProject.name}) ${note}`, partnerId: undefined, amount: sourceAmount, date });
      return;
    }

    onAddTransaction({
      projectId: selectedProjectId,
      type: TransactionType.EXPENSE,
      note: finalNote,
      partnerId: partner?.id,
      ...common,
    });
  };

  const saveTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProjectId || !amount || processingImages) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    // Check if expense from POOL exceeds available cash
    if (type === TransactionType.EXPENSE && !splitMode && source === 'POOL') {
      const available = effectiveAvailableCash;
      if (numericAmount > available) {
        const shortfall = Math.max(0, numericAmount - Math.max(0, available));
        const defaultPartnerId = data.partners[0]?.id || '';
        const defaultStrategy: 'FULL' | 'SPLIT' | 'DEFICIT' = data.partners.length > 0 ? 'FULL' : 'DEFICIT';

        setFundingPrompt({
          numericAmount,
          availableCash: available,
          shortfall,
          selectedPartnerId: defaultPartnerId,
          strategy: defaultStrategy,
        });
        return;
      }
    }

    if (type === TransactionType.EXPENSE && splitMode) {
      const splits = Object.entries(splitAmounts).map(([key, value]) => [key, Number(value)] as const).filter(([, value]) => value > 0);
      const splitTotal = splits.reduce((sum, [, value]) => sum + value, 0);
      if (Math.abs(splitTotal - numericAmount) > 0.01) {
        alert(`ยอดแบ่งจ่ายรวม ${formatMoney(splitTotal, 2)} บาท ต้องเท่ากับยอดรายการ ${formatMoney(numericAmount, 2)} บาท`);
        return;
      }
      const poolAmount = Number(splitAmounts['POOL'] || 0);
      if (poolAmount > effectiveAvailableCash) {
        alert(`ยอดที่เลือกแบ่งจ่ายจากกองกลาง (${formatMoney(poolAmount, 2)} บาท) เกินเงินคงเหลือพร้อมใช้ที่มี (${formatMoney(effectiveAvailableCash, 2)} บาท) กรุณาปรับเพิ่มยอดให้ผู้ถือหุ้นช่วยจ่ายแทน`);
        return;
      }
      splits.forEach(([key, value]) => addExpenseFromSource(key, value));
      setShowTransactionForm(false);
      resetTransactionForm();
      return;
    }

    executeDirectSave(numericAmount);
  };

  const executeDirectSave = (numericAmount: number) => {
    if (!selectedProjectId) return;
    if (editingTransaction) {
      onUpdateTransaction({
        ...editingTransaction,
        type,
        amount: numericAmount,
        date,
        note,
        partnerId: source === 'POOL' ? undefined : source,
        ...receiptFields(receipts),
      });
    } else if (type === TransactionType.EXPENSE) {
      addExpenseFromSource(source, numericAmount);
    } else {
      onAddTransaction({
        projectId: selectedProjectId,
        type,
        amount: numericAmount,
        date,
        note,
        partnerId: source === 'POOL' ? undefined : source,
        ...receiptFields(receipts),
      });
    }

    setShowTransactionForm(false);
    resetTransactionForm();
  };

  const confirmFundingPrompt = () => {
    if (!fundingPrompt || !selectedProjectId) return;
    const { numericAmount, availableCash, shortfall, selectedPartnerId, strategy } = fundingPrompt;
    const partner = data.partners.find(p => p.id === selectedPartnerId);
    const partnerName = partner?.name || 'ผู้ถือหุ้น';

    if (strategy === 'FULL') {
      if (editingTransaction) {
        onUpdateTransaction({
          ...editingTransaction,
          type: TransactionType.EXPENSE,
          amount: numericAmount,
          date,
          note: note ? `${note} (จ่ายโดย ${partnerName})` : `รายจ่าย (จ่ายโดย ${partnerName})`,
          partnerId: selectedPartnerId,
          ...receiptFields(receipts),
        });
      } else {
        addExpenseFromSource(
          selectedPartnerId,
          numericAmount,
          note ? `${note} (จ่ายโดย ${partnerName})` : `รายจ่าย (จ่ายโดย ${partnerName})`,
        );
      }
    } else if (strategy === 'SPLIT') {
      const poolPortion = Math.max(0, availableCash);
      const partnerPortion = numericAmount - poolPortion;

      if (editingTransaction) {
        onUpdateTransaction({
          ...editingTransaction,
          type: TransactionType.EXPENSE,
          amount: poolPortion,
          date,
          note: `${note || 'รายจ่าย'} (ตัดจากเงินกองกลางที่มี)`,
          partnerId: undefined,
          ...receiptFields(receipts),
        });
        onAddTransaction({
          projectId: selectedProjectId,
          type: TransactionType.EXPENSE,
          amount: partnerPortion,
          date,
          note: `${note || 'รายจ่าย'} (ส่วนที่ ${partnerName} ช่วยออกส่วนขาด)`,
          partnerId: selectedPartnerId,
          ...receiptFields(receipts),
        });
      } else {
        if (poolPortion > 0) {
          addExpenseFromSource('POOL', poolPortion, `${note || 'รายจ่าย'} (ตัดจากเงินกองกลางที่มี)`);
        }
        addExpenseFromSource(
          selectedPartnerId,
          partnerPortion,
          `${note || 'รายจ่าย'} (ส่วนที่ ${partnerName} ช่วยออกส่วนขาด)`,
        );
      }
    } else {
      // DEFICIT
      if (editingTransaction) {
        onUpdateTransaction({
          ...editingTransaction,
          type: TransactionType.EXPENSE,
          amount: numericAmount,
          date,
          note,
          partnerId: undefined,
          ...receiptFields(receipts),
        });
      } else {
        addExpenseFromSource('POOL', numericAmount);
      }
    }

    setFundingPrompt(null);
    setShowTransactionForm(false);
    resetTransactionForm();
  };

  const deleteTransaction = (transaction: Transaction) => {
    if (confirm(`ลบรายการ “${transaction.note || typeConfig[transaction.type].label}” หรือไม่?`)) onDeleteTransaction(transaction.id);
  };

  const sourceOptions = [
    { value: 'POOL', label: 'กองกลาง' },
    ...data.partners.map(partner => ({ value: partner.id, label: `ผู้ถือหุ้น: ${partner.name}` })),
    ...(type === TransactionType.EXPENSE ? otherProjects.map(project => ({ value: project.id, label: `โครงการอื่น: ${project.name}` })) : []),
  ];

  if (!data.projects.length) {
    return <div className="flex min-h-[65vh] items-center justify-center"><div className="game-panel w-full max-w-lg bg-[#f4e4b9]/40 p-6 text-center md:p-8"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px] border-2 border-[#2f3a3d] bg-[#dce9e1] text-[#3f6350] shadow-[2px_2px_0_#2f3a3d]"><FolderKanban size={25} /></span><h2 className="mt-4 text-xl font-bold text-[#2f3a3d]">เริ่มจากสร้างโครงการแรก</h2><p className="mt-2 text-sm leading-6 text-[#687477]">โครงการช่วยแยกรายรับ รายจ่าย และเงินลงทุนให้ตรวจสอบง่าย</p><ProjectForm name={projectName} description={projectDescription} setName={setProjectName} setDescription={setProjectDescription} onSubmit={createProject} onCancel={undefined} /></div></div>;
  }

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <section className="game-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-bold text-slate-900">เลือกโครงการ</h2><p className="mt-0.5 text-xs text-slate-500">{data.projects.length} โครงการ</p></div>
          <button onClick={() => setShowProjectForm(value => !value)} className="pressable inline-flex min-h-10 items-center gap-2 rounded-xl border-2 border-[#2f3a3d] bg-[#fffdf7] px-3 text-sm font-bold text-[#2f3a3d] shadow-[2px_2px_0_#2f3a3d] hover:bg-[#f4f0e6]"><Plus size={16} /> โครงการใหม่</button>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {data.projects.map(project => <button key={project.id} onClick={() => setSelectedProjectId(project.id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${selectedProjectId === project.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Building2 size={16} /> {project.name}</button>)}
        </div>
        {showProjectForm && <div className="mt-4 border-t border-slate-100 pt-4"><ProjectForm name={projectName} description={projectDescription} setName={setProjectName} setDescription={setProjectDescription} onSubmit={createProject} onCancel={() => setShowProjectForm(false)} /></div>}
      </section>

      {selectedProject && <>
        <section className="game-panel bg-[#dce9ec]/45 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-xl font-bold text-slate-900 md:text-2xl">{selectedProject.name}</h2><span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700">กำลังดำเนินการ</span></div><p className="mt-2 max-w-2xl text-sm text-slate-500">{selectedProject.description || 'ยังไม่มีรายละเอียดโครงการ'}</p></div>
            <button onClick={openNewTransaction} className="pressable inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-[#2f3a3d] bg-[#d96b5f] px-5 text-sm font-bold text-white shadow-[2px_2px_0_#2f3a3d] hover:bg-[#c95f54]"><FilePlus2 size={18} /> เพิ่มรายการ</button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 lg:grid-cols-4"><Summary label="เงินพร้อมใช้" value={projectSummary.availableCash} primary /><Summary label="เงินผู้ถือหุ้น" value={projectSummary.shareholderFunds} /><Summary label="รายรับ" value={projectSummary.totalIncome} positive /><Summary label="รายจ่าย" value={projectSummary.totalExpense} negative /></div>
        </section>

        <section className="game-panel overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-[#2f3a3d] bg-[#f4e4b9]/55 px-5 py-4"><div><h3 className="font-bold text-slate-900">รายการของโครงการ</h3><p className="mt-0.5 text-xs text-slate-500">{projectTransactions.length} รายการ</p></div></div>
          {projectTransactions.length ? <div className="divide-y divide-slate-100">{projectTransactions.map(transaction => {
            const config = typeConfig[transaction.type]; const Icon = config.icon; const partner = data.partners.find(item => item.id === transaction.partnerId); const images = [transaction.receiptImage, transaction.receiptImage2, transaction.receiptImage3, transaction.receiptImage4].filter(Boolean) as string[];
            return <div key={transaction.id} className="group p-4 sm:px-5"><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.color}`}><Icon size={17} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{transaction.note || config.label}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><span className="flex items-center gap-1"><Calendar size={11} /> {new Date(transaction.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>· {config.label}</span>{partner && <span>· {partner.name}</span>}{images.length > 0 && <span className="flex items-center gap-1">· <ImageIcon size={11} /> {images.length} รูป</span>}</div></div><div className="text-right"><p className={`font-bold ${transaction.type === TransactionType.EXPENSE ? 'text-rose-600' : 'text-teal-700'}`}>{transaction.type === TransactionType.EXPENSE ? '-' : '+'}{formatMoney(transaction.amount, 2)}</p><div className="mt-2 flex justify-end gap-1"><button onClick={() => openEditTransaction(transaction)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="แก้ไข"><Pencil size={15} /></button><button onClick={() => deleteTransaction(transaction)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="ลบ"><Trash2 size={15} /></button></div></div></div>{images.length > 0 && <div className="ml-13 mt-3 flex gap-2 overflow-x-auto pl-[52px]">{images.map((image, index) => <button key={index} onClick={() => setPreviewImage(image)}><img src={image} alt={`เอกสาร ${index + 1}`} className="h-14 w-14 rounded-lg border border-slate-200 object-cover" /></button>)}</div>}</div>;
          })}</div> : <div className="flex min-h-60 flex-col items-center justify-center p-6 text-center"><Wallet size={30} className="text-slate-300" /><p className="mt-3 font-semibold text-slate-600">ยังไม่มีรายการในโครงการนี้</p><button onClick={openNewTransaction} className="mt-3 text-sm font-semibold text-teal-700">เพิ่มรายการแรก</button></div>}
        </section>
      </>}

      {showTransactionForm && selectedProject && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2f3a3d]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={event => event.target === event.currentTarget && setShowTransactionForm(false)}><div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-[16px] border-2 border-[#2f3a3d] bg-[#fffdf7] shadow-[5px_5px_0_#2f3a3d] sm:rounded-[16px]"><div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-[#2f3a3d] bg-[#f4e4b9] px-5 py-4"><div><h3 className="font-bold text-slate-900">{editingTransaction ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}</h3><p className="mt-0.5 text-xs text-slate-500">{selectedProject.name}</p></div><button onClick={() => setShowTransactionForm(false)} className="rounded-[9px] border-2 border-[#2f3a3d] bg-[#fffdf7] p-2 text-slate-600"><X size={20} /></button></div>
        <form onSubmit={saveTransaction} className="space-y-5 p-5">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border-2 border-[#2f3a3d] bg-[#eee8da] p-1.5">{Object.entries(typeConfig).map(([value, config]) => <button key={value} type="button" onClick={() => { setType(value as TransactionType); setSource('POOL'); setSplitMode(false); }} className={`rounded-lg px-2 py-2.5 text-sm font-bold ${type === value ? 'bg-[#d96b5f] text-white' : 'text-[#687477]'}`}>{config.label}</button>)}</div>
          <label className="block"><span className="text-sm font-bold text-slate-700">จำนวนเงิน</span><div className="relative mt-2"><input autoFocus type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="min-h-16 w-full rounded-xl border-2 border-[#879092] bg-[#fffdf7] px-4 pr-16 text-right text-3xl font-bold text-[#2f3a3d] outline-none focus:border-[#2f3a3d] focus:ring-3 focus:ring-[#88aeb8]/25" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">บาท</span></div></label>
          {isCashInsufficient && (
            <div className="flex items-start gap-2.5 rounded-xl border-2 border-[#e7be69] bg-[#fff8e6] p-3 text-xs leading-relaxed text-[#7a5a14]">
              <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#c89228]" />
              <div>
                <p className="font-bold text-[#6b4e0e]">เงินคงเหลือพร้อมใช้ไม่พอ (มีอยู่ {formatMoney(effectiveAvailableCash, 2)} บาท)</p>
                <p className="mt-0.5 text-[#856417]">ขาดอีก {formatMoney(shortfallAmount, 2)} บาท — เมื่อกดบันทึก ระบบจะสอบถามให้เลือกว่าจะใช้เงินจากผู้ถือหุ้นท่านไหน</p>
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="วันที่"><input type="date" required value={date} onChange={event => setDate(event.target.value)} className="field-input" /></Field><Field label="รายละเอียด"><input value={note} onChange={event => setNote(event.target.value)} placeholder="เช่น ค่าวัสดุ หรือยอดขาย" className="field-input" /></Field></div>
          {type === TransactionType.EXPENSE && !editingTransaction && <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-semibold text-slate-700">แบ่งจ่ายหลายแหล่ง</p><p className="mt-0.5 text-xs text-slate-500">เช่น กองกลางและผู้ถือหุ้นช่วยกันจ่าย</p></div><button type="button" onClick={() => setSplitMode(value => !value)} className={`relative h-7 w-12 rounded-full transition-colors ${splitMode ? 'bg-teal-700' : 'bg-slate-200'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${splitMode ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>}
          {splitMode ? <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4"><div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold text-teal-900"><Split size={15} /> ระบุยอดแต่ละแหล่ง</p><span className="text-xs text-teal-800">รวม {formatMoney(Object.values(splitAmounts).reduce((sum, value) => sum + Number(value || 0), 0), 2)} / {formatMoney(Number(amount || 0), 2)}</span></div>{sourceOptions.map(option => <label key={option.value} className="flex items-center gap-3"><span className="min-w-0 flex-1 truncate text-sm text-slate-700">{option.label}</span><input type="number" min="0" step="0.01" inputMode="decimal" value={splitAmounts[option.value] || ''} onChange={event => setSplitAmounts(current => ({ ...current, [option.value]: event.target.value }))} placeholder="0.00" className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-teal-600" /></label>)}</div> : <Field label={type === TransactionType.INVESTMENT ? 'ผู้ถือหุ้นที่ลงทุน' : type === TransactionType.INCOME ? 'เงินเข้าที่ไหน' : 'จ่ายจากแหล่งใด'}><select required={type === TransactionType.INVESTMENT} value={source} onChange={event => setSource(event.target.value)} className="field-input">{type === TransactionType.INVESTMENT && <option value="POOL" disabled>เลือกผู้ถือหุ้น</option>}{sourceOptions.filter(option => type !== TransactionType.INVESTMENT || option.value !== 'POOL').map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>}
          <details className="rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700"><span className="flex items-center gap-2"><Camera size={16} /> แนบสลิปหรือใบเสร็จ <span className="font-normal text-slate-400">({receipts.length}/4)</span></span><ChevronRight size={16} /></summary><div className="border-t border-slate-100 p-4"><div className="flex flex-wrap gap-2">{receipts.map((image, index) => <div key={index} className="relative"><button type="button" onClick={() => setPreviewImage(image)}><img src={image} alt={`เอกสาร ${index + 1}`} className="h-20 w-20 rounded-xl border border-slate-200 object-cover" /></button><button type="button" onClick={() => setReceipts(current => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-900 p-1 text-white"><X size={11} /></button></div>)}{receipts.length < 4 && <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50">{processingImages ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /><span className="mt-1">เพิ่มรูป</span></>}<input type="file" accept="image/*" multiple className="hidden" onChange={addReceiptImages} disabled={processingImages} /></label>}</div><p className="mt-3 text-xs leading-5 text-slate-500">เลือกรูปพร้อมกันได้สูงสุด 4 รูป ระบบจะย่อรูปให้อัตโนมัติ</p></div></details>
          <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 border-t-2 border-[#2f3a3d] bg-[#fffdf7] p-5"><button type="button" onClick={() => setShowTransactionForm(false)} className="min-h-12 flex-1 rounded-xl border-2 border-[#2f3a3d] text-sm font-bold text-slate-700">ยกเลิก</button><button type="submit" disabled={!amount || processingImages} className="min-h-12 flex-[1.4] rounded-xl border-2 border-[#2f3a3d] bg-[#d96b5f] text-sm font-bold text-white shadow-[2px_2px_0_#2f3a3d] hover:bg-[#c95f54] disabled:opacity-50">{editingTransaction ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}</button></div>
        </form></div></div>}

      {previewImage && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setPreviewImage(null)}><button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"><X size={22} /></button><img src={previewImage} alt="เอกสาร" className="max-h-full max-w-full rounded-xl object-contain" /></div>}

      {fundingPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#2f3a3d]/60 p-4 backdrop-blur-xs">
          <div className="game-panel w-full max-w-lg overflow-hidden border-2 border-[#2f3a3d] bg-[#fffdf7] shadow-[6px_6px_0_#2f3a3d]">
            <div className="flex items-center justify-between border-b-2 border-[#2f3a3d] bg-[#f8d77e] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#2f3a3d] bg-[#fffdf7] text-[#9b6a12]">
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">เงินคงเหลือพร้อมใช้ไม่พอ</h3>
                  <p className="text-xs text-slate-600">กรุณาเลือกผู้ถือหุ้นที่จะนำเงินมาช่วยจ่าย</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFundingPrompt(null)}
                className="rounded-lg border-2 border-[#2f3a3d] bg-[#fffdf7] p-1.5 text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border-2 border-[#2f3a3d] bg-[#eee8da]/60 p-3.5 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block text-slate-500">ยอดรายจ่าย</span>
                    <span className="font-bold text-rose-600">{formatMoney(fundingPrompt.numericAmount, 2)}</span>
                  </div>
                  <div className="border-x border-slate-300 px-1">
                    <span className="block text-slate-500">เงินพร้อมใช้ที่มี</span>
                    <span className="font-bold text-slate-800">{formatMoney(fundingPrompt.availableCash, 2)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">ขาดอีก</span>
                    <span className="font-bold text-amber-700">-{formatMoney(fundingPrompt.shortfall, 2)}</span>
                  </div>
                </div>
              </div>

              {data.partners.length > 0 ? (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    เลือกผู้ถือหุ้นที่ต้องการนำเงินมาจ่าย:
                  </label>
                  <select
                    value={fundingPrompt.selectedPartnerId}
                    onChange={e => setFundingPrompt(prev => prev ? { ...prev, selectedPartnerId: e.target.value } : null)}
                    className="field-input w-full font-semibold"
                  >
                    {data.partners.map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  ยังไม่มีรายชื่อผู้ถือหุ้นในระบบ สามารถบันทึกติดลบกองกลาง หรือไปเพิ่มรายชื่อผู้ถือหุ้นที่หน้าสรุปหุ้นส่วน
                </div>
              )}

              {data.partners.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">รูปแบบการชำระ:</label>
                  
                  <label
                    onClick={() => setFundingPrompt(prev => prev ? { ...prev, strategy: 'FULL' } : null)}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-xs transition-colors ${
                      fundingPrompt.strategy === 'FULL'
                        ? 'border-[#2f3a3d] bg-[#dce9e1] font-semibold text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fundingStrategy"
                      checked={fundingPrompt.strategy === 'FULL'}
                      onChange={() => setFundingPrompt(prev => prev ? { ...prev, strategy: 'FULL' } : null)}
                      className="mt-0.5 text-teal-700"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">ให้ผู้ถือหุ้นออกเต็มจำนวน ({formatMoney(fundingPrompt.numericAmount, 2)} บาท)</p>
                      <p className="mt-0.5 text-[11px] font-normal text-slate-500">
                        บันทึกเป็นรายจ่ายที่ออกโดยผู้ถือหุ้นท่านนี้โดยตรง ไม่ตัดเงินกองกลาง
                      </p>
                    </div>
                  </label>

                  {fundingPrompt.availableCash > 0 && (
                    <label
                      onClick={() => setFundingPrompt(prev => prev ? { ...prev, strategy: 'SPLIT' } : null)}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-xs transition-colors ${
                        fundingPrompt.strategy === 'SPLIT'
                          ? 'border-[#2f3a3d] bg-[#dce9e1] font-semibold text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fundingStrategy"
                        checked={fundingPrompt.strategy === 'SPLIT'}
                        onChange={() => setFundingPrompt(prev => prev ? { ...prev, strategy: 'SPLIT' } : null)}
                        className="mt-0.5 text-teal-700"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">
                          ใช้กองกลาง {formatMoney(fundingPrompt.availableCash, 2)} บาท + ผู้ถือหุ้นช่วยออก {formatMoney(fundingPrompt.shortfall, 2)} บาท
                        </p>
                        <p className="mt-0.5 text-[11px] font-normal text-slate-500">
                          ระบบจะแยกตัดเงินกองกลางที่มีอยู่จนหมด และสร้างรายการส่วนขาดให้ผู้ถือหุ้นช่วยจ่าย
                        </p>
                      </div>
                    </label>
                  )}

                  <label
                    onClick={() => setFundingPrompt(prev => prev ? { ...prev, strategy: 'DEFICIT' } : null)}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-xs transition-colors ${
                      fundingPrompt.strategy === 'DEFICIT'
                        ? 'border-[#2f3a3d] bg-[#eee8da] font-semibold text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fundingStrategy"
                      checked={fundingPrompt.strategy === 'DEFICIT'}
                      onChange={() => setFundingPrompt(prev => prev ? { ...prev, strategy: 'DEFICIT' } : null)}
                      className="mt-0.5 text-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">จ่ายจากกองกลางตามเดิม (ยอมให้เงินกองกลางติดลบ)</p>
                      <p className="mt-0.5 text-[11px] font-normal text-slate-500">
                        ยังไม่ตัดเงินผู้ถือหุ้น กองกลางจะติดลบ {formatMoney(fundingPrompt.shortfall, 2)} บาท
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setFundingPrompt(null)}
                  className="min-h-11 flex-1 rounded-xl border-2 border-[#2f3a3d] bg-[#fffdf7] text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  ย้อนกลับแก้ไข
                </button>
                <button
                  type="button"
                  onClick={confirmFundingPrompt}
                  disabled={data.partners.length > 0 && !fundingPrompt.selectedPartnerId && fundingPrompt.strategy !== 'DEFICIT'}
                  className="min-h-11 flex-[1.4] rounded-xl border-2 border-[#2f3a3d] bg-[#d96b5f] text-sm font-bold text-white shadow-[2px_2px_0_#2f3a3d] hover:bg-[#c95f54] disabled:opacity-50"
                >
                  ยืนยันบันทึกรายการ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Summary = ({ label, value, primary, positive, negative }: { label: string; value: number; primary?: boolean; positive?: boolean; negative?: boolean }) => <div className={`rounded-xl border-2 p-3 ${primary ? 'border-[#2f3a3d] bg-[#dce9e1]' : 'border-[#cfd4cd] bg-[#fffdf7]'}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`number-display mt-1 truncate text-lg font-bold ${negative ? 'text-rose-600' : positive ? 'text-[#3f6350]' : 'text-slate-900'}`}>{formatMoney(value)}</p><p className="text-[10px] text-slate-400">บาท</p></div>;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
const ProjectForm = ({ name, description, setName, setDescription, onSubmit, onCancel }: { name: string; description: string; setName: (value: string) => void; setDescription: (value: string) => void; onSubmit: (event: React.FormEvent) => void; onCancel?: () => void }) => <form onSubmit={onSubmit} className="mt-5 grid gap-3 text-left sm:grid-cols-[1fr_1.2fr_auto]"><input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="ชื่อโครงการ" className="field-input" /><input value={description} onChange={event => setDescription(event.target.value)} placeholder="รายละเอียดสั้นๆ (ไม่บังคับ)" className="field-input" /><div className="flex gap-2">{onCancel && <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border-2 border-[#2f3a3d] px-3 text-sm font-bold text-slate-600">ยกเลิก</button>}<button type="submit" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#2f3a3d] bg-[#d96b5f] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#2f3a3d]"><Check size={16} /> สร้าง</button></div></form>;
