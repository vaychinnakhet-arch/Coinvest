import React, { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  FilePlus2,
  FolderKanban,
  Landmark,
  Receipt,
  Wallet,
} from 'lucide-react';
import { AppState, TransactionType, ViewState } from '../types';
import { formatMoney, getFinancialSummary } from '../services/finance';

interface DashboardProps {
  data: AppState;
  onNavigate: (view: ViewState) => void;
}

const currency = (value: number) => `${formatMoney(value)} บาท`;

export const Dashboard: React.FC<DashboardProps> = ({ data, onNavigate }) => {
  const summary = useMemo(() => getFinancialSummary(data), [data]);

  const projects = useMemo(() => data.projects.map(project => {
    const transactions = data.transactions.filter(t => t.projectId === project.id);
    const projectSummary = getFinancialSummary({ transactions }, transactions);
    return {
      ...project,
      balance: projectSummary.availableCash,
      income: projectSummary.totalIncome,
      expense: projectSummary.totalExpense,
    };
  }).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)), [data]);

  const partners = useMemo(() => data.partners.map(partner => {
    const transactions = data.transactions.filter(t => t.partnerId === partner.id);
    const paid = transactions
      .filter(t => t.type === TransactionType.INVESTMENT || t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    const received = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...partner, net: paid - received };
  }).sort((a, b) => b.net - a.net), [data]);

  const recentTransactions = useMemo(() => [...data.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6), [data.transactions]);

  const maxProjectMovement = Math.max(1, ...projects.map(p => p.income + p.expense));

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <section className={`game-panel relative overflow-hidden p-5 md:p-7 ${summary.availableCash >= 0 ? 'bg-[#dce9e1]' : 'bg-[#f5ded9]'}`}>
        <span className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[26px] border-[#fffdf7]/55" aria-hidden="true" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#3f6350]">
              <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border-2 border-[#2f3a3d] bg-[#fffdf7] shadow-[2px_2px_0_#2f3a3d]">
                <Wallet size={17} />
              </span>
              เงินคงเหลือพร้อมใช้
            </div>
            <p className={`number-display relative text-[clamp(2.25rem,7vw,4rem)] font-bold leading-none ${summary.availableCash >= 0 ? 'text-[#2f3a3d]' : 'text-[#a94646]'}`}>
              {currency(summary.availableCash)}
            </p>
            <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-[#566164]">
              เงินสดที่เหลือสำหรับใช้จ่ายจริง หลังรวมเงินที่ผู้ถือหุ้นลงและหักรายรับ-รายจ่ายทั้งหมด
            </p>
          </div>

          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[12px] border-2 border-[#2f3a3d] bg-[#fffdf7]/90 p-4 text-center shadow-[3px_3px_0_#2f3a3d] lg:min-w-[440px]">
            <div>
              <p className="text-xs font-semibold text-[#687477]">เงินผู้ถือหุ้นสุทธิ</p>
              <p className="number-display mt-1 text-lg font-bold text-[#2f3a3d]">{formatMoney(summary.shareholderFunds)}</p>
            </div>
            <span className="text-xl text-slate-300">+</span>
            <div>
              <p className="text-xs text-slate-500">รายรับ - รายจ่าย</p>
              <p className={`mt-1 text-lg font-bold ${summary.netCashFlow >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                {summary.netCashFlow > 0 ? '+' : ''}{formatMoney(summary.netCashFlow)}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-3 border-t-2 border-[#2f3a3d]/15 pt-5">
          <button onClick={() => onNavigate('PROJECTS')} className="pressable inline-flex min-h-11 items-center gap-2 rounded-[10px] border-2 border-[#2f3a3d] bg-[#d96b5f] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#2f3a3d] hover:bg-[#c95f54]">
            <FilePlus2 size={17} /> เพิ่มรายการ
          </button>
          <button onClick={() => onNavigate('ACCOUNTS')} className="pressable inline-flex min-h-11 items-center gap-2 rounded-[10px] border-2 border-[#2f3a3d] bg-[#fffdf7] px-4 text-sm font-bold text-[#2f3a3d] shadow-[2px_2px_0_#2f3a3d] hover:bg-[#f4f0e6]">
            <Receipt size={17} /> ดูบัญชีทั้งหมด
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'เงินลงทุนที่ลง', value: summary.totalInvestment, icon: Landmark, tone: 'text-[#466c75] bg-[#dce9ec]' },
          { label: 'รายรับทั้งหมด', value: summary.totalIncome, icon: ArrowUpRight, tone: 'text-[#3f6350] bg-[#dce9e1]' },
          { label: 'รายจ่ายทั้งหมด', value: summary.totalExpense, icon: ArrowDownRight, tone: 'text-[#a94646] bg-[#f5ded9]' },
          { label: 'โครงการ', value: data.projects.length, icon: FolderKanban, tone: 'text-[#765d25] bg-[#f4e4b9]', count: true },
        ].map(({ label, value, icon: Icon, tone, count }) => (
          <div key={label} className="game-panel p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#2f3a3d]/25 ${tone}`}><Icon size={18} /></div>
            <p className="text-xs font-semibold text-[#687477]">{label}</p>
            <p className="number-display mt-1 truncate text-xl font-bold text-[#2f3a3d]" title={String(value)}>
              {count ? `${value} รายการ` : formatMoney(value)}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="game-panel overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-[#2f3a3d] bg-[#f4e4b9]/55 px-5 py-4">
            <div>
              <h3 className="font-bold text-slate-900">สถานะรายโครงการ</h3>
              <p className="mt-0.5 text-xs text-slate-500">ดูเงินคงเหลือและการเคลื่อนไหวแบบย่อ</p>
            </div>
            <button onClick={() => onNavigate('PROJECT_SUMMARY')} className="flex items-center gap-1 text-sm font-bold text-[#a45149] hover:text-[#753b36]">
              ดูรายงาน <ArrowRight size={15} />
            </button>
          </div>

          {projects.length ? (
            <div className="divide-y divide-slate-100">
              {projects.slice(0, 5).map(project => (
                <button key={project.id} onClick={() => onNavigate('PROJECTS')} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-[#f4f0e6]/60 sm:grid-cols-[minmax(150px,1fr)_minmax(180px,1.2fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{project.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{project.status === 'active' ? 'กำลังดำเนินการ' : project.status === 'completed' ? 'เสร็จแล้ว' : 'วางแผน'}</p>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-[11px] text-slate-500">
                      <span>รับ {formatMoney(project.income)}</span>
                      <span>จ่าย {formatMoney(project.expense)}</span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span className="bg-[#7b9e87]" style={{ width: `${(project.income / maxProjectMovement) * 100}%` }} />
                      <span className="bg-[#d96b5f]" style={{ width: `${(project.expense / maxProjectMovement) * 100}%` }} />
                    </div>
                  </div>
                  <p className={`font-bold sm:text-right ${project.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{formatMoney(project.balance)}</p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={FolderKanban} text="ยังไม่มีโครงการ" action="สร้างโครงการแรก" onClick={() => onNavigate('PROJECTS')} />
          )}
        </div>

        <div className="game-panel overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-[#2f3a3d] bg-[#dce9ec]/65 px-5 py-4">
            <div>
              <h3 className="font-bold text-slate-900">รายการล่าสุด</h3>
              <p className="mt-0.5 text-xs text-slate-500">6 รายการล่าสุดจากทุกโครงการ</p>
            </div>
            <button onClick={() => onNavigate('ACCOUNTS')} className="text-sm font-bold text-[#a45149]">ดูทั้งหมด</button>
          </div>
          {recentTransactions.length ? (
            <div className="divide-y divide-slate-100 px-5">
              {recentTransactions.map(transaction => {
                const project = data.projects.find(p => p.id === transaction.projectId);
                const isExpense = transaction.type === TransactionType.EXPENSE;
                return (
                  <div key={transaction.id} className="flex items-center gap-3 py-3.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isExpense ? 'bg-rose-50 text-rose-600' : transaction.type === TransactionType.INCOME ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>
                      <CircleDollarSign size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{transaction.note || (isExpense ? 'รายจ่าย' : 'รายรับ')}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{project?.name || 'ไม่ระบุโครงการ'} · {new Date(transaction.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${isExpense ? 'text-rose-600' : 'text-teal-700'}`}>
                      {isExpense ? '-' : '+'}{formatMoney(transaction.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Receipt} text="ยังไม่มีรายการเคลื่อนไหว" action="เพิ่มรายการ" onClick={() => onNavigate('PROJECTS')} />
          )}
        </div>
      </section>

      {partners.length > 0 && (
        <section className="game-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">เงินผู้ถือหุ้นสุทธิ</h3>
              <p className="mt-0.5 text-xs text-slate-500">รวมเงินลงทุนและยอดที่สำรองจ่าย หักยอดที่รับคืนแล้ว</p>
            </div>
            <button onClick={() => onNavigate('PARTNERS')} className="text-sm font-bold text-[#a45149]">ดูรายละเอียด</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {partners.slice(0, 4).map(partner => (
              <div key={partner.id} className="flex items-center gap-3 rounded-[10px] border-2 border-[#cfd4cd] bg-[#faf7ef] p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#2f3a3d]/30 text-sm font-bold text-white" style={{ backgroundColor: partner.color }}>{partner.avatar}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">{partner.name}</p>
                  <p className="font-bold text-slate-900">{formatMoney(partner.net)} บาท</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const EmptyState = ({ icon: Icon, text, action, onClick }: { icon: React.ElementType; text: string; action: string; onClick: () => void }) => (
  <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon size={20} /></span>
    <p className="text-sm text-slate-500">{text}</p>
    <button onClick={onClick} className="mt-3 text-sm font-semibold text-teal-700 hover:underline">{action}</button>
  </div>
);
