import React, { useMemo } from 'react';
import { AppState, TransactionType } from '../types';
import { Card, Badge } from './ui/Components';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

interface DashboardProps {
  data: AppState;
}

const COLORS = ['#818CF8', '#34D399', '#F472B6', '#FBBF24', '#60A5FA'];

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
  const stats = useMemo(() => {
    let totalInvestment = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    data.transactions.forEach(t => {
      // Logic: Investment is explicit INVESTMENT OR EXPENSE paid by a partner
      if (t.type === TransactionType.INVESTMENT) {
        totalInvestment += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        totalExpense += t.amount;
        if (t.partnerId) {
          totalInvestment += t.amount; // Direct payment counts as investment
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
      // Check if this transaction counts as an investment
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
      color: p.color
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

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col">
          <span className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
            <DollarSign size={16} /> เงินลงทุนรวม
          </span>
          <span className="text-3xl font-bold text-indigo-600">{formatCurrency(stats.totalInvestment)}</span>
        </Card>
        <Card className="flex flex-col">
          <span className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" /> รายรับรวม
          </span>
          <span className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.totalIncome)}</span>
        </Card>
        <Card className="flex flex-col">
          <span className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
            <TrendingDown size={16} className="text-rose-500" /> รายจ่ายรวม
          </span>
          <span className="text-3xl font-bold text-rose-600">{formatCurrency(stats.totalExpense)}</span>
        </Card>
        <Card className="flex flex-col">
           <span className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" /> กำไรสุทธิ
          </span>
          <span className={`text-3xl font-bold ${stats.netProfit >= 0 ? 'text-amber-600' : 'text-slate-600'}`}>
            {formatCurrency(stats.netProfit)}
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Performance Chart */}
        <Card title="ประสิทธิภาพแต่ละโครงการ" className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `${val/1000}k`} />
              <RechartsTooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar dataKey="income" name="รายรับ" fill="#34D399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="รายจ่าย" fill="#FDA4AF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="กำไร" fill="#818CF8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Partner Investment Distribution */}
        <Card title="สัดส่วนเงินลงทุน" className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={partnerInvestments}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {partnerInvestments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Partner Breakdown Table */}
      <Card title="รายละเอียดหุ้นส่วน">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-sm border-b border-slate-100">
                <th className="p-3 font-medium">ชื่อหุ้นส่วน</th>
                <th className="p-3 font-medium text-right">เงินลงทุนสะสม</th>
                <th className="p-3 font-medium text-right">สัดส่วน (%)</th>
                <th className="p-3 font-medium text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {partnerInvestments.map((p, idx) => {
                const percentage = stats.totalInvestment > 0 ? (p.value / stats.totalInvestment) * 100 : 0;
                return (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                        {p.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700">{p.name}</span>
                    </td>
                    <td className="p-3 text-right font-medium text-indigo-600">{formatCurrency(p.value)}</td>
                    <td className="p-3 text-right text-slate-500">{percentage.toFixed(1)}%</td>
                    <td className="p-3 text-center">
                       <Badge color="blue">Active</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};