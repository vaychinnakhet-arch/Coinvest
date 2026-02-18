import React, { useMemo } from 'react';
import { AppState, TransactionType } from '../types';
import { Card, Badge } from './ui/Components';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface DashboardProps {
  data: AppState;
}

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
  const stats = useMemo(() => {
    let totalInvestment = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    data.transactions.forEach(t => {
      if (t.type === TransactionType.INVESTMENT) {
        totalInvestment += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        totalExpense += t.amount;
        if (t.partnerId) {
          totalInvestment += t.amount;
        }
      } else if (t.type === TransactionType.INCOME) {
        totalIncome += t.amount;
      }
    });

    return { totalInvestment, totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
  }, [data.transactions]);

  const partnerInvestments = useMemo(() => {
    const map = new Map<string, number>();
    data.transactions.forEach(t => {
      if (t.partnerId) {
        if (t.type === TransactionType.INVESTMENT || t.type === TransactionType.EXPENSE) {
          const current = map.get(t.partnerId) || 0;
          map.set(t.partnerId, current + t.amount);
        }
      }
    });

    return data.partners.map(p => ({
      name: p.name,
      value: map.get(p.id) || 0,
      color: p.color,
      avatar: p.avatar
    })).filter(item => item.value > 0);
  }, [data]);

  const projectPerformance = useMemo(() => {
    return data.projects.map(p => {
      const txs = data.transactions.filter(t => t.projectId === p.id);
      const income = txs.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      const expense = txs.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
      return {
        name: p.name,
        income,
        expense,
        profit: income - expense
      };
    });
  }, [data]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(val);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-2xl text-sm">
          <p className="font-bold text-slate-700 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-500 capitalize">{entry.name}:</span>
              <span className="font-semibold text-slate-700 ml-auto">
                {new Intl.NumberFormat('th-TH').format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      
      {/* 1. Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Investment Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet size={80} className="text-indigo-600" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <span className="text-slate-500 font-medium text-sm">เงินลงทุนรวม</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{formatCurrency(stats.totalInvestment)}</h3>
            <p className="text-xs text-indigo-500 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight size={14} /> เงินทุนหมุนเวียนในระบบ
            </p>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={80} className="text-emerald-600" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-slate-500 font-medium text-sm">รายรับรวม</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{formatCurrency(stats.totalIncome)}</h3>
             <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight size={14} /> รายได้จากทุกโครงการ
            </p>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingDown size={80} className="text-rose-600" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <TrendingDown size={24} />
            </div>
            <span className="text-slate-500 font-medium text-sm">รายจ่ายรวม</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{formatCurrency(stats.totalExpense)}</h3>
             <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
              <ArrowDownRight size={14} /> ค่าใช้จ่ายทั้งหมด
            </p>
          </div>
        </div>

        {/* Net Profit Card (Highlighted) */}
        <div className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${
          stats.netProfit >= 0 
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-transparent' 
            : 'bg-white border-rose-100'
        }`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={80} className={stats.netProfit >= 0 ? "text-white" : "text-rose-500"} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${stats.netProfit >= 0 ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
              <Activity size={24} />
            </div>
            <span className={`font-medium text-sm ${stats.netProfit >= 0 ? 'text-indigo-100' : 'text-slate-500'}`}>กำไรสุทธิ</span>
          </div>
          <div>
            <h3 className={`text-3xl font-bold tracking-tight ${stats.netProfit >= 0 ? 'text-white' : 'text-rose-600'}`}>
              {formatCurrency(stats.netProfit)}
            </h3>
            <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${stats.netProfit >= 0 ? 'text-indigo-100' : 'text-slate-400'}`}>
               สถานะการเงินปัจจุบัน
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. Chart Section: Performance */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">ประสิทธิภาพรายโครงการ</h3>
              <p className="text-sm text-slate-500">เปรียบเทียบ รายรับ vs รายจ่าย</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
               <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> รายรับ</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-rose-400"></div> รายจ่าย</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-indigo-400"></div> กำไร</div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectPerformance} barGap={4} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="income" name="รายรับ" fill="#34D399" radius={[6, 6, 0, 0]} maxBarSize={50} />
                <Bar dataKey="expense" name="รายจ่าย" fill="#FB7185" radius={[6, 6, 0, 0]} maxBarSize={50} />
                <Bar dataKey="profit" name="กำไร" fill="#818CF8" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Chart Section: Partners */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-4">
             <h3 className="text-lg font-bold text-slate-800">สัดส่วนการลงทุน</h3>
             <p className="text-sm text-slate-500">ตามสัดส่วนผู้ถือหุ้น</p>
          </div>
          
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={partnerInvestments}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {partnerInvestments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-800">{partnerInvestments.length}</span>
                <span className="text-xs text-slate-400 font-medium">หุ้นส่วน</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
             {partnerInvestments.map((p, idx) => {
               const percentage = stats.totalInvestment > 0 ? (p.value / stats.totalInvestment) * 100 : 0;
               return (
                  <div key={idx} className="flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">{p.name}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-sm font-bold text-slate-700 block">{percentage.toFixed(1)}%</span>
                     </div>
                  </div>
               )
             })}
          </div>
        </div>
      </div>

      {/* 4. Partner Details Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
           <h3 className="text-lg font-bold text-slate-800">รายละเอียดหุ้นส่วน</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-5 font-semibold pl-8">ชื่อหุ้นส่วน</th>
                <th className="p-5 font-semibold text-right">เงินลงทุนสะสม</th>
                <th className="p-5 font-semibold w-1/3">สัดส่วน (%)</th>
                <th className="p-5 font-semibold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {partnerInvestments.map((p, idx) => {
                const percentage = stats.totalInvestment > 0 ? (p.value / stats.totalInvestment) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ring-1 ring-slate-100" style={{ backgroundColor: COLORS[idx % COLORS.length] + '20' }}>
                          {p.avatar}
                        </div>
                        <span className="font-bold text-slate-700">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-5 text-right font-bold text-indigo-600">{formatCurrency(p.value)}</td>
                    <td className="p-5">
                       <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                          ></div>
                       </div>
                       <p className="text-xs text-slate-400 mt-1.5 text-right font-medium">{percentage.toFixed(1)}%</p>
                    </td>
                    <td className="p-5 text-center">
                       <Badge color="blue">Active</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
