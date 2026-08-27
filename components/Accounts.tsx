import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Calendar,
  Download,
  FileText,
  Filter,
  Loader2,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AppState, Transaction, TransactionType } from '../types';
import { formatMoney, getCashImpact, getFinancialSummary } from '../services/finance';

interface AccountsProps { data: AppState; }
type TransactionWithBalance = Transaction & { balance: number };

const typeLabels: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'รายรับ',
  [TransactionType.EXPENSE]: 'รายจ่าย',
  [TransactionType.INVESTMENT]: 'เงินลงทุน',
};

export const Accounts: React.FC<AccountsProps> = ({ data }) => {
  const [filterProject, setFilterProject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const processedTransactions = useMemo(() => {
    const scoped = data.transactions
      .filter(t => filterProject === 'all' || t.projectId === filterProject)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const withBalance: TransactionWithBalance[] = scoped.map(transaction => {
      runningBalance += getCashImpact(transaction);
      return { ...transaction, balance: runningBalance };
    });

    const visible = withBalance.filter(transaction => {
      if (filterType !== 'all' && transaction.type !== filterType) return false;
      if (startDate && transaction.date < startDate) return false;
      if (endDate && transaction.date > endDate) return false;
      if (searchQuery) {
        const search = searchQuery.trim().toLowerCase();
        const project = data.projects.find(p => p.id === transaction.projectId)?.name || '';
        const partner = data.partners.find(p => p.id === transaction.partnerId)?.name || '';
        if (![transaction.note, project, partner, transaction.amount.toString()].some(value => value.toLowerCase().includes(search))) return false;
      }
      return true;
    });

    return sortOrder === 'desc' ? visible.reverse() : visible;
  }, [data, filterProject, filterType, startDate, endDate, searchQuery, sortOrder]);

  const summary = useMemo(() => getFinancialSummary({ transactions: processedTransactions }, processedTransactions), [processedTransactions]);
  const activeFilterCount = [filterProject !== 'all', filterType !== 'all', Boolean(startDate), Boolean(endDate), Boolean(searchQuery)].filter(Boolean).length;

  const resetFilters = () => {
    setFilterProject('all');
    setFilterType('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const exportToPDF = async () => {
    if (!pdfRef.current || processedTransactions.length === 0) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pages = Array.from(pdfRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]'));
      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await html2canvas(pages[index], {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 794,
        });
        if (index > 0) doc.addPage();
        doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }
      doc.save(`CoInvest_Statement_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export failed', error);
      alert('สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <section className="grid grid-cols-3 gap-3 md:grid-cols-[1.35fr_repeat(3,1fr)]">
        <div className="game-panel col-span-3 bg-[#dce9e1] p-5 md:col-span-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#3f6350]"><Wallet size={16} /> เงินคงเหลือพร้อมใช้</div>
          <p className={`number-display mt-2 text-3xl font-bold ${summary.availableCash >= 0 ? 'text-[#2f3a3d]' : 'text-rose-700'}`}>{formatMoney(summary.availableCash)} <span className="text-base font-semibold">บาท</span></p>
          <p className="mt-2 text-xs text-slate-600">เงินผู้ถือหุ้น {formatMoney(summary.shareholderFunds)} + สุทธิ {formatMoney(summary.netCashFlow)}</p>
        </div>
        <Metric label="เงินลงทุน" value={summary.totalInvestment} tone="blue" />
        <Metric label="รายรับ" value={summary.totalIncome} tone="green" />
        <Metric label="รายจ่าย" value={summary.totalExpense} tone="red" />
      </section>

      <section className="game-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อรายการ โครงการ หรือจำนวนเงิน" className="min-h-11 w-full rounded-xl border-2 border-[#879092] bg-[#fffdf7] pl-10 pr-4 text-sm outline-none focus:border-[#2f3a3d] focus:ring-3 focus:ring-[#88aeb8]/25" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowFilters(value => !value)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${showFilters || activeFilterCount ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-300 text-slate-700'}`}>
              <Filter size={16} /> ตัวกรอง {activeFilterCount > 0 && <span className="rounded-full bg-teal-700 px-1.5 text-[10px] text-white">{activeFilterCount}</span>}
            </button>
            <button onClick={() => setSortOrder(value => value === 'desc' ? 'asc' : 'desc')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700">
              <ArrowDownUp size={16} /> {sortOrder === 'desc' ? 'ล่าสุดก่อน' : 'เก่าสุดก่อน'}
            </button>
            <button onClick={exportToPDF} disabled={isExporting || processedTransactions.length === 0} className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-[#2f3a3d] bg-[#d96b5f] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#2f3a3d] hover:bg-[#c95f54] disabled:opacity-50">
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {isExporting ? 'กำลังสร้าง' : 'ส่งออก PDF'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-5">
            <FilterSelect label="โครงการ" value={filterProject} onChange={setFilterProject} options={[{ value: 'all', label: 'ทุกโครงการ' }, ...data.projects.map(p => ({ value: p.id, label: p.name }))]} />
            <FilterSelect label="ประเภท" value={filterType} onChange={setFilterType} options={[{ value: 'all', label: 'ทุกประเภท' }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))]} />
            <FilterDate label="ตั้งแต่วันที่" value={startDate} onChange={setStartDate} />
            <FilterDate label="ถึงวันที่" value={endDate} onChange={setEndDate} />
            <div className="flex items-end"><button onClick={resetFilters} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50"><X size={15} /> ล้างตัวกรอง</button></div>
          </div>
        )}
      </section>

      <section className="game-panel overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-[#2f3a3d] bg-[#f4e4b9]/55 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="font-bold text-slate-900">รายการเดินบัญชี</h2>
            <p className="mt-0.5 text-xs text-slate-500">พบ {processedTransactions.length} รายการ</p>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="px-5 py-3 font-semibold">วันที่</th><th className="px-5 py-3 font-semibold">รายการ</th><th className="px-5 py-3 text-right font-semibold">เงินเข้า</th><th className="px-5 py-3 text-right font-semibold">เงินออก</th><th className="px-5 py-3 text-right font-semibold">คงเหลือ</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedTransactions.map(transaction => <DesktopRow key={transaction.id} transaction={transaction} data={data} />)}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {processedTransactions.map(transaction => <MobileRow key={transaction.id} transaction={transaction} data={data} />)}
        </div>

        {processedTransactions.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center text-slate-500">
            <FileText size={32} className="mb-3 text-slate-300" />
            <p className="font-semibold">ไม่พบรายการ</p>
            <p className="mt-1 text-sm">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
          </div>
        )}
      </section>

      <div ref={pdfRef} className="fixed left-[-10000px] top-0 z-[-1] bg-white">
        <PDFReport data={data} transactions={processedTransactions} summary={summary} projectId={filterProject} startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
};

const Metric = ({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'red' }) => {
  const tones = { blue: 'bg-blue-50 text-blue-700', green: 'bg-teal-50 text-teal-700', red: 'bg-rose-50 text-rose-700' };
  return <div className="game-panel min-w-0 p-3 sm:p-4"><span className={`inline-flex max-w-full truncate rounded-lg border border-[#2f3a3d]/20 px-2 py-1 text-[10px] font-bold sm:text-xs ${tones[tone]}`}>{label}</span><p className="number-display mt-3 truncate text-lg font-bold text-[#2f3a3d] sm:text-xl">{formatMoney(value)}</p><p className="mt-1 text-[10px] text-slate-400 sm:text-xs">บาท</p></div>;
};

const FilterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) => <label className="text-xs font-semibold text-slate-600">{label}<select value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
const FilterDate = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <label className="text-xs font-semibold text-slate-600">{label}<input type="date" value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600" /></label>;

const DesktopRow = ({ transaction, data }: { transaction: TransactionWithBalance; data: AppState }) => {
  const project = data.projects.find(p => p.id === transaction.projectId);
  const partner = data.partners.find(p => p.id === transaction.partnerId);
  const isExpense = transaction.type === TransactionType.EXPENSE;
  return <tr className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">{new Date(transaction.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</td><td className="px-5 py-3.5"><p className="text-sm font-semibold text-slate-800">{transaction.note || typeLabels[transaction.type]}</p><p className="mt-1 text-[11px] text-slate-500">{project?.name || 'ไม่ระบุโครงการ'}{partner ? ` · ${partner.name}` : ''} · {typeLabels[transaction.type]}</p></td><td className="px-5 py-3.5 text-right text-sm font-bold text-teal-700">{!isExpense ? `+${formatMoney(transaction.amount, 2)}` : ''}</td><td className="px-5 py-3.5 text-right text-sm font-bold text-rose-600">{isExpense ? `-${formatMoney(transaction.amount, 2)}` : ''}</td><td className={`px-5 py-3.5 text-right text-sm font-bold ${transaction.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatMoney(transaction.balance, 2)}</td></tr>;
};

const MobileRow = ({ transaction, data }: { transaction: TransactionWithBalance; data: AppState }) => {
  const project = data.projects.find(p => p.id === transaction.projectId);
  const isExpense = transaction.type === TransactionType.EXPENSE;
  return <div className="p-4"><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isExpense ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-700'}`}>{isExpense ? <ArrowDown size={16} /> : <ArrowUp size={16} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{transaction.note || typeLabels[transaction.type]}</p><p className="mt-1 text-xs text-slate-500">{project?.name || 'ไม่ระบุโครงการ'} · {new Date(transaction.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</p></div><p className={`shrink-0 text-sm font-bold ${isExpense ? 'text-rose-600' : 'text-teal-700'}`}>{isExpense ? '-' : '+'}{formatMoney(transaction.amount)}</p></div><div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="text-slate-500">คงเหลือหลังรายการ</span><strong className={transaction.balance < 0 ? 'text-rose-600' : 'text-slate-800'}>{formatMoney(transaction.balance)} บาท</strong></div></div>;
};

