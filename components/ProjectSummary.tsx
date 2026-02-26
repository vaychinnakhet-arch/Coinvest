import React, { useRef, useState, useMemo } from 'react';
import { AppState, TransactionType } from '../types';
import { Button, Badge } from './ui/Components';
import { Download, X, Building2, TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Calendar, Loader2, ArrowRightLeft, ArrowRight, ArrowDownLeft, ArrowUpRight, Activity, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';

interface ProjectSummaryProps {
  data: AppState;
}

export const ProjectSummary: React.FC<ProjectSummaryProps> = ({ data }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(data.projects.length > 0 ? data.projects[0].id : '');
  const [filterMonth, setFilterMonth] = useState<string>(''); // Format: YYYY-MM

  // Helper: Format Currency
  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

  // Helper: Format Date
  const formatMonthYear = (ymStr: string) => {
    if (!ymStr) return '';
    const [y, m] = ymStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(date);
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for render
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#F8FAFC',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1200
      });
      
      const project = data.projects.find(p => p.id === selectedProjectId);
      const link = document.createElement('a');
      link.download = `CoInvest-Project-${project?.name || 'Summary'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("ไม่สามารถบันทึกรูปภาพได้");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedProject = data.projects.find(p => p.id === selectedProjectId);

  const stats = useMemo(() => {
    if (!selectedProjectId || !selectedProject) return null;

    let transactions = data.transactions.filter(t => t.projectId === selectedProjectId);

    if (filterMonth) {
      transactions = transactions.filter(t => t.date.startsWith(filterMonth));
    }

    let income = 0;
    let expense = 0;
    let investment = 0;

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) {
        income += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        expense += t.amount;
        if (t.partnerId) {
          investment += t.amount;
        }
      } else if (t.type === TransactionType.INVESTMENT) {
        investment += t.amount;
      }
    });

    const netProfit = income - expense;
    const roi = investment > 0 ? (netProfit / investment) * 100 : 0;

    const loansGiven: { targetName: string, amount: number }[] = [];
    const loansTaken: { sourceName: string, amount: number }[] = [];

    const extractProjectName = (note: any): string | null => {
        if (!note || typeof note !== 'string') return null;
        const regex = /(?:นำเงินไปหมุนให้โครงการ:|เงินถูกยืมไปโครงการ:|โอนไปโครงการ:)\s*([^\)-]+)/;
        const match = note.match(regex);
        return match && match[1] ? match[1].trim() : null;
    };

    data.transactions
      .filter(t => t.projectId === selectedProjectId && t.type === TransactionType.EXPENSE)
      .forEach(t => {
         const targetName = extractProjectName(t.note);
         if (targetName) {
            const existing = loansGiven.find(l => l.targetName === targetName);
            if (existing) existing.amount += t.amount;
            else loansGiven.push({ targetName, amount: t.amount });
         }
      });

    data.transactions
      .filter(t => t.projectId !== selectedProjectId && t.type === TransactionType.EXPENSE)
      .forEach(t => {
         const targetName = extractProjectName(t.note);
         if (targetName === selectedProject.name) {
            const sourceProject = data.projects.find(p => p.id === t.projectId);
            if (sourceProject) {
               const existing = loansTaken.find(l => l.sourceName === sourceProject.name);
               if (existing) existing.amount += t.amount;
               else loansTaken.push({ sourceName: sourceProject.name, amount: t.amount });
            }
         }
      });

    const partnerShares = data.partners.map(p => {
      const invested = transactions
        .filter(t => t.partnerId === p.id && (t.type === TransactionType.INVESTMENT || t.type === TransactionType.EXPENSE))
        .reduce((s, t) => s + t.amount, 0);
      
      return {
        name: p.name,
        value: invested,
        color: p.color
      };
    }).filter(p => p.value > 0);

    const recentTx = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    const chartData = [
      { name: 'รายรับ', amount: income, fill: '#10B981' },
      { name: 'รายจ่าย', amount: expense, fill: '#F43F5E' },
      { name: 'กำไรสุทธิ', amount: netProfit, fill: netProfit >= 0 ? '#4F46E5' : '#F43F5E' }
    ];

    return {
      income,
      expense,
      investment,
      netProfit,
      roi,
      partnerShares,
      recentTx,
      count: transactions.length,
      loansGiven,
      loansTaken,
      chartData
    };
  }, [data, selectedProjectId, filterMonth, selectedProject]);

  if (!selectedProject) {
    return (
       <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <Building2 size={64} className="mb-4 opacity-20"/>
          <p className="text-lg font-medium">กรุณาเลือกหรือสร้างโครงการก่อน</p>
       </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
           <div className="w-full md:w-64">
              <select 
                value={selectedProjectId} 
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all appearance-none cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', paddingRight: '2.5rem' }}
              >
                {data.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
           </div>
           
           <div className="relative w-full md:w-48">
              <input 
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none pl-10 transition-all cursor-pointer"
              />
              <Calendar className="absolute left-3.5 top-3 text-indigo-500" size={16}/>
              {filterMonth && (
                 <button onClick={() => setFilterMonth('')} className="absolute right-2.5 top-3 text-slate-400 hover:text-rose-500 transition-colors bg-white rounded-full">
                    <X size={16}/>
                 </button>
              )}
           </div>
        </div>

        <Button onClick={handleDownload} disabled={isExporting} className="w-full md:w-auto rounded-xl px-4 py-2.5 font-bold text-sm">
          {isExporting ? <Loader2 className="animate-spin mr-2" size={16}/> : <Download className="mr-2" size={16}/>}
          บันทึกรูปภาพ
        </Button>
      </div>

      {/* Exportable Area */}
      <div className="overflow-x-auto">
        <div 
          ref={printRef}
          className="w-full min-w-[800px] bg-slate-50/50 rounded-3xl border border-slate-200 p-6 md:p-8"
        >
          {/* Header Content */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
                   <Building2 size={28} strokeWidth={2} />
                </div>
                <div>
                   <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">
                      {selectedProject.name}
                   </h1>
                   <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mt-1.5">
                      <Badge color={selectedProject.status === 'active' ? 'green' : 'yellow'} className="px-2 py-0.5 text-[10px]">
                         {selectedProject.status === 'active' ? 'Active' : 'Planning'}
                      </Badge>
                      <span>•</span>
                      <span>Started {new Date(selectedProject.startDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                   </div>
                </div>
             </div>
             
             <div className="text-left md:text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Financial Report</p>
                <p className="text-lg font-extrabold text-slate-800">{filterMonth ? formatMonthYear(filterMonth) : 'All Time Overview'}</p>
             </div>
          </div>

          {/* Key Metrics Grid */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
               <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-slate-500">
                     <DollarSign size={16} className="text-indigo-500" />
                     <p className="text-xs font-bold uppercase tracking-wider">Funds Raised</p>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-800 tracking-tight">{formatMoney(stats.investment)}</p>
               </div>

               <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-slate-500">
                     <TrendingUp size={16} className="text-emerald-500" />
                     <p className="text-xs font-bold uppercase tracking-wider">Total Income</p>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600 tracking-tight">{formatMoney(stats.income)}</p>
               </div>

               <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-slate-500">
                     <TrendingDown size={16} className="text-rose-500" />
                     <p className="text-xs font-bold uppercase tracking-wider">Total Expenses</p>
                  </div>
                  <p className="text-2xl font-extrabold text-rose-600 tracking-tight">{formatMoney(stats.expense)}</p>
               </div>

               <div className={`p-5 rounded-2xl border shadow-sm ${stats.netProfit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2 text-slate-600">
                        <Activity size={16} className={stats.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'} />
                        <p className="text-xs font-bold uppercase tracking-wider">Net Profit</p>
                     </div>
                     {stats.investment > 0 && (
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${stats.roi >= 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                           ROI {stats.roi > 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                        </div>
                     )}
                  </div>
                  <p className={`text-2xl font-extrabold tracking-tight ${stats.netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                     {stats.netProfit > 0 ? '+' : ''}{formatMoney(stats.netProfit)}
                  </p>
               </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             {/* Bar Chart: Income vs Expense */}
             <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm tracking-tight">
                   <BarChart2 size={18} className="text-indigo-500"/>
                   ภาพรวมรายรับ-รายจ่าย
                </h3>
                {stats && (stats.income > 0 || stats.expense > 0) ? (
                   <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                            <RechartsTooltip 
                               cursor={{ fill: '#F1F5F9' }}
                               formatter={(val: number) => formatMoney(val)}
                               contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                               {stats.chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                               ))}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-[220px] text-slate-400 border border-slate-100 border-dashed rounded-xl">
                      <BarChart2 size={32} className="mb-2 opacity-20"/>
                      <p className="text-sm font-medium">ไม่มีข้อมูล</p>
                   </div>
                )}
             </div>

             {/* Partner Shares Chart */}
             <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm tracking-tight">
                   <PieIcon size={18} className="text-indigo-500"/>
                   สัดส่วนผู้ลงทุน
                </h3>
                
                {stats && stats.partnerShares.length > 0 ? (
                   <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative w-full sm:w-[200px] h-[200px] shrink-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie
                                  data={stats.partnerShares}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={80}
                                  paddingAngle={3}
                                  dataKey="value"
                                  stroke="none"
                                  cornerRadius={4}
                               >
                                  {stats.partnerShares.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                               </Pie>
                               <RechartsTooltip 
                                  formatter={(val: number) => formatMoney(val)}
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                               />
                            </PieChart>
                         </ResponsiveContainer>
                         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-xl font-extrabold text-slate-800">{stats.partnerShares.length}</span>
                         </div>
                      </div>
                      
                      <div className="w-full space-y-2.5">
                         {stats.partnerShares.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                               <div className="flex items-center gap-2.5">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                                  <span className="text-xs font-bold text-slate-700">{p.name}</span>
                               </div>
                               <div className="text-right">
                                  <div className="text-xs font-extrabold text-slate-800">
                                     {((p.value / stats.investment) * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-[10px] font-medium text-slate-500">
                                     {formatMoney(p.value)}
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 border border-slate-100 border-dashed rounded-xl">
                      <PieIcon size={32} className="mb-2 opacity-20"/>
                      <p className="text-sm font-medium">ไม่มีข้อมูลการลงทุน</p>
                   </div>
                )}
             </div>
          </div>

          {/* Bottom Grid: Cross Project & Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Cross Project Balance */}
             {stats && (stats.loansGiven.length > 0 || stats.loansTaken.length > 0) && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                   <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2 text-sm tracking-tight">
                      <ArrowRightLeft size={18} className="text-indigo-500"/>
                      ยอดเงินกู้ยืมระหว่างโครงการ
                   </h3>
                   
                   <div className="space-y-4">
                      {/* Loans Given */}
                      {stats.loansGiven.length > 0 && (
                         <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                            <h4 className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                               <ArrowUpRight size={14}/>
                               เงินที่ให้โครงการอื่นยืม (Assets)
                            </h4>
                            <div className="space-y-2.5">
                               {stats.loansGiven.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm">
                                     <span className="font-semibold text-slate-700 truncate pr-4 text-xs">{item.targetName}</span>
                                     <span className="font-extrabold text-emerald-600 whitespace-nowrap">{formatMoney(item.amount)}</span>
                                  </div>
                               ))}
                               <div className="pt-2.5 mt-2.5 border-t border-emerald-100 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Assets</span>
                                  <span className="font-extrabold text-slate-800 text-sm">{formatMoney(stats.loansGiven.reduce((s,i)=>s+i.amount,0))}</span>
                               </div>
                            </div>
                         </div>
                      )}

                      {/* Loans Taken */}
                      {stats.loansTaken.length > 0 && (
                         <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100">
                            <h4 className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                               <ArrowDownLeft size={14}/>
                               เงินที่ยืมโครงการอื่นมา (Liabilities)
                            </h4>
                            <div className="space-y-2.5">
                               {stats.loansTaken.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm">
                                     <span className="font-semibold text-slate-700 truncate pr-4 text-xs">{item.sourceName}</span>
                                     <span className="font-extrabold text-rose-500 whitespace-nowrap">{formatMoney(item.amount)}</span>
                                  </div>
                               ))}
                               <div className="pt-2.5 mt-2.5 border-t border-rose-100 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Liabilities</span>
                                  <span className="font-extrabold text-slate-800 text-sm">{formatMoney(stats.loansTaken.reduce((s,i)=>s+i.amount,0))}</span>
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                </div>
             )}

             {/* Recent Transactions */}
             <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm ${(!stats || (stats.loansGiven.length === 0 && stats.loansTaken.length === 0)) ? 'lg:col-span-2' : ''}`}>
                <div className="flex justify-between items-center mb-5">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm tracking-tight">
                      <TrendingUp size={18} className="text-indigo-500"/>
                      รายการล่าสุด
                   </h3>
                   {filterMonth && (
                      <Badge color="indigo" className="px-2 py-0.5 text-[10px]">{formatMonthYear(filterMonth)}</Badge>
                   )}
                </div>
                
                {stats && stats.recentTx.length > 0 ? (
                   <div className="space-y-2">
                      {stats.recentTx.map(t => (
                         <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors">
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                  t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' :
                                  t.type === TransactionType.EXPENSE ? 'bg-rose-100 text-rose-600' :
                                  'bg-indigo-100 text-indigo-600'
                               }`}>
                                  {t.type === TransactionType.INCOME ? '+' : t.type === TransactionType.EXPENSE ? '-' : '$'}
                               </div>
                               <div>
                                  <p className="text-xs font-bold text-slate-800 truncate max-w-[150px] sm:max-w-[200px]">
                                     {t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 mt-0.5">
                                     <span>{new Date(t.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                     {t.partnerId && (
                                        <>
                                           <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                           <span className="text-indigo-500 truncate max-w-[80px]">{data.partners.find(p => p.id === t.partnerId)?.name}</span>
                                        </>
                                     )}
                                  </div>
                               </div>
                            </div>
                            <span className={`text-sm font-extrabold tracking-tight ${
                               t.type === TransactionType.INCOME ? 'text-emerald-600' :
                               t.type === TransactionType.EXPENSE ? 'text-rose-600' :
                               'text-indigo-600'
                            }`}>
                               {t.type === TransactionType.EXPENSE ? '-' : '+'}{formatMoney(t.amount)}
                            </span>
                         </div>
                      ))}
                      {stats.count > 8 && (
                         <div className="pt-2 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               ...และอีก {stats.count - 8} รายการ
                            </p>
                         </div>
                      )}
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-48 text-slate-400 border border-slate-100 border-dashed rounded-xl">
                      <Activity size={32} className="mb-2 opacity-20"/>
                      <p className="text-sm font-medium">ไม่มีรายการเคลื่อนไหว</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};