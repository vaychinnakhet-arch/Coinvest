import React, { useRef, useState, useMemo } from 'react';
import { AppState, TransactionType, Transaction } from '../types';
import { Button, Badge } from './ui/Components';
import { Download, Filter, X, Building2, TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Calendar, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import html2canvas from 'html2canvas';

interface ProjectSummaryProps {
  data: AppState;
}

const COLORS = ['#818CF8', '#34D399', '#F472B6', '#FBBF24', '#60A5FA', '#A78BFA'];

export const ProjectSummary: React.FC<ProjectSummaryProps> = ({ data }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(data.projects.length > 0 ? data.projects[0].id : '');
  const [filterMonth, setFilterMonth] = useState<string>(''); // Format: YYYY-MM

  // Helper: Format Currency
  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount);

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
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          // Fix gradient text for capture
          const gradientTexts = clonedDoc.querySelectorAll('.bg-clip-text');
          gradientTexts.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.classList.remove('bg-clip-text', 'text-transparent', 'bg-gradient-to-r');
            htmlEl.style.color = '#4F46E5';
          });
          
          // Fix Recharts responsive container often rendering badly in capture
          // We rely on the windowWidth setting to force layout
        }
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

  // --- Calculation Logic ---
  const stats = useMemo(() => {
    if (!selectedProjectId) return null;

    let transactions = data.transactions.filter(t => t.projectId === selectedProjectId);

    // Apply Month Filter if exists
    if (filterMonth) {
      transactions = transactions.filter(t => t.date.startsWith(filterMonth));
    }

    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    const investment = transactions.filter(t => t.type === TransactionType.INVESTMENT).reduce((s, t) => s + t.amount, 0);
    const netProfit = income - expense;
    
    // ROI Calculation (Net Profit / Investment) * 100
    // Note: If investment is 0, ROI is 0 or infinity. Handling safely.
    const roi = investment > 0 ? (netProfit / investment) * 100 : 0;

    // Partner Share in THIS project
    const partnerShares = data.partners.map(p => {
      const invested = transactions
        .filter(t => t.type === TransactionType.INVESTMENT && t.partnerId === p.id)
        .reduce((s, t) => s + t.amount, 0);
      
      return {
        name: p.name,
        value: invested,
        color: p.color
      };
    }).filter(p => p.value > 0);

    // Recent Activity (Top 10)
    const recentTx = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    return {
      income,
      expense,
      investment,
      netProfit,
      roi,
      partnerShares,
      recentTx,
      count: transactions.length
    };
  }, [data, selectedProjectId, filterMonth]);

  const selectedProject = data.projects.find(p => p.id === selectedProjectId);

  if (!selectedProject) {
    return (
       <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <Building2 size={64} className="mb-4 opacity-20"/>
          <p>กรุณาเลือกหรือสร้างโครงการก่อน</p>
       </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
           <div className="space-y-1 w-full md:w-64">
              <label className="text-xs font-semibold text-slate-500 ml-1">เลือกโครงการ</label>
              <select 
                value={selectedProjectId} 
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 outline-none font-medium"
              >
                {data.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
           </div>
           
           <div className="space-y-1 w-full md:w-48">
              <label className="text-xs font-semibold text-slate-500 ml-1">เดือน/ปี (Optional)</label>
              <div className="relative">
                 <input 
                   type="month"
                   value={filterMonth}
                   onChange={e => setFilterMonth(e.target.value)}
                   className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 outline-none pl-9"
                 />
                 <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              </div>
           </div>

           {(filterMonth) && (
              <div className="flex items-end pb-1">
                 <button onClick={() => setFilterMonth('')} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                    <X size={18}/>
                 </button>
              </div>
           )}
        </div>

        <Button onClick={handleDownload} disabled={isExporting} variant="secondary" className="w-full md:w-auto">
          {isExporting ? <Loader2 className="animate-spin mr-2" size={18}/> : <Download className="mr-2" size={18}/>}
          บันทึกรูปภาพ
        </Button>
      </div>

      {/* Exportable Area */}
      <div className="overflow-x-auto pb-4">
        <div 
          ref={printRef}
          className="min-w-[800px] max-w-5xl mx-auto bg-slate-50 p-8 rounded-3xl border border-slate-200 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
             <div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                      <Building2 size={28} />
                   </div>
                   <div>
                      <h1 className="text-3xl font-bold text-slate-800">{selectedProject.name}</h1>
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                         <Badge color={selectedProject.status === 'active' ? 'green' : 'yellow'}>
                            {selectedProject.status === 'active' ? 'Active Project' : 'Planning'}
                         </Badge>
                         <span>•</span>
                         <span>Started: {new Date(selectedProject.startDate).toLocaleDateString('th-TH')}</span>
                      </div>
                   </div>
                </div>
                {selectedProject.description && (
                  <p className="text-slate-500 mt-2 max-w-lg">{selectedProject.description}</p>
                )}
             </div>
             
             <div className="text-right">
                <p className="text-sm text-slate-500 font-medium">Financial Statement</p>
                <p className="text-indigo-600 font-bold text-lg">{filterMonth ? formatMonthYear(filterMonth) : 'All Time'}</p>
                <p className="text-xs text-slate-400 mt-1">Generated by CoInvest</p>
             </div>
          </div>

          {/* Key Metrics Grid */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-8">
               <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                     <DollarSign size={14}/> Funds Raised
                  </p>
                  <p className="text-2xl font-bold text-slate-800">{formatMoney(stats.investment)}</p>
               </div>
               <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                     <TrendingUp size={14}/> Total Income
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">{formatMoney(stats.income)}</p>
               </div>
               <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-rose-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                     <TrendingDown size={14}/> Total Expenses
                  </p>
                  <p className="text-2xl font-bold text-rose-600">{formatMoney(stats.expense)}</p>
               </div>
               <div className={`p-5 rounded-2xl border shadow-sm ${stats.netProfit >= 0 ? 'bg-white border-slate-100' : 'bg-rose-50 border-rose-100'}`}>
                  <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                     <PieIcon size={14}/> Net Profit
                  </p>
                  <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                     {formatMoney(stats.netProfit)}
                  </p>
                  {stats.investment > 0 && (
                     <div className="mt-2 text-xs font-medium px-2 py-1 rounded bg-slate-100 inline-block">
                        ROI: <span className={stats.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{stats.roi.toFixed(2)}%</span>
                     </div>
                  )}
               </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
             {/* Left Col: Partner Shares */}
             <div className="col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                   <PieIcon size={18} className="text-indigo-500"/>
                   สัดส่วนผู้ลงทุน
                </h3>
                
                {stats && stats.partnerShares.length > 0 ? (
                   <div className="flex-1 min-h-[250px] flex flex-col items-center justify-center">
                      <ResponsiveContainer width="100%" height={200}>
                         <PieChart>
                            <Pie
                               data={stats.partnerShares}
                               cx="50%"
                               cy="50%"
                               innerRadius={50}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="value"
                            >
                               {stats.partnerShares.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                               ))}
                            </Pie>
                            <RechartsTooltip formatter={(val: number) => formatMoney(val)} />
                         </PieChart>
                      </ResponsiveContainer>
                      
                      <div className="w-full mt-4 space-y-2">
                         {stats.partnerShares.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                               <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                                  <span className="text-slate-600">{p.name}</span>
                               </div>
                               <span className="font-medium text-slate-800">
                                  {((p.value / stats.investment) * 100).toFixed(1)}%
                               </span>
                            </div>
                         ))}
                      </div>
                   </div>
                ) : (
                   <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">
                      ไม่มีข้อมูลการลงทุน
                   </div>
                )}
             </div>

             {/* Right Col: Recent Transactions */}
             <div className="col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                   <TrendingUp size={18} className="text-indigo-500"/>
                   รายการล่าสุด {filterMonth ? `(${formatMonthYear(filterMonth)})` : ''}
                </h3>
                
                {stats && stats.recentTx.length > 0 ? (
                   <div className="space-y-3">
                      {stats.recentTx.map(t => (
                         <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                  t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' :
                                  t.type === TransactionType.EXPENSE ? 'bg-rose-100 text-rose-600' :
                                  'bg-indigo-100 text-indigo-600'
                               }`}>
                                  {t.type === TransactionType.INCOME ? '+' : t.type === TransactionType.EXPENSE ? '-' : '$'}
                               </div>
                               <div>
                                  <p className="text-sm font-semibold text-slate-700">{t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}</p>
                                  <p className="text-xs text-slate-400">
                                     {new Date(t.date).toLocaleDateString('th-TH')}
                                     {t.partnerId && ` • ${data.partners.find(p => p.id === t.partnerId)?.name}`}
                                  </p>
                               </div>
                            </div>
                            <span className={`font-bold ${
                               t.type === TransactionType.INCOME ? 'text-emerald-600' :
                               t.type === TransactionType.EXPENSE ? 'text-rose-600' :
                               'text-indigo-600'
                            }`}>
                               {t.type === TransactionType.EXPENSE ? '-' : '+'}{t.amount.toLocaleString()}
                            </span>
                         </div>
                      ))}
                      {stats.count > 8 && (
                         <p className="text-center text-xs text-slate-400 mt-2">
                            ...และอีก {stats.count - 8} รายการ
                         </p>
                      )}
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                      <p>ไม่มีรายการเคลื่อนไหว</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};