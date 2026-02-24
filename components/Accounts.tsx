import React, { useState, useMemo } from 'react';
import { AppState, TransactionType } from '../types';
import { Card, Select, Input, Badge } from './ui/Components';
import { FileText, TrendingUp, TrendingDown, DollarSign, Calendar, Search, Filter, ArrowRight, User, Wallet } from 'lucide-react';

interface AccountsProps {
  data: AppState;
}

export const Accounts: React.FC<AccountsProps> = ({ data }) => {
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return data.transactions.filter(t => {
      // Project Filter
      if (filterProject !== 'all' && t.projectId !== filterProject) return false;
      
      // Type Filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Date Filter
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const noteMatch = t.note?.toLowerCase().includes(query);
        const amountMatch = t.amount.toString().includes(query);
        if (!noteMatch && !amountMatch) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.transactions, filterProject, filterType, startDate, endDate, searchQuery]);

  // Calculate Summary
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let investment = 0;

    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME) income += t.amount;
      else if (t.type === TransactionType.EXPENSE) expense += t.amount;
      else if (t.type === TransactionType.INVESTMENT) investment += t.amount;
    });

    return { income, expense, investment, net: income - expense };
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(val);
  };

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case TransactionType.EXPENSE: return 'text-rose-600 bg-rose-50 border-rose-100';
      case TransactionType.INVESTMENT: return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">บัญชีรายรับ-รายจ่าย</h2>
          <p className="text-slate-500 text-sm mt-1">สรุปรายการเคลื่อนไหวทั้งหมด ค้นหาและกรองข้อมูลได้ตามต้องการ</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-white border-slate-100 shadow-sm !p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 group-hover:scale-110 transform">
            <TrendingUp size={80} className="text-emerald-600" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/50"><TrendingUp size={24}/></div>
            <span className="text-base font-semibold text-slate-500 tracking-wide">รายรับรวม</span>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{formatCurrency(summary.income)}</h3>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm !p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 group-hover:scale-110 transform">
            <TrendingDown size={80} className="text-rose-600" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100/50"><TrendingDown size={24}/></div>
            <span className="text-base font-semibold text-slate-500 tracking-wide">รายจ่ายรวม</span>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{formatCurrency(summary.expense)}</h3>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm !p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 group-hover:scale-110 transform">
            <DollarSign size={80} className="text-indigo-600" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50"><DollarSign size={24}/></div>
            <span className="text-base font-semibold text-slate-500 tracking-wide">เงินลงทุนรวม</span>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{formatCurrency(summary.investment)}</h3>
        </Card>
        <Card className={`!p-6 border shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 ${summary.net >= 0 ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-rose-200'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform">
            <FileText size={80} className={summary.net >= 0 ? "text-white" : "text-rose-500"} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${summary.net >= 0 ? 'bg-white/10 text-white' : 'bg-rose-50 text-rose-600'}`}><FileText size={24}/></div>
            <span className={`text-base font-semibold tracking-wide ${summary.net >= 0 ? 'text-slate-300' : 'text-slate-500'}`}>กำไรสุทธิ</span>
          </div>
          <h3 className={`text-3xl font-extrabold tracking-tight ${summary.net >= 0 ? 'text-white' : 'text-rose-600'}`}>{formatCurrency(summary.net)}</h3>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
          <Filter size={18} className="text-indigo-500"/> ตัวกรองข้อมูล
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input 
                type="text" 
                placeholder="ค้นหารายการ, จำนวนเงิน..." 
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

      {/* Transactions List */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">วันที่</th>
                <th className="p-4 font-semibold">โครงการ</th>
                <th className="p-4 font-semibold">รายการ</th>
                <th className="p-4 font-semibold">ประเภท</th>
                <th className="p-4 font-semibold">แหล่งเงิน</th>
                <th className="p-4 font-semibold text-right">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(t => {
                  const project = data.projects.find(p => p.id === t.projectId);
                  const partner = data.partners.find(p => p.id === t.partnerId);
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-700">
                        {project?.name || 'ไม่ระบุ'}
                      </td>
                      <td className="p-4 text-sm text-slate-800 max-w-[200px] truncate" title={t.note}>
                        {t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getTransactionColor(t.type)}`}>
                          {t.type === TransactionType.INCOME ? 'รายรับ' : t.type === TransactionType.EXPENSE ? 'รายจ่าย' : 'ลงทุน'}
                        </span>
                      </td>
                      <td className="p-4">
                        {partner ? (
                           <span 
                             className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md w-fit shadow-sm border border-slate-100"
                             style={{ backgroundColor: `${partner.color}15`, color: partner.color }}
                           >
                             <User size={12}/> {partner.name}
                           </span>
                        ) : (
                           <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-md w-fit shadow-sm border border-slate-200">
                             <Wallet size={12}/> กองกลาง
                           </span>
                        )}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${
                        t.type === TransactionType.INCOME ? 'text-emerald-600' : 
                        t.type === TransactionType.INVESTMENT ? 'text-indigo-600' : 'text-rose-600'
                      }`}>
                        {t.type === TransactionType.EXPENSE ? '-' : '+'}{t.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Search size={32} className="mx-auto mb-3 opacity-20"/>
                    <p>ไม่พบรายการที่ตรงกับเงื่อนไข</p>
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
