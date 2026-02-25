import React, { useMemo } from 'react';
import { AppState, TransactionType } from '../types';
import { Card, Badge } from './ui/Components';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, ReferenceLine } from 'recharts';
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
    let centralPool = 0;

    data.transactions.forEach(t => {
      if (t.type === TransactionType.INVESTMENT) {
        totalInvestment += t.amount;
        centralPool += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        totalExpense += t.amount;
        if (t.partnerId) {
          totalInvestment += t.amount;
        } else {
          centralPool -= t.amount;
        }
      } else if (t.type === TransactionType.INCOME) {
        totalIncome += t.amount;
        centralPool += t.amount;
      }
    });

    return { totalInvestment, totalIncome, totalExpense, netProfit: totalIncome - totalExpense, centralPool };
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
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-100 shadow-xl rounded-2xl text-sm ring-1 ring-slate-200 min-w-[200px]">
          <p className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 text-base">{label}</p>
          <div className="space-y-3">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-500 capitalize font-medium text-sm">{entry.name}</span>
                <span className={`font-bold ml-auto text-base ${
                    entry.dataKey === 'profit' 
                        ? (entry.value >= 0 ? 'text-indigo-600' : 'text-rose-500') 
                        : 'text-slate-700'
                }`}>
                  {new Intl.NumberFormat('th-TH').format(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* 1. Hero Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4 md:gap-6">
        
        {/* Central Pool Card (Highlighted) */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 rounded-3xl border border-transparent shadow-lg shadow-indigo-200/50 relative overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 sm:col-span-2 lg:col-span-1 2xl:col-span-1">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform">
            <Wallet size={100} className="text-white" />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-2xl shadow-inner">
              <Wallet size={24} />
            </div>
            <span className="font-semibold text-base text-indigo-100 tracking-wide">ยอดเงินกองกลาง</span>
          </div>
          <div>
            <h3 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-2 truncate" title={formatCurrency(stats.centralPool)}>{formatCurrency(stats.centralPool)}</h3>
            <p className="text-sm font-medium flex items-center gap-1.5 text-indigo-200">
              เงินสดพร้อมใช้ในระบบ
            </p>
          </div>
        </div>

        {/* Investment Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 group-hover:scale-110 transform">
            <DollarSign size={100} className="text-slate-900" />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl border border-slate-100">
              <DollarSign size={24} />
            </div>
            <span className="text-slate-500 font-semibold text-base tracking-wide">เงินลงทุนรวม</span>
          </div>
          <div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight mb-2 truncate" title={formatCurrency(stats.totalInvestment)}>{formatCurrency(stats.totalInvestment)}</h3>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
              <ArrowUpRight size={16} className="text-indigo-500" /> เงินทุนหมุนเวียนในระบบ
            </p>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 group-hover:scale-110 transform">
            <TrendingUp size={100} className="text-emerald-600" />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/50">
              <TrendingUp size={24} />
            </div>
            <span className="text-slate-500 font-semibold text-base tracking-wide">รายรับรวม</span>
          </div>
          <div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight mb-2 truncate" title={formatCurrency(stats.totalIncome)}>{formatCurrency(stats.totalIncome)}</h3>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
              <ArrowUpRight size={16} className="text-emerald-500" /> รายได้จากทุกโครงการ
            </p>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 group-hover:scale-110 transform">
            <TrendingDown size={100} className="text-rose-600" />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100/50">
              <TrendingDown size={24} />
            </div>
            <span className="text-slate-500 font-semibold text-base tracking-wide">รายจ่ายรวม</span>
          </div>
          <div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight mb-2 truncate" title={formatCurrency(stats.totalExpense)}>{formatCurrency(stats.totalExpense)}</h3>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
              <ArrowDownRight size={16} className="text-rose-500" /> ค่าใช้จ่ายทั้งหมด
            </p>
          </div>
        </div>

        {/* Net Profit Card (Highlighted) */}
        <div className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 ${
          stats.netProfit >= 0 
            ? 'bg-slate-900 text-white border-transparent' 
            : 'bg-white border-rose-200'
        }`}>
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform">
            <Activity size={100} className={stats.netProfit >= 0 ? "text-white" : "text-rose-500"} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-2xl ${stats.netProfit >= 0 ? 'bg-white/10 text-white' : 'bg-rose-50 text-rose-600'}`}>
              <Activity size={24} />
            </div>
            <span className={`font-semibold text-base tracking-wide ${stats.netProfit >= 0 ? 'text-slate-300' : 'text-slate-500'}`}>กำไรสุทธิ</span>
          </div>
          <div>
            <h3 className={`text-2xl lg:text-3xl font-extrabold tracking-tight mb-2 truncate ${stats.netProfit >= 0 ? 'text-white' : 'text-rose-600'}`} title={formatCurrency(stats.netProfit)}>
              {formatCurrency(stats.netProfit)}
            </h3>
            <p className={`text-sm font-medium flex items-center gap-1.5 ${stats.netProfit >= 0 ? 'text-slate-400' : 'text-slate-400'}`}>
               สถานะการเงินปัจจุบัน
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. Chart Section: Performance */}
        <div className="lg:col-span-2 bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">ประสิทธิภาพรายโครงการ</h3>
              <p className="text-base text-slate-500 mt-1">เปรียบเทียบ รายรับ vs รายจ่าย</p>
            </div>
            <div className="flex gap-4 text-sm font-medium bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-2 px-3">
                 <div className="w-3.5 h-3.5 rounded bg-gradient-to-b from-emerald-400 to-emerald-500 shadow-sm"></div> รายรับ
               </div>
               <div className="flex items-center gap-2 px-3 border-l border-slate-200">
                 <div className="w-3.5 h-3.5 rounded bg-gradient-to-b from-rose-400 to-rose-500 shadow-sm"></div> รายจ่าย
               </div>
               <div className="flex items-center gap-2 px-3 border-l border-slate-200">
                 <div className="w-3.5 h-3.5 rounded bg-gradient-to-b from-indigo-400 to-indigo-500 shadow-sm"></div> กำไร
               </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectPerformance} barGap={8} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={1}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                
                <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={14} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={12}
                    tick={{ fill: '#64748b', fontWeight: 500 }}
                />
                <YAxis 
                    stroke="#94a3b8" 
                    fontSize={14} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `${val/1000}k`}
                    tick={{ fill: '#94a3b8' }}
                />
                
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc', opacity: 0.5}} />
                
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                
                <Bar 
                    dataKey="income" 
                    name="รายรับ" 
                    fill="url(#colorIncome)" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={50}
                />
                <Bar 
                    dataKey="expense" 
                    name="รายจ่าย" 
                    fill="url(#colorExpense)" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={50}
                />
                <Bar 
                    dataKey="profit" 
                    name="กำไร" 
                    fill="url(#colorProfit)" 
                    radius={[6, 6, 6, 6]} 
                    maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Chart Section: Partners */}
        <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-6">
             <h3 className="text-xl font-bold text-slate-800">สัดส่วนการลงทุน</h3>
             <p className="text-base text-slate-500 mt-1">ตามสัดส่วนผู้ถือหุ้น</p>
          </div>
          
          <div className="flex-1 min-h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={partnerInvestments}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {partnerInvestments.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        className="drop-shadow-sm filter hover:brightness-110 transition-all cursor-pointer"
                    />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '16px', padding: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-bold text-slate-800">{partnerInvestments.length}</span>
                <span className="text-sm text-slate-400 font-medium">หุ้นส่วน</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
             {partnerInvestments.map((p, idx) => {
               const percentage = stats.totalInvestment > 0 ? (p.value / stats.totalInvestment) * 100 : 0;
               return (
                  <div key={idx} className="flex items-center justify-between group p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-base font-medium text-slate-600 group-hover:text-slate-800 transition-colors">{p.name}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-base font-bold text-slate-700 block">{percentage.toFixed(1)}%</span>
                     </div>
                  </div>
               )
             })}
          </div>
        </div>
      </div>

      {/* 4. Partner Details Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-7 border-b border-slate-50">
           <h3 className="text-xl font-bold text-slate-800">รายละเอียดหุ้นส่วน</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="text-slate-500 text-sm uppercase tracking-wider">
                <th className="p-6 font-semibold pl-8">ชื่อหุ้นส่วน</th>
                <th className="p-6 font-semibold text-right">เงินลงทุนสะสม</th>
                <th className="p-6 font-semibold w-1/3">สัดส่วน (%)</th>
                <th className="p-6 font-semibold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {partnerInvestments.map((p, idx) => {
                const percentage = stats.totalInvestment > 0 ? (p.value / stats.totalInvestment) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ring-1 ring-slate-100" style={{ backgroundColor: COLORS[idx % COLORS.length] + '20' }}>
                          {p.avatar}
                        </div>
                        <span className="font-bold text-slate-700 text-base">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-6 text-right font-bold text-indigo-600 text-base">{formatCurrency(p.value)}</td>
                    <td className="p-6">
                       <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm" 
                            style={{ width: `${percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                          ></div>
                       </div>
                       <p className="text-sm text-slate-400 mt-2 text-right font-medium">{percentage.toFixed(1)}%</p>
                    </td>
                    <td className="p-6 text-center">
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