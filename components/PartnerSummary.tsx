import React, { useRef, useState, useMemo } from 'react';
import { AppState, TransactionType, Transaction } from '../types';
import { Button, Card, Badge } from './ui/Components';
import { Download, Filter, X, PieChart, Wallet, Loader2, FileText, TrendingUp, Building2, Calendar, User, ChevronRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';

interface PartnerSummaryProps {
  data: AppState;
}

export const PartnerSummary: React.FC<PartnerSummaryProps> = ({ data }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [filterPartner, setFilterPartner] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>(''); // Format: YYYY-MM

  // Helper to format currency
  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

  // Helper to format date
  const formatDate = (dateStr: string) => 
    new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(dateStr));

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
      // Small delay to ensure styles are settled
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // High resolution for Retina
        backgroundColor: '#F8FAFC',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1920, 
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const gradientTexts = clonedDoc.querySelectorAll('.bg-clip-text');
          gradientTexts.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.classList.remove('bg-clip-text', 'text-transparent', 'bg-gradient-to-r');
            htmlEl.style.color = '#4F46E5'; // Indigo-600
            htmlEl.style.backgroundImage = 'none';
          });

          const container = clonedDoc.getElementById('export-container');
          if (container) {
             container.style.boxShadow = 'none';
             container.style.margin = '0 auto';
             container.style.backgroundColor = '#F8FAFC';
             container.style.width = '1600px';
             container.style.maxWidth = 'none';
          }
        }
      });
      
      const link = document.createElement('a');
      const partnerName = filterPartner !== 'all' ? data.partners.find(p => p.id === filterPartner)?.name : 'All';
      const monthStr = filterMonth ? `-${filterMonth}` : '';
      link.download = `CoInvest-Statement-${partnerName}${monthStr}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("ไม่สามารถบันทึกรูปภาพได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  // 1. Calculate Total Pool (including direct expenses paid by partners)
  // Helper to detect internal transfers
  const isInternalTransfer = (note: string) => {
    if (!note) return false;
    return /(?:\(ให้ยืม\/โอนไปโครงการ:|\(รับเงินยืม\/โอนจากโครงการ:|\(ปรับปรุงรายการ\) โอนไปโครงการ:|\(ปรับปรุงรายการ\) รับเงินโอนจากโครงการ:)/.test(note);
  };

  const globalTotalInvestment = data.transactions.reduce((sum, t) => {
    if (isInternalTransfer(t.note)) return sum;
    if (t.type === TransactionType.INVESTMENT) return sum + t.amount;
    if (t.type === TransactionType.EXPENSE && t.partnerId) return sum + t.amount;
    return sum;
  }, 0);

  // 2. Filter Logic
  const filteredData = useMemo(() => {
    // Filter Partners
    const targetPartners = filterPartner === 'all' 
      ? data.partners 
      : data.partners.filter(p => p.id === filterPartner);

    return targetPartners.map(partner => {
      // Filter Transactions for this partner
      let investments = data.transactions.filter(t => 
        t.partnerId === partner.id && 
        (t.type === TransactionType.INVESTMENT || t.type === TransactionType.EXPENSE) &&
        !isInternalTransfer(t.note)
      );
      
      // Apply Project Filter
      if (filterProject !== 'all') {
        investments = investments.filter(t => t.projectId === filterProject);
      }

      // Apply Month Filter
      if (filterMonth) {
        investments = investments.filter(t => t.date.startsWith(filterMonth));
      }

      investments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
      
      const totalInvested = investments.reduce((sum, t) => sum + t.amount, 0);
      
      // Ownership based on GLOBAL total
      const globalPartnerInvested = data.transactions
        .filter(t => t.partnerId === partner.id && (t.type === TransactionType.INVESTMENT || t.type === TransactionType.EXPENSE) && !isInternalTransfer(t.note))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const sharePercent = globalTotalInvestment > 0 ? (globalPartnerInvested / globalTotalInvestment) * 100 : 0;

      // Group by Project
      const investmentsByProject = investments.reduce((acc, inv) => {
        const pid = inv.projectId;
        if (!acc[pid]) acc[pid] = [];
        acc[pid].push(inv);
        return acc;
      }, {} as Record<string, Transaction[]>);

      return {
        ...partner,
        investments,
        investmentsByProject,
        totalInvested,
        sharePercent,
        hasData: investments.length > 0
      };
    }).filter(p => p.hasData || filterPartner !== 'all');
  }, [data, filterPartner, filterProject, filterMonth, globalTotalInvestment]);

  const displayedTotal = filteredData.reduce((acc, p) => acc + p.totalInvested, 0);

  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ... (existing helper functions)

  // Helper to get expanded partner data
  const expandedPartnerData = useMemo(() => {
    if (!expandedPartnerId) return null;
    return filteredData.find(p => p.id === expandedPartnerId);
  }, [expandedPartnerId, filteredData]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* Detail Modal Overlay */}
      {expandedPartnerId && expandedPartnerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ring-1 ring-slate-200 bg-white">
                  {expandedPartnerData.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{expandedPartnerData.name}</h3>
                  <p className="text-sm text-slate-500">รายละเอียดการลงทุน</p>
                </div>
              </div>
              <button 
                onClick={() => setExpandedPartnerId(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content (Scrollable) */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Summary Stats in Modal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">เงินลงทุนรวม</p>
                  <p className="text-2xl font-bold text-indigo-700">{formatMoney(expandedPartnerData.totalInvested)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">จำนวนรายการ</p>
                  <p className="text-2xl font-bold text-slate-700">{expandedPartnerData.investments.length} รายการ</p>
                </div>
              </div>

              {/* Transaction List */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-slate-400"/> รายการเดินบัญชี
                </h4>
                <div className="space-y-3">
                  {expandedPartnerData.investments.map((inv, idx) => {
                    const project = data.projects.find(p => p.id === inv.projectId);
                    return (
                      <div key={inv.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all bg-white group">
                        {/* Date Box */}
                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                          <span className="text-xs font-bold text-slate-500 uppercase">{new Date(inv.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="text-xl font-bold text-slate-800">{new Date(inv.date).getDate()}</span>
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start">
                              <h5 className="font-bold text-slate-800 truncate pr-2">{inv.note || 'เงินลงทุน'}</h5>
                              <span className={`font-bold whitespace-nowrap ${inv.type === TransactionType.EXPENSE ? 'text-rose-600' : 'text-indigo-600'}`}>
                                {inv.type === TransactionType.EXPENSE ? '-' : '+'}{formatMoney(inv.amount)}
                              </span>
                           </div>
                           <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                                <Building2 size={10}/> {project?.name}
                              </span>
                              {inv.type === TransactionType.EXPENSE && (
                                <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">จ่ายค่าใช้จ่าย</span>
                              )}
                           </div>
                           {/* Receipt Image Preview if exists */}
                           {inv.receipt && (
                             <div className="mt-3">
                               <img src={inv.receipt} alt="Receipt" className="h-16 w-auto rounded-lg border border-slate-200 object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(inv.receipt, '_blank')} />
                             </div>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-400">
              Showing all {expandedPartnerData.investments.length} transactions
            </div>
          </div>
        </div>
      )}

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">สรุปยอดหุ้นส่วน</h2>
          <p className="text-slate-500 text-sm mt-1">ติดตามเงินลงทุนและสัดส่วนของผู้ถือหุ้น</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={handleDownload} disabled={isExporting} variant="outline" className="bg-white hover:bg-slate-50 text-slate-600 border-slate-200">
            {isExporting ? <Loader2 className="animate-spin mr-2" size={16}/> : <Download className="mr-2" size={16}/>}
            บันทึกรูปภาพ
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="bg-white border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 text-slate-700 font-bold mb-4">
           <Filter size={18} className="text-indigo-500"/> ตัวกรองข้อมูล
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">หุ้นส่วน</label>
              <select 
                value={filterPartner} 
                onChange={e => setFilterPartner(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
              >
                <option value="all">แสดงทั้งหมด</option>
                {data.partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
           </div>
           <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">โครงการ</label>
              <select 
                value={filterProject} 
                onChange={e => setFilterProject(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
              >
                <option value="all">ทุกโครงการ</option>
                {data.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
           </div>
           <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">เดือน/ปี</label>
              <input 
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
              />
           </div>
           <div className="flex items-end">
              <button 
                onClick={() => { setFilterPartner('all'); setFilterProject('all'); setFilterMonth(''); }}
                className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <X size={16}/> รีเซ็ต
              </button>
           </div>
        </div>
      </Card>

      {/* Export Area */}
      <div className="overflow-x-auto pb-4">
        <div 
          ref={printRef}
          id="export-container"
          className="w-full mx-auto bg-slate-50 p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden min-h-[600px]"
        >
           {/* Decorative Header */}
           <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-600 to-indigo-800"></div>
           <div className="absolute top-0 left-0 w-full h-32 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           
           <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-end gap-6 text-white">
              <div>
                 <div className="flex items-center gap-3 mb-2 opacity-90">
                    <Building2 size={20}/>
                    <span className="text-sm font-medium tracking-wider uppercase">CoInvest Report</span>
                 </div>
                 <h1 className="text-3xl md:text-4xl font-bold tracking-tight">สรุปยอดเงินลงทุน</h1>
                 <p className="text-indigo-100 mt-1">Statement of Investment & Partnership</p>
              </div>
              <div className="text-right bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                 <p className="text-xs text-indigo-100 mb-1">ยอดรวมตามเงื่อนไข (Total)</p>
                 <p className="text-3xl font-bold">{formatMoney(displayedTotal)}</p>
              </div>
           </div>

           {/* Content Grid */}
           <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             {filteredData.map((partner) => (
               <div 
                 key={partner.id} 
                 className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full group hover:shadow-md transition-all duration-300"
               >
                 {/* Card Header */}
                 <div className="p-6 border-b border-slate-50 bg-gradient-to-br from-white to-slate-50/50">
                    <div className="flex justify-between items-start mb-4">
                       <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ring-4 ring-white" style={{ backgroundColor: `${partner.color}15` }}>
                          {partner.avatar}
                       </div>
                       <Badge className="bg-slate-900 text-white border-transparent shadow-sm">
                          {partner.sharePercent.toFixed(1)}% Share
                       </Badge>
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-slate-800">{partner.name}</h3>
                       <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <User size={14}/> หุ้นส่วน (Partner)
                       </p>
                    </div>
                 </div>

                 {/* Key Stat */}
                 <div className="px-6 py-4 bg-white">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">เงินลงทุนสะสม (Invested)</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-bold" style={{ color: partner.color }}>{formatMoney(partner.totalInvested)}</span>
                       <span className="text-xs text-slate-400 font-medium">บาท</span>
                    </div>
                 </div>

                 {/* Project Breakdown - Detailed List */}
                 <div className="flex-1 bg-white p-5 border-t border-slate-100 space-y-6">
                    {Object.keys(partner.investmentsByProject).length > 0 ? (
                      Object.entries(partner.investmentsByProject)
                        .sort(([pidA], [pidB]) => {
                           // Sort by Project Name to ensure consistency across cards
                           const projectA = data.projects.find(p => p.id === pidA)?.name || '';
                           const projectB = data.projects.find(p => p.id === pidB)?.name || '';
                           return projectA.localeCompare(projectB);
                        })
                        .map(([pid, invs]) => {
                         const project = data.projects.find(p => p.id === pid);
                         const projectTotal = (invs as Transaction[]).reduce((s, i) => s + i.amount, 0);
                         const collapseKey = `${partner.id}-${pid}`;
                         const isCollapsed = collapsedItems[collapseKey];

                         return (
                           <div key={pid} className="space-y-3">
                              {/* Project Header */}
                              <div 
                                className="flex justify-between items-center py-2 border-b border-slate-100 bg-slate-50/50 px-3 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                onClick={() => toggleCollapse(collapseKey)}
                              >
                                 <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isCollapsed ? 'bg-slate-300' : 'bg-indigo-500'}`}></div>
                                    <h4 className="font-bold text-slate-700 text-sm truncate max-w-[150px] sm:max-w-[200px]">{project?.name || 'Unknown Project'}</h4>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 text-sm">{formatMoney(projectTotal)}</span>
                                    {isCollapsed ? <ChevronRight size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                                 </div>
                              </div>

                              {/* Transactions List */}
                              {!isCollapsed && (
                                <div className="space-y-1 px-1 animate-in slide-in-from-top-2 duration-200">
                                   {(invs as Transaction[]).map(inv => (
                                      <div key={inv.id} className="flex items-start text-xs py-1.5 hover:bg-slate-50 rounded px-2 -mx-2 transition-colors group">
                                         <div className="w-20 shrink-0 text-slate-400 font-medium pt-0.5">
                                            {formatDate(inv.date)}
                                         </div>
                                         <div className="flex-1 min-w-0 pr-4">
                                            <div className="text-slate-700 font-medium break-words leading-relaxed">
                                               {inv.note || 'เงินลงทุน'}
                                               {inv.type === TransactionType.EXPENSE && (
                                                  <span className="inline-block ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded border border-slate-200 whitespace-nowrap">
                                                     จ่ายตรง
                                                  </span>
                                               )}
                                            </div>
                                         </div>
                                         <div className={`font-bold shrink-0 pt-0.5 ${inv.type === TransactionType.EXPENSE ? 'text-rose-600' : 'text-indigo-600'}`}>
                                            {inv.type === TransactionType.EXPENSE ? '' : '+'}{formatMoney(inv.amount)}
                                         </div>
                                      </div>
                                   ))}
                                </div>
                              )}
                           </div>
                         )
                      })
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl">
                         <Wallet size={24} className="mb-2 opacity-50"/>
                         <span className="text-xs">ไม่มีรายการลงทุน</span>
                      </div>
                    )}
                 </div>

                 {/* Footer Date */}
                 <div 
                   className="px-6 py-3 bg-white border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                   onClick={() => setExpandedPartnerId(partner.id)}
                 >
                    <span className="flex items-center gap-1 text-indigo-500 font-medium">
                      ดูรายละเอียด <ChevronRight size={12}/>
                    </span>
                    <div className="flex items-center gap-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                       <span className="text-emerald-600 font-medium">Active</span>
                    </div>
                 </div>
               </div>
             ))}
           </div>

           {/* Empty State */}
           {filteredData.length === 0 && (
              <div className="relative z-10 bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto mt-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                     <Filter size={32}/>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">ไม่พบข้อมูล</h3>
                  <p className="text-slate-500 mt-1">กรุณาลองปรับเปลี่ยนตัวกรองใหม่อีกครั้ง</p>
              </div>
           )}

           {/* Footer Branding */}
           <div className="relative z-10 mt-12 pt-8 border-t border-slate-200 flex justify-between items-center text-slate-400 text-xs">
              <span>CoInvest - Investment Management System</span>
              <span>Page 1 of 1</span>
           </div>
        </div>
      </div>
    </div>
  );
};
