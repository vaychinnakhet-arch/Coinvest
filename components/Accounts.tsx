import React, { useState, useMemo } from 'react';
import { AppState, TransactionType } from '../types';
import { Card, Select, Input, Button } from './ui/Components';
import { FileText, TrendingUp, TrendingDown, DollarSign, Search, Filter, Wallet, ArrowDownUp, ArrowUp, ArrowDown, Download, Loader2, Building2, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // Helper to detect internal transfers (Loans/Transfers between projects)
    const isInternalTransfer = (note: string) => {
      if (!note) return false;
      return /(?:\(ให้ยืม\/โอนไปโครงการ:|\(รับเงินยืม\/โอนจากโครงการ:|\(ปรับปรุงรายการ\) โอนไปโครงการ:|\(ปรับปรุงรายการ\) รับเงินโอนจากโครงการ:)/.test(note);
    };

    // We use the processed transactions (which respect date filters) for the summary cards
    processedTransactions.forEach(t => {
      // Skip internal transfers for Income/Expense totals to show "Real" operational figures
      if (isInternalTransfer(t.note)) {
        return;
      }

      if (t.type === TransactionType.INCOME) income += t.amount;
      else if (t.type === TransactionType.EXPENSE) expense += t.amount;
      else if (t.type === TransactionType.INVESTMENT) investment += t.amount;
    });

    // Current Balance is the balance of the *latest* transaction in time
    // We do NOT filter internal transfers for balance, as they affect actual cash availability
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

        // Helper to fix Thai vowel overlapping (For THSarabunNew)
        const preprocessThaiText = (text: string) => {
            if (!text) return "";
            let newText = text.toString();

            // 1. Fix Upper Vowel + Tone Mark (Shift Tone Mark Up)
            // Upper Vowels: \u0E31\u0E34\u0E35\u0E36\u0E37\u0E47\u0E4D\u0E4E
            // Tone Marks: \u0E48\u0E49\u0E4A\u0E4B\u0E4C
            const toneMap: Record<string, string> = {
                '\u0E48': '\uF70A', // Mai Ek
                '\u0E49': '\uF70B', // Mai Tho
                '\u0E4A': '\uF70C', // Mai Tri
                '\u0E4B': '\uF70D', // Mai Chattawa
                '\u0E4C': '\uF70E'  // Thanthakhat
            };

            newText = newText.replace(/([\u0E31\u0E34\u0E35\u0E36\u0E37\u0E47\u0E4D\u0E4E])([\u0E48\u0E49\u0E4A\u0E4B\u0E4C])/g, (match, p1, p2) => {
                return p1 + (toneMap[p2] || p2);
            });

            // 2. Fix Low Consonant + Lower Vowel (Remove Tail)
            // Yo Ying (0E0D) -> F70F
            // Do Chada (0E0E) -> F700
            newText = newText.replace(/\u0E0D([\u0E38\u0E39\u0E3A])/g, '\uF70F$1');
            newText = newText.replace(/\u0E0E([\u0E38\u0E39\u0E3A])/g, '\uF700$1');

            return newText;
        };

        // Use THSarabunNew as primary font because it supports PUA glyphs for fixing overlapping
        const fontName = 'THSarabunNew';
        const fontUrl = 'https://raw.githubusercontent.com/sathittham/THSarabunNew/master/THSarabunNew.ttf';
        
        try {
            const fontResponse = await fetch(fontUrl);
            if (!fontResponse.ok) throw new Error('Failed to fetch THSarabunNew');
            const fontBlob = await fontResponse.blob();
            const reader = new FileReader();
            
            await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(fontBlob);
            }).then((result) => {
                const base64data = result as string;
                const fontBase64 = base64data.split(',')[1];
                doc.addFileToVFS('THSarabunNew.ttf', fontBase64);
                doc.addFont('THSarabunNew.ttf', 'THSarabunNew', 'normal');
                doc.setFont('THSarabunNew');
            });
        } catch (e) {
            console.error("Failed to load font", e);
            alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้");
            setIsExporting(false);
            return;
        }

        // Title
        doc.setFontSize(20);
        doc.text(preprocessThaiText('รายงานสรุปรายรับ-รายจ่าย'), 105, 20, { align: 'center' });
        
        // Subtitle (Date Range / Project)
        doc.setFontSize(16);
        let subtitle = `โครงการ: ${filterProject === 'all' ? 'ทั้งหมด' : data.projects.find(p => p.id === filterProject)?.name}`;
        if (startDate || endDate) {
            subtitle += ` | วันที่: ${startDate ? new Date(startDate).toLocaleDateString('th-TH') : 'เริ่มต้น'} - ${endDate ? new Date(endDate).toLocaleDateString('th-TH') : 'ปัจจุบัน'}`;
        }
        doc.text(preprocessThaiText(subtitle), 105, 30, { align: 'center' });

        // Summary Table
        autoTable(doc, {
            startY: 40,
            head: [['รายการ', 'จำนวนเงิน (บาท)'].map(preprocessThaiText)],
            body: [
                ['รายรับรวม', formatCurrency(summary.income)].map(val => preprocessThaiText(val.toString())),
                ['รายจ่ายรวม', formatCurrency(summary.expense)].map(val => preprocessThaiText(val.toString())),
                ['คงเหลือสุทธิ', formatCurrency(summary.income - summary.expense)].map(val => preprocessThaiText(val.toString())),
            ],
            styles: { 
                font: fontName, 
                fontSize: 14,
                cellPadding: { top: 3, bottom: 3, left: 2, right: 2 } 
            },
            headStyles: { 
                fillColor: [63, 81, 181], 
                font: fontName, 
                fontStyle: 'normal', 
                fontSize: 14 
            },
            columnStyles: {
                1: { halign: 'right' }
            },
            didParseCell: (data) => {
                if (data.section === 'head' && data.column.index === 1) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        // Transactions Table
        const tableColumn = ["วันที่", "รายการ", "โครงการ", "รายรับ", "รายจ่าย", "คงเหลือ"].map(preprocessThaiText);
        const tableRows: any[] = [];

        processedTransactions.forEach(t => {
            const project = data.projects.find(p => p.id === t.projectId)?.name || '-';
            const income = t.type === TransactionType.INCOME || t.type === TransactionType.INVESTMENT ? formatCurrency(t.amount) : '-';
            const expense = t.type === TransactionType.EXPENSE ? formatCurrency(t.amount) : '-';
            const balance = formatCurrency(t.balance);

            tableRows.push([
                preprocessThaiText(new Date(t.date).toLocaleDateString('th-TH')),
                preprocessThaiText(t.note),
                preprocessThaiText(project),
                income,
                expense,
                balance
            ]);
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [tableColumn],
            body: tableRows,
            styles: { 
                font: fontName, 
                fontSize: 14,
                cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }
            },
            headStyles: { 
                fillColor: [63, 81, 181], 
                font: fontName, 
                fontStyle: 'normal', 
                fontSize: 14 
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 30 },
                3: { cellWidth: 25, halign: 'right' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 25, halign: 'right' },
            },
            didParseCell: (data) => {
                if (data.section === 'head' && (data.column.index === 3 || data.column.index === 4 || data.column.index === 5)) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        doc.save('statement_report.pdf');
        setIsExporting(false);

    } catch (error) {
        console.error("Export failed", error);
        alert("ขออภัย ไม่สามารถสร้าง PDF ได้ในขณะนี้");
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
                <th className="px-6 py-4 w-[140px] cursor-pointer hover:bg-slate-100 transition-colors group select-none" onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                  <div className="flex items-center gap-2 text-slate-600 group-hover:text-indigo-600">
                    <Calendar size={14}/>
                    วันที่
                    {sortOrder === 'desc' ? <ArrowDown size={14} className="text-indigo-500"/> : <ArrowUp size={14} className="text-indigo-500"/>}
                  </div>
                </th>
                <th className="px-6 py-4 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <FileText size={14}/> รายการ
                  </div>
                </th>
                <th className="px-6 py-4 text-right w-[150px] text-rose-600 bg-rose-50/30">
                  <div className="flex items-center justify-end gap-2">
                    <TrendingDown size={14}/> รายจ่าย
                  </div>
                </th>
                <th className="px-6 py-4 text-right w-[150px] text-emerald-600 bg-emerald-50/30">
                  <div className="flex items-center justify-end gap-2">
                    <TrendingUp size={14}/> รายรับ
                  </div>
                </th>
                <th className="px-6 py-4 text-right w-[150px] text-slate-700 bg-slate-100/50">
                  <div className="flex items-center justify-end gap-2">
                    <Wallet size={14}/> คงเหลือ
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedTransactions.length > 0 ? (
                processedTransactions.map((t, index) => {
                  const project = data.projects.find(p => p.id === t.projectId);
                  const partner = data.partners.find(p => p.id === t.partnerId);
                  const isExpense = t.type === TransactionType.EXPENSE;
                  
                  return (
                    <tr key={t.id} className="hover:bg-indigo-50/30 transition-all group">
                      {/* Date */}
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap align-top">
                        <div className="font-bold text-slate-700">{formatDate(t.date)}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                           {new Date(t.date).toLocaleDateString('th-TH', { weekday: 'short' })}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="text-sm font-bold text-slate-800 leading-snug">
                             {t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                             <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 font-medium">
                               <Building2 size={10}/> {project?.name || 'Unknown'}
                             </span>
                             {partner ? (
                               <span 
                                 className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-bold"
                                 style={{ backgroundColor: `${partner.color}10`, color: partner.color, borderColor: `${partner.color}30` }}
                               >
                                 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: partner.color }}></div>
                                 {partner.name}
                               </span>
                             ) : !isExpense ? (
                               <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 font-bold">
                                 <Wallet size={10}/> กองกลาง
                               </span>
                             ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Withdrawal (Expense) */}
                      <td className="px-6 py-4 text-right align-top bg-rose-50/10">
                        {isExpense && (
                          <span className="font-bold text-rose-600 text-base tracking-tight">
                             -{formatCurrency(t.amount)}
                          </span>
                        )}
                      </td>

                      {/* Deposit (Income/Invest) */}
                      <td className="px-6 py-4 text-right align-top bg-emerald-50/10">
                        {!isExpense && (
                          <span className={`font-bold text-base tracking-tight ${t.type === TransactionType.INVESTMENT ? 'text-indigo-600' : 'text-emerald-600'}`}>
                             +{formatCurrency(t.amount)}
                          </span>
                        )}
                      </td>

                      {/* Balance */}
                      <td className="px-6 py-4 text-right align-top bg-slate-50/30">
                        <span className={`font-bold font-mono text-base tracking-tight ${t.balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {formatCurrency(t.balance)}
                        </span>
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