const chunk = <T,>(items: T[], size: number) => items.reduce<T[][]>((groups, item, index) => { const groupIndex = Math.floor(index / size); (groups[groupIndex] ||= []).push(item); return groups; }, []);

const paginateTransactions = <T,>(items: T[]) => {
  if (items.length <= 13) return [items];
  return [items.slice(0, 13), ...chunk(items.slice(13), 17)];
};

const PDFReport = ({ data, transactions, summary, projectId, startDate, endDate }: { data: AppState; transactions: TransactionWithBalance[]; summary: ReturnType<typeof getFinancialSummary>; projectId: string; startDate: string; endDate: string }) => {
  const pages = paginateTransactions(transactions);
  const projectName = projectId === 'all' ? 'ทุกโครงการ' : data.projects.find(p => p.id === projectId)?.name || '-';
  const period = startDate || endDate ? `${startDate ? new Date(startDate).toLocaleDateString('th-TH') : 'เริ่มต้น'} - ${endDate ? new Date(endDate).toLocaleDateString('th-TH') : 'ปัจจุบัน'}` : 'ทุกช่วงเวลา';
  return <>{pages.map((page, pageIndex) => <div data-pdf-page key={pageIndex} style={{ width: 794, height: 1123, padding: '44px 48px', background: '#fffdf7', color: '#2f3a3d', fontFamily: 'Sarabun, sans-serif', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #2f3a3d', paddingBottom: 18 }}><div><div style={{ color: '#d96b5f', fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>CO/INVEST</div><h1 style={{ fontSize: 25, margin: '5px 0 0', fontWeight: 700 }}>รายงานบัญชีรายรับ-รายจ่าย</h1></div><div style={{ textAlign: 'right', color: '#687477', fontSize: 12, lineHeight: 1.6 }}><div>โครงการ: {projectName}</div><div>ช่วงเวลา: {period}</div></div></div>
    {pageIndex === 0 && <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: 10, margin: '20px 0' }}><PdfMetric label="เงินคงเหลือพร้อมใช้" value={summary.availableCash} primary /><PdfMetric label="เงินผู้ถือหุ้น" value={summary.shareholderFunds} /><PdfMetric label="รายรับ" value={summary.totalIncome} /><PdfMetric label="รายจ่าย" value={summary.totalExpense} /></div>}
    {pageIndex > 0 && <div style={{ margin: '16px 0', color: '#64748b', fontSize: 12 }}>รายการต่อ (หน้า {pageIndex + 1})</div>}
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead><tr style={{ background: '#f4e4b9', color: '#2f3a3d' }}><PdfTh>วันที่</PdfTh><PdfTh>รายการ / โครงการ</PdfTh><PdfTh align="right">เงินเข้า</PdfTh><PdfTh align="right">เงินออก</PdfTh><PdfTh align="right">คงเหลือ</PdfTh></tr></thead><tbody>{page.map(transaction => { const expense = transaction.type === TransactionType.EXPENSE; const project = data.projects.find(p => p.id === transaction.projectId); return <tr key={transaction.id}><PdfTd>{new Date(transaction.date).toLocaleDateString('th-TH')}</PdfTd><PdfTd><strong>{transaction.note || typeLabels[transaction.type]}</strong><div style={{ color: '#687477', marginTop: 3 }}>{project?.name || '-'} · {typeLabels[transaction.type]}</div></PdfTd><PdfTd align="right" color="#3f6350">{expense ? '-' : formatMoney(transaction.amount, 2)}</PdfTd><PdfTd align="right" color="#a94646">{expense ? formatMoney(transaction.amount, 2) : '-'}</PdfTd><PdfTd align="right"><strong>{formatMoney(transaction.balance, 2)}</strong></PdfTd></tr>; })}</tbody></table>
    <div style={{ position: 'absolute', left: 48, right: 48, bottom: 32, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 10, color: '#94a3b8', fontSize: 10 }}><span>สร้างจาก CoInvest · {new Date().toLocaleString('th-TH')}</span><span>หน้า {pageIndex + 1} / {pages.length}</span></div>
  </div>)}</>;
};

const PdfMetric = ({ label, value, primary }: { label: string; value: number; primary?: boolean }) => <div style={{ border: `2px solid ${primary ? '#2f3a3d' : '#cfd4cd'}`, background: primary ? '#dce9e1' : '#fffdf7', borderRadius: 8, padding: 12 }}><div style={{ color: '#687477', fontSize: 10 }}>{label}</div><div style={{ marginTop: 5, fontSize: primary ? 18 : 15, fontWeight: 700, color: '#2f3a3d' }}>{formatMoney(value, 2)}</div><div style={{ color: '#879092', fontSize: 9 }}>บาท</div></div>;
const PdfTh = ({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) => <th style={{ padding: '10px 8px', borderBottom: '1px solid #cbd5e1', textAlign: align, fontWeight: 700 }}>{children}</th>;
const PdfTd = ({ children, align = 'left', color }: { children: React.ReactNode; align?: 'left' | 'right'; color?: string }) => <td style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: align, color, verticalAlign: 'top' }}>{children}</td>;
