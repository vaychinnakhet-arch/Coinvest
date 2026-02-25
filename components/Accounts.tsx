import React, { useState, useMemo } from 'react';
import { AppState, TransactionType } from '../types';
import { Card, Select, Input, Button } from './ui/Components';
import { FileText, TrendingUp, TrendingDown, DollarSign, Search, Filter, Wallet, ArrowDownUp, ArrowUp, ArrowDown, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AccountsProps {
  data: AppState;
}

export const Accounts: React.FC<AccountsProps> = ({ data }) => {
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isExporting, setIsExporting] = useState(false);

  // Process Transactions: Filter -> Sort Asc -> Calculate Balance -> Filter Date -> Sort Desc/Asc
  const processedTransactions = useMemo(() => {
    // 1. Initial Filter (Project, Type, Search) - NOT Date yet
    let filtered = data.transactions.filter(t => {
      // Project Filter
      if (filterProject !== 'all' && t.projectId !== filterProject) return false;
      
      // Type Filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const noteMatch = t.note?.toLowerCase().includes(query);
        const amountMatch = t.amount.toString().includes(query);
        if (!noteMatch && !amountMatch) return false;
      }

      return true;
    });

    // 2. Sort by Date Ascending (Oldest First) for accurate running balance calculation
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Calculate Running Balance
    let runningBalance = 0;
    const withBalance = filtered.map(t => {
      const isExpense = t.type === TransactionType.EXPENSE;
      // Investment and Income are positive, Expense is negative
      if (isExpense) {
        runningBalance -= t.amount;
      } else {
        runningBalance += t.amount;
      }
      return { ...t, balance: runningBalance };
    });

    // 4. Filter by Date Range (if applied)
    let result = withBalance;
    if (startDate) {
      result = result.filter(t => t.date >= startDate);
    }
    if (endDate) {
      result = result.filter(t => t.date <= endDate);
    }

    // 5. Final Sort based on user preference
    if (sortOrder === 'desc') {
      return result.reverse();
    }
    return result;
  }, [data.transactions, filterProject, filterType, startDate, endDate, searchQuery, sortOrder]);

  // Calculate Summary (based on the final view)
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let investment = 0;

    // We use the processed transactions (which respect date filters) for the summary cards
    processedTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME) income += t.amount;
      else if (t.type === TransactionType.EXPENSE) expense += t.amount;
      else if (t.type === TransactionType.INVESTMENT) investment += t.amount;
    });

    // Current Balance is the balance of the *latest* transaction in time
    let currentBalance = 0;
    if (processedTransactions.length > 0) {
        if (sortOrder === 'desc') {
            // Newest is at index 0
            currentBalance = processedTransactions[0].balance;
        } else {
            // Newest is at the end
            currentBalance = processedTransactions[processedTransactions.length - 1].balance;
        }
    }

    return { income, expense, investment, currentBalance };
  }, [processedTransactions, sortOrder]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
        const doc = new jsPDF();

        // Fetch Thai font from a reliable source (Google Fonts or GitHub Raw)
        // Using Sarabun from GitHub Raw as it's a standard Thai font
        const fontResponse = await fetch('https://raw.githubusercontent.com/cadsondemak/Sarabun/master/fonts/Sarabun-Regular.ttf');
        
        if (!fontResponse.ok) {
            throw new Error('Failed to fetch font');
        }

        const fontBlob = await fontResponse.blob();
        const reader = new FileReader();

        reader.readAsDataURL(fontBlob);
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // Remove the data URL prefix (e.g., "data:font/ttf;base64,")
            const fontBase64 = base64data.split(',')[1];

            doc.addFileToVFS('Sarabun-Regular.ttf', fontBase64);
            doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
            doc.setFont('Sarabun');

            // Title
            doc.setFontSize(18);
            doc.text('รายงานสรุปรายรับ-รายจ่าย', 105, 20, { align: 'center' });
            
            // Subtitle (Date Range / Project)
            doc.setFontSize(12);
            let subtitle = `โครงการ: ${filterProject === 'all' ? 'ทั้งหมด' : data.projects.find(p => p.id === filterProject)?.name}`;
            if (startDate || endDate) {
                subtitle += ` | วันที่: ${startDate ? new Date(startDate).toLocaleDateString('th-TH') : 'เริ่มต้น'} - ${endDate ? new Date(endDate).toLocaleDateString('th-TH') : 'ปัจจุบัน'}`;
            }
            doc.text(subtitle, 105, 30, { align: 'center' });

            // Summary Table
            doc.autoTable({
                startY: 40,
                head: [['รายการ', 'จำนวนเงิน (บาท)']],
                body: [
                    ['รายรับรวม', formatCurrency(summary.income)],
                    ['รายจ่ายรวม', formatCurrency(summary.expense)],
                    ['คงเหลือสุทธิ', formatCurrency(summary.income - summary.expense)],
                ],
                styles: { font: 'Sarabun', fontSize: 10 },
                headStyles: { fillColor: [63, 81, 181] },
            });

            // Transactions Table
            const tableColumn = ["วันที่", "รายการ", "โครงการ", "รายรับ", "รายจ่าย", "คงเหลือ"];
            const tableRows: any[] = [];

            processedTransactions.forEach(t => {
                const project = data.projects.find(p => p.id === t.projectId)?.name || '-';
                const income = t.type === TransactionType.INCOME || t.type === TransactionType.INVESTMENT ? formatCurrency(t.amount) : '-';
                const expense = t.type === TransactionType.EXPENSE ? formatCurrency(t.amount) : '-';
                const balance = formatCurrency(t.balance);

                tableRows.push([
                    new Date(t.date).toLocaleDateString('th-TH'),
                    t.note,
                    project,
                    income,
                    expense,
                    balance
                ]);
            });

            doc.autoTable({
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [tableColumn],
                body: tableRows,
                styles: { font: 'Sarabun', fontSize: 9 },
                headStyles: { fillColor: [63, 81, 181] },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 25, halign: 'right' },
                    4: { cellWidth: 25, halign: 'right' },
                    5: { cellWidth: 25, halign: 'right' },
                },
            });

            doc.save('statement_report.pdf');
            setIsExporting(false);
        };
    } catch (error) {
        console.error("Export failed", error);
        alert("ขออภัย ไม่สามารถสร้าง PDF ได้ในขณะนี้ (ไม่สามารถโหลดฟอนต์ภาษาไทยได้)");
        setIsExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('th-TH', { year: '2-digit', month: 'short', day: 'numeric' }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">บัญชีรายรับ-รายจ่าย</h2>
          <p className="text-slate-500 text-sm mt-1">รายการเดินบัญชี (Statement) และยอดคงเหลือ</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-white border-slate-100 shadow-sm !p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={20}/></div>
            <span className="text-sm font-semibold text-slate-500">รายรับ (Income)</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">+{formatCurrency(summary.income)}</h3>
        </Card>
        
        <Card className="bg-white border-slate-100 shadow-sm !p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><TrendingDown size={20}/></div>
            <span className="text-sm font-semibold text-slate-500">รายจ่าย (Expense)</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">-{formatCurrency(summary.expense)}</h3>
        </Card>

        <Card className="bg-white border-slate-100 shadow-sm !p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><DollarSign size={20}/></div>
            <span className="text-sm font-semibold text-slate-500">เงินลงทุน (Invest)</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">+{formatCurrency(summary.investment)}</h3>
        </Card>

        <Card className={`!p-6 border shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 ${summary.currentBalance >= 0 ? 'bg-slate-900 text-white border-transparent' : 'bg-rose-600 text-white border-rose-600'}`}>
          <div className="flex items-center gap-4 mb-2">
            <div className={`p-2.5 rounded-xl ${summary.currentBalance >= 0 ? 'bg-white/10 text-white' : 'bg-white/20 text-white'}`}><Wallet size={20}/></div>
            <span className={`text-sm font-semibold ${summary.currentBalance >= 0 ? 'text-slate-300' : 'text-white/90'}`}>ยอดคงเหลือ (Balance)</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(summary.currentBalance)}</h3>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200 shadow-sm p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
           <div className="flex items-center gap-2 text-slate-700 font-bold">
             <Filter size={18} className="text-indigo-500"/> ตัวกรองข้อมูล
           </div>
             <div className="flex items-center gap-2">
             <button 
               onClick={exportToPDF}
               disabled={isExporting}
               className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isExporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
               {isExporting ? 'กำลังสร้าง...' : 'ส่งออก PDF'}
             </button>
             <button 
               onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
               className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
             >
               <ArrowDownUp size={14}/>
               เรียงวันที่: {sortOrder === 'desc' ? 'ใหม่ -> เก่า' : 'เก่า -> ใหม่'}
             </button>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input 
                type="text" 
                placeholder="ค้นหารายการ..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
              />
            </div>
          </div>
          <Select 
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            options={[
              { value: 'all', label: 'ทุกโครงการ' },
              ...data.projects.map(p => ({ value: p.id, label: p.name }))
            ]}
          />
          <Select 
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            options={[
              { value: 'all', label: 'ทุกประเภท' },
              { value: TransactionType.INCOME, label: 'รายรับ' },
              { value: TransactionType.EXPENSE, label: 'รายจ่าย' },
              { value: TransactionType.INVESTMENT, label: 'ลงทุน' }
            ]}
          />
          <div className="flex gap-2">
            <Input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="text-xs !py-2"
              title="ตั้งแต่วันที่"
            />
            <Input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="text-xs !py-2"
              title="ถึงวันที่"
            />
          </div>
        </div>
      </Card>

      {/* Bank Statement Table */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-[120px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                  <div className="flex items-center gap-1">
                    วันที่ / เวลา
                    {sortOrder === 'desc' ? <ArrowDown size={14}/> : <ArrowUp size={14}/>}
                  </div>
                </th>
                <th className="p-4 min-w-[200px]">รายการ</th>
                <th className="p-4 text-right w-[140px] text-rose-600 bg-rose-50/30">รายจ่าย (Expense)</th>
                <th className="p-4 text-right w-[140px] text-emerald-600 bg-emerald-50/30">รายรับ (Income)</th>
                <th className="p-4 text-right w-[140px] text-slate-700 bg-slate-100/50">คงเหลือ (Balance)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedTransactions.length > 0 ? (
                processedTransactions.map((t, index) => {
                  const project = data.projects.find(p => p.id === t.projectId);
                  const partner = data.partners.find(p => p.id === t.partnerId);
                  const isExpense = t.type === TransactionType.EXPENSE;
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Date */}
                      <td className="p-4 text-sm text-slate-600 whitespace-nowrap align-top">
                        <div className="font-medium">{formatDate(t.date)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {/* Mock time if not available, or just show date */}
                          {/* Using ID hash or index to simulate time variation if needed, but keeping it simple */}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-bold text-slate-800">
                             {t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                             <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                               {project?.name || 'Unknown Project'}
                             </span>
                             {partner && (
                               <span 
                                 className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1"
                                 style={{ backgroundColor: `${partner.color}10`, color: partner.color, borderColor: `${partner.color}30` }}
                               >
                                 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: partner.color }}></div>
                                 {partner.name}
                               </span>
                             )}
                             {!partner && !isExpense && (
                               <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">
                                 กองกลาง
                               </span>
                             )}
                          </div>
                        </div>
                      </td>

                      {/* Withdrawal (Expense) */}
                      <td className="p-4 text-right align-top bg-rose-50/10">
                        {isExpense && (
                          <div className="font-bold text-rose-600 flex items-center justify-end gap-1">
                             -{formatCurrency(t.amount)}
                          </div>
                        )}
                      </td>

                      {/* Deposit (Income/Invest) */}
                      <td className="p-4 text-right align-top bg-emerald-50/10">
                        {!isExpense && (
                          <div className={`font-bold flex items-center justify-end gap-1 ${t.type === TransactionType.INVESTMENT ? 'text-indigo-600' : 'text-emerald-600'}`}>
                             +{formatCurrency(t.amount)}
                          </div>
                        )}
                      </td>

                      {/* Balance */}
                      <td className="p-4 text-right align-top bg-slate-50/30 font-mono">
                        <div className={`font-bold ${t.balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {formatCurrency(t.balance)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Search size={48} className="mx-auto mb-4 opacity-20"/>
                    <p className="text-lg font-medium text-slate-500">ไม่พบรายการเคลื่อนไหว</p>
                    <p className="text-sm">ลองปรับตัวกรองหรือค้นหาด้วยคำอื่น</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
