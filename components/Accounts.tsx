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
            let res = text.toString();
            // Remove zero-width spaces that might interfere
            res = res.replace(/[\u200B-\u200D\uFEFF]/g, '');
            
            // Basic fix for upper vowels + tone marks (Shift tone mark up)
            // This uses standard PUA codes that are generally supported by THSarabunNew
            const toneUpMap: Record<string, string> = {
                '\u0E48': '\uF70A', // Mai Ek
                '\u0E49': '\uF70B', // Mai Tho
                '\u0E4A': '\uF70C', // Mai Tri
                '\u0E4B': '\uF70D', // Mai Chattawa
                '\u0E4C': '\uF70E'  // Thanthakhat
            };
            const upperVowels = '[\u0E31\u0E34\u0E35\u0E36\u0E37\u0E47\u0E4D]';
            res = res.replace(new RegExp(`(${upperVowels})([\u0E48\u0E49\u0E4A\u0E4B\u0E4C])`, 'g'), (m, v, t) => v + toneUpMap[t]);

            // Fix Low Consonant + Lower Vowel (Remove Tail)
            res = res.replace(/\u0E0D([\u0E38\u0E39\u0E3A])/g, '\uF70F$1'); // ญ
            res = res.replace(/\u0E0E([\u0E38\u0E39\u0E3A])/g, '\uF700$1'); // ฐ

            return res;
        };

        // Use THSarabunNew as primary font because it supports PUA glyphs for fixing overlapping
        const fontName = 'THSarabunNew';
        const fontUrl = 'https://unpkg.com/font-th-sarabun-new@1.0.0/fonts/THSarabunNew-webfont.ttf';
        const fontBoldUrl = 'https://unpkg.com/font-th-sarabun-new@1.0.0/fonts/THSarabunNew_bold-webfont.ttf';
        
        try {
            // Load Normal Font
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
            });

            // Load Bold Font
            const fontBoldResponse = await fetch(fontBoldUrl);
            if (fontBoldResponse.ok) {
                const fontBoldBlob = await fontBoldResponse.blob();
                const readerBold = new FileReader();
                await new Promise((resolve, reject) => {
                    readerBold.onloadend = () => resolve(readerBold.result);
                    readerBold.onerror = reject;
                    readerBold.readAsDataURL(fontBoldBlob);
                }).then((result) => {
                    const base64data = result as string;
                    const fontBase64 = base64data.split(',')[1];
                    doc.addFileToVFS('THSarabunNew-Bold.ttf', fontBase64);
                    doc.addFont('THSarabunNew-Bold.ttf', 'THSarabunNew', 'bold');
                });
            }
        } catch (e) {
            console.error("Failed to load font", e);
            alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้");
            setIsExporting(false);
            return;
        }

        doc.setFont('THSarabunNew', 'normal');

        // --- Beautiful Header ---
        // Top colored bar
        doc.setFillColor(79, 70, 229); // Indigo 600
        doc.rect(0, 0, 210, 20, 'F');
        
        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('THSarabunNew', 'bold');
        doc.text(preprocessThaiText('รายงานสรุปบัญชีรายรับ-รายจ่าย'), 15, 13);
        
        // Subtitle (Date Range / Project)
        doc.setFontSize(11);
        doc.setFont('THSarabunNew', 'normal');
        let subtitle = `โครงการ: ${filterProject === 'all' ? 'ทั้งหมด' : data.projects.find(p => p.id === filterProject)?.name}`;
        if (startDate || endDate) {
            subtitle += ` | วันที่: ${startDate ? new Date(startDate).toLocaleDateString('th-TH') : 'เริ่มต้น'} - ${endDate ? new Date(endDate).toLocaleDateString('th-TH') : 'ปัจจุบัน'}`;
        }
        doc.text(preprocessThaiText(subtitle), 15, 18);

        // --- Summary Cards ---
        const startY = 25;
        const cardWidth = 50;
        const cardHeight = 16;
        const gap = 4;
        
        // Income Card
        doc.setFillColor(236, 253, 245); // Emerald 50
        doc.setDrawColor(16, 185, 129); // Emerald 500
        doc.roundedRect(15, startY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.setFontSize(10);
        doc.text(preprocessThaiText('รายรับรวม (Income)'), 18, startY + 6);
        doc.setTextColor(5, 150, 105); // Emerald 600
        doc.setFontSize(14);
        doc.setFont('THSarabunNew', 'bold');
        doc.text(preprocessThaiText('+' + formatCurrency(summary.income)), 18, startY + 13);

        // Expense Card
        doc.setFillColor(255, 241, 242); // Rose 50
        doc.setDrawColor(244, 63, 94); // Rose 500
        doc.roundedRect(15 + cardWidth + gap, startY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(10);
        doc.setFont('THSarabunNew', 'normal');
        doc.text(preprocessThaiText('รายจ่ายรวม (Expense)'), 18 + cardWidth + gap, startY + 6);
        doc.setTextColor(225, 29, 72); // Rose 600
        doc.setFontSize(14);
        doc.setFont('THSarabunNew', 'bold');
        doc.text(preprocessThaiText('-' + formatCurrency(summary.expense)), 18 + cardWidth + gap, startY + 13);

        // Balance Card
        const isPositive = summary.currentBalance >= 0;
        doc.setFillColor(isPositive ? 248 : 255, isPositive ? 250 : 241, isPositive ? 252 : 242); // Slate 50 or Rose 50
        doc.setDrawColor(isPositive ? 71 : 244, isPositive ? 85 : 63, isPositive ? 105 : 94); // Slate 600 or Rose 500
        doc.roundedRect(15 + (cardWidth + gap) * 2, startY, cardWidth + 10, cardHeight, 1.5, 1.5, 'FD');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(10);
        doc.setFont('THSarabunNew', 'normal');
        doc.text(preprocessThaiText('ยอดคงเหลือ (Balance)'), 18 + (cardWidth + gap) * 2, startY + 6);
        doc.setTextColor(isPositive ? 15 : 225, isPositive ? 23 : 29, isPositive ? 42 : 72); // Slate 900 or Rose 600
        doc.setFontSize(14);
        doc.setFont('THSarabunNew', 'bold');
        doc.text(preprocessThaiText(formatCurrency(summary.currentBalance)), 18 + (cardWidth + gap) * 2, startY + 13);

        // --- Transactions Table ---
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
                preprocessThaiText(income),
                preprocessThaiText(expense),
                preprocessThaiText(balance)
            ]);
        });

        autoTable(doc, {
            startY: startY + cardHeight + 6,
            head: [tableColumn],
            body: tableRows,
            styles: { 
                font: fontName, 
                fontSize: 10, // Reduced font size to prevent wrapping
                cellPadding: { top: 3, bottom: 2, left: 2, right: 2 }, // Tighter padding, more top padding for tone marks
                textColor: [51, 65, 85], // Slate 700
                lineColor: [226, 232, 240], // Slate 200
                lineWidth: 0.1,
            },
            headStyles: { 
                fillColor: [79, 70, 229], // Indigo 600
                textColor: [255, 255, 255],
                font: fontName, 
                fontStyle: 'bold', 
                fontSize: 11,
                halign: 'center',
                cellPadding: { top: 4, bottom: 3, left: 2, right: 2 }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' }, // Date
                1: { cellWidth: 'auto' }, // Note
                2: { cellWidth: 30 }, // Project
                3: { cellWidth: 22, halign: 'right', textColor: [5, 150, 105] }, // Income
                4: { cellWidth: 22, halign: 'right', textColor: [225, 29, 72] }, // Expense
                5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }, // Balance
            },
            didParseCell: (data) => {
                if (data.section === 'head' && (data.column.index === 3 || data.column.index === 4 || data.column.index === 5)) {
                    data.cell.styles.halign = 'right';
                }
            },
            didDrawPage: (data) => {
                // Footer
                const str = 'หน้า ' + doc.internal.getNumberOfPages();
                doc.setFontSize(10);
                doc.setFont('THSarabunNew', 'normal');
                doc.setTextColor(148, 163, 184); // Slate 400
                doc.text(preprocessThaiText(str), data.settings.margin.left, doc.internal.pageSize.height - 10);
                
                const dateStr = 'พิมพ์เมื่อ: ' + new Date().toLocaleString('th-TH');
                doc.text(preprocessThaiText(dateStr), doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
            }
        });

        doc.save(`Statement_${new Date().getTime()}.pdf`);
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
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3 w-[120px] cursor-pointer hover:bg-slate-100 transition-colors group select-none" onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                  <div className="flex items-center gap-1.5 text-slate-600 group-hover:text-indigo-600">
                    <Calendar size={12}/>
                    วันที่
                    {sortOrder === 'desc' ? <ArrowDown size={12} className="text-indigo-500"/> : <ArrowUp size={12} className="text-indigo-500"/>}
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <FileText size={12}/> รายการ
                  </div>
                </th>
                <th className="px-4 py-3 text-right w-[120px] text-rose-600 bg-rose-50/30">
                  <div className="flex items-center justify-end gap-1.5">
                    <TrendingDown size={12}/> รายจ่าย
                  </div>
                </th>
                <th className="px-4 py-3 text-right w-[120px] text-emerald-600 bg-emerald-50/30">
                  <div className="flex items-center justify-end gap-1.5">
                    <TrendingUp size={12}/> รายรับ
                  </div>
                </th>
                <th className="px-4 py-3 text-right w-[120px] text-slate-700 bg-slate-100/50">
                  <div className="flex items-center justify-end gap-1.5">
                    <Wallet size={12}/> คงเหลือ
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
                      <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap align-top">
                        <div className="font-bold text-slate-700">{formatDate(t.date)}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5 font-medium bg-slate-100 inline-block px-1 py-0.5 rounded">
                           {new Date(t.date).toLocaleDateString('th-TH', { weekday: 'short' })}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-2.5 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-bold text-slate-800 leading-snug">
                             {t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                             <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-medium">
                               <Building2 size={8}/> {project?.name || 'Unknown'}
                             </span>
                             {partner ? (
                               <span 
                                 className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border font-bold leading-none"
                                 style={{ backgroundColor: `${partner.color}10`, color: partner.color, borderColor: `${partner.color}30` }}
                               >
                                 <div className="w-1 h-1 rounded-full" style={{ backgroundColor: partner.color }}></div>
                                 {partner.name}
                               </span>
                             ) : !isExpense ? (
                               <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 font-bold leading-none">
                                 <Wallet size={8}/> กองกลาง
                               </span>
                             ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Withdrawal (Expense) */}
                      <td className="px-4 py-2.5 text-right align-top bg-rose-50/10">
                        {isExpense && (
                          <span className="font-bold text-rose-600 text-sm tracking-tight">
                             -{formatCurrency(t.amount)}
                          </span>
                        )}
                      </td>

                      {/* Deposit (Income/Invest) */}
                      <td className="px-4 py-2.5 text-right align-top bg-emerald-50/10">
                        {!isExpense && (
                          <span className={`font-bold text-sm tracking-tight ${t.type === TransactionType.INVESTMENT ? 'text-indigo-600' : 'text-emerald-600'}`}>
                             +{formatCurrency(t.amount)}
                          </span>
                        )}
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-2.5 text-right align-top bg-slate-50/30">
                        <span className={`font-bold font-mono text-sm tracking-tight ${t.balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
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
