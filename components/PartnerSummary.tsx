import React, { useRef, useState, useMemo } from 'react';
import { AppState, TransactionType, Transaction } from '../types';
import { Button } from './ui/Components';
import { Download, Calendar, Wallet, TrendingUp, Loader2, FileText, PieChart, Filter, X } from 'lucide-react';
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
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount);

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
        // Force desktop width to ensure layout consistency
        windowWidth: 1600, 
        // Reset scroll position for the capture context to avoid cut-off content
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // FIX: html2canvas does not support 'background-clip: text' well.
          // We replace gradient text with solid color in the cloned document for export.
          const gradientTexts = clonedDoc.querySelectorAll('.bg-clip-text');
          gradientTexts.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.classList.remove('bg-clip-text', 'text-transparent', 'bg-gradient-to-r');
            htmlEl.style.color = '#4F46E5'; // Indigo-600
            htmlEl.style.backgroundImage = 'none';
          });

          // FIX: Remove shadows which can cause artifacts
          const container = clonedDoc.getElementById('export-container');
          if (container) {
             container.style.boxShadow = 'none';
             container.style.margin = '0 auto';
             // Force white background on the container itself to be safe
             container.style.backgroundColor = '#F8FAFC';
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
  const globalTotalInvestment = data.transactions.reduce((sum, t) => {
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
      // Logic: Include both explicit INVESTMENT and EXPENSE paid by partner (Direct)
      let investments = data.transactions.filter(t => 
        t.partnerId === partner.id && 
        (t.type === TransactionType.INVESTMENT || t.type === TransactionType.EXPENSE)
      );
      
      // Apply Project Filter
      if (filterProject !== 'all') {
        investments = investments.filter(t => t.projectId === filterProject);
      }

      // Apply Month Filter
      if (filterMonth) {
        investments = investments.filter(t => t.date.startsWith(filterMonth));
      }

      investments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const totalInvested = investments.reduce((sum, t) => sum + t.amount, 0);
      
      // Ownership based on GLOBAL total
      const globalPartnerInvested = data.transactions
        .filter(t => t.partnerId === partner.id && (t.type === TransactionType.INVESTMENT || t.type === TransactionType.EXPENSE))
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

  return (
    <div className="space-y-6">
      {/* Filters & Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <Filter size={20} className="text-indigo-500"/> ตัวกรองรายงาน
              </h2>
              <p className="text-sm text-slate-500">เลือกเงื่อนไขเพื่อสร้าง Statement ที่ต้องการ</p>
           </div>
           <Button onClick={handleDownload} disabled={isExporting} variant="primary">
            {isExporting ? <Loader2 className="animate-spin mr-2" size={18}/> : <Download className="mr-2" size={18}/>}
            บันทึกเป็นรูปภาพ
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-50">
           {/* Partner Filter */}
           <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">หุ้นส่วน</label>
              <select 
                value={filterPartner} 
                onChange={e => setFilterPartner(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="all">แสดงทั้งหมด</option>
                {data.partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
           </div>

           {/* Project Filter */}
           <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">โครงการ</label>
              <select 
                value={filterProject} 
                onChange={e => setFilterProject(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="all">ทุกโครงการ</option>
                {data.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
           </div>

           {/* Month Filter */}
           <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">เดือน/ปี</label>
              <input 
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
              />
           </div>

           {/* Reset */}
           <div className="flex items-end">
              <button 
                onClick={() => { setFilterPartner('all'); setFilterProject('all'); setFilterMonth(''); }}
                className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm hover:bg-slate-50 hover:text-rose-500 transition-colors flex items-center justify-center gap-2"
              >
                <X size={16}/> รีเซ็ต
              </button>
           </div>
        </div>
      </div>

      {/* Export Container */}
      <div className="overflow-x-auto pb-4">
        <div 
          ref={printRef}
          id="export-container"
          className="min-w-[800px] bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
          style={{ width: '1000px', margin: '0 auto' }}
        >
           {/* Decorative BG */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"></div>
          
          {/* Dynamic Header */}
          <div className="text-center relative z-10 mb-8">
             <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-indigo-200 mb-3 text-white">
                <PieChart size={28} />
             </div>
             <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Statement of Investment</h1>
             <div className="flex justify-center gap-2 mt-2 text-indigo-600 font-medium bg-indigo-50 inline-flex px-4 py-1 rounded-full mx-auto w-fit border border-indigo-100">
                <span>
                  {filterPartner !== 'all' 
                    ? `คุณ ${data.partners.find(p => p.id === filterPartner)?.name}` 
                    : 'All Partners'}
                </span>
                <span>•</span>
                <span>{filterMonth ? formatMonthYear(filterMonth) : 'All Time'}</span>
                {filterProject !== 'all' && (
                  <>
                    <span>•</span>
                    <span>{data.projects.find(p => p.id === filterProject)?.name}</span>
                  </>
                )}
             </div>
          </div>

          {/* Content Grid - Adjusts layout based on partner count */}
          <div className={`${filteredData.length === 1 ? 'max-w-2xl mx-auto' : 'grid grid-cols-2 gap-6'} relative z-10`}>
            {filteredData.map((partner) => (
              <div 
                key={partner.id} 
                className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col h-full animate-in fade-in duration-500"
              >
                {/* Partner Header */}
                <div className="p-5 border-b border-slate-50 flex items-center justify-between" style={{ backgroundColor: `${partner.color}08` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm bg-white ring-2 ring-offset-2 ring-transparent" style={{ borderColor: partner.color }}>
                      {partner.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{partner.name}</h3>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                           {partner.sharePercent.toFixed(1)}% Share
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium mb-1">ยอดในช่วงนี้</p>
                    <p className="text-xl font-bold" style={{ color: partner.color }}>
                       {formatMoney(partner.totalInvested)}
                    </p>
                  </div>
                </div>

                {/* Investments Body */}
                <div className="p-5 flex-1 bg-white min-h-[200px]">
                  {Object.keys(partner.investmentsByProject).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(partner.investmentsByProject).map(([pid, invs]) => {
                         const project = data.projects.find(p => p.id === pid);
                         const projectTotal = (invs as Transaction[]).reduce((s, i) => s + i.amount, 0);

                         return (
                           <div key={pid} className="rounded-xl border border-slate-100 overflow-hidden">
                              <div className="bg-slate-50 px-3 py-2 flex justify-between items-center border-b border-slate-100">
                                 <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                    <span className="text-sm font-bold text-slate-700">{project?.name || 'Unknown Project'}</span>
                                 </div>
                                 <span className="text-xs font-semibold text-slate-500">{formatMoney(projectTotal)}</span>
                              </div>
                              <div className="p-3 bg-white space-y-2">
                                 {(invs as Transaction[]).map(inv => (
                                   <div key={inv.id} className="flex justify-between items-baseline text-xs group">
                                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 flex-1 pr-4">
                                         <span className="text-slate-400 font-mono w-16 shrink-0">{formatDate(inv.date)}</span>
                                         <span className="text-slate-700 font-medium">{inv.note || '-'}</span>
                                         {inv.type === TransactionType.EXPENSE && (
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">จ่ายตรง</span>
                                         )}
                                      </div>
                                      <span className="font-semibold text-indigo-600 whitespace-nowrap">
                                        +{inv.amount.toLocaleString()}
                                      </span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8">
                       <FileText size={32} className="mb-2 opacity-50"/>
                       <p className="text-sm">ไม่มีรายการในช่วงที่เลือก</p>
                    </div>
                  )}
                </div>
                
                <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
                  <p className="text-[10px] text-slate-400">CoInvest • {new Date().getFullYear()}</p>
                </div>
              </div>
            ))}
            
            {filteredData.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                    <Filter size={48} className="mx-auto mb-3 opacity-30"/>
                    <p className="text-lg">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                    <p className="text-sm">ลองปรับเปลี่ยนตัวกรอง วันที่ หรือ โครงการ</p>
                </div>
            )}
          </div>

          {/* Footer Summary (Contextual) */}
          <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center relative z-10">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                   <Wallet size={24} />
                </div>
                <div>
                   <p className="text-sm text-slate-500 font-medium">รวมยอดตามเงื่อนไข (Filtered Total)</p>
                   <p className="text-xs text-slate-400">
                     {filterPartner !== 'all' ? 'Specific Partner' : `All ${filteredData.length} Partners`}
                   </p>
                </div>
             </div>
             <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                {formatMoney(displayedTotal)}
             </p>
          </div>
          
          <div className="absolute bottom-4 left-0 w-full text-center opacity-30 pointer-events-none">
             <span className="text-slate-300 text-xs font-medium uppercase tracking-widest">Generated by CoInvest</span>
          </div>
        </div>
      </div>
    </div>
  );
};