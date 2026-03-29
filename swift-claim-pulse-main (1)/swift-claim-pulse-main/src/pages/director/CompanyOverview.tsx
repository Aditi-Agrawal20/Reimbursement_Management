import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { formatCurrency } from '@/data/mockData';
import { getExpenseStats } from '@/services/api';
import { toast } from 'sonner';

const CompanyOverview = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getExpenseStats();
      setStats(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const directorStats = stats?.director || [
    { label: 'Total Spend', value: 584500, prefix: '₹', icon: 'receipt', sparkline: [120, 135, 128, 145, 138, 152, 148] },
    { label: 'Pending Value', value: 45200, prefix: '₹', icon: 'clock', sparkline: [15, 28, 16, 32, 20, 35, 22] },
    { label: 'Approved Count', value: 124, icon: 'check-circle', sparkline: [10, 15, 20, 30, 35, 42, 47] },
    { label: 'Rejected Count', value: 20, icon: 'x-circle', sparkline: [3, 5, 2, 7, 4, 6, 5] },
  ];

  const monthlyData = stats?.monthlyData || [
    { name: 'Oct', amount: 45000 },
    { name: 'Nov', amount: 62000 },
    { name: 'Dec', amount: 38000 },
    { name: 'Jan', amount: 71000 },
    { name: 'Feb', amount: 55000 },
    { name: 'Mar', amount: 84000 },
  ];

  const categoryBreakdown = stats?.categoryBreakdown || [
    { name: 'Travel', amount: 185000, count: 45, pct: 32 },
    { name: 'Food', amount: 67000, count: 38, pct: 12 },
    { name: 'Hotel', amount: 142000, count: 22, pct: 25 },
    { name: 'Transport', amount: 54000, count: 56, pct: 9 },
    { name: 'Medical', amount: 38000, count: 12, pct: 7 },
    { name: 'Equipment', amount: 89000, count: 15, pct: 15 },
  ];

  return (
    <div>
      <PageHeader title="Company Overview" subtitle="Executive summary of company expenses" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {directorStats.map((stat: any, i: number) => (
          <StatCard key={stat.label} {...stat} index={i} />
        ))}
      </div>

      {/* Monthly bar chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card-surface rounded-xl p-5 mb-8">
        <h3 className="font-display font-medium text-[15px] text-foreground mb-1">Monthly Expense Totals</h3>
        <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(215, 15%, 50%)' }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(230, 28%, 7%)',
                border: '1px solid hsl(230, 15%, 14%)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'hsl(214, 32%, 91%)',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={40}>
              {monthlyData.map((_: any, i: number) => (
                <rect key={i} fill={`url(#barGrad)`} />
              ))}
            </Bar>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Category breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="card-surface rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display font-medium text-[15px] text-foreground">Category Breakdown</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Total amounts in company currency (INR)</p>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="label-upper px-5 py-3 text-left">Category</th>
              <th className="label-upper px-5 py-3 text-left">Total Amount</th>
              <th className="label-upper px-5 py-3 text-left">Count</th>
              <th className="label-upper px-5 py-3 text-left">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {categoryBreakdown.map((cat: any, i: number) => (
              <motion.tr key={cat.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.04 }}
                className="border-t border-border table-row-hover">
                <td className="px-5 py-3 text-sm text-foreground font-medium">{cat.name}</td>
                <td className="px-5 py-3 text-sm font-mono text-foreground">{formatCurrency(cat.amount)}</td>
                <td className="px-5 py-3 text-sm text-muted-foreground">{cat.count}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-destructive" style={{ width: `${cat.pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{cat.pct}%</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default CompanyOverview;
