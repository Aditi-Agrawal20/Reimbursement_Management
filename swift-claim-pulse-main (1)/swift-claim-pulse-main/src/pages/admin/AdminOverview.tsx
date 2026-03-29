import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis } from 'recharts';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { ApprovalProgress } from '@/components/ApprovalProgress';
import { formatCurrency } from '@/data/mockData';
import { getExpenses, getExpenseStats } from '@/services/api';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

const categoryData = [
  { name: 'Travel', value: 35, color: '#00b4d8' },
  { name: 'Food', value: 20, color: '#f59e0b' },
  { name: 'Hotel', value: 25, color: '#8b5cf6' },
  { name: 'Other', value: 20, color: '#10b981' },
];

const AdminOverview = () => {
  const [filter, setFilter] = useState('all');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expData, statsData] = await Promise.all([
        getExpenses(),
        getExpenseStats(),
      ]);
      setExpenses(expData);
      setStats(statsData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesFilter = filter === 'all' || e.status === filter;
    const matchesSearch = !searchQuery ||
      e.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const adminStats = stats?.admin || [
    { label: 'Total Requests', value: expenses.length, icon: 'receipt', sparkline: [20, 35, 28, 45, 38, 52, expenses.length] },
    { label: 'Pending', value: expenses.filter(e => e.status === 'pending').length, icon: 'clock', sparkline: [5, 8, 6, 12, 10, 15, 12] },
    { label: 'Approved', value: expenses.filter(e => e.status === 'approved').length, icon: 'check-circle', sparkline: [10, 15, 20, 30, 35, 42, 47] },
    { label: 'Rejected', value: expenses.filter(e => e.status === 'rejected').length, icon: 'x-circle', sparkline: [3, 5, 2, 7, 4, 6, 5] },
    { label: 'Team Size', value: 8, icon: 'users', sparkline: [5, 5, 6, 7, 7, 8, 8] },
  ];

  const monthlyData = stats?.monthlyData || [
    { name: 'Oct', amount: 45000 },
    { name: 'Nov', amount: 62000 },
    { name: 'Dec', amount: 38000 },
    { name: 'Jan', amount: 71000 },
    { name: 'Feb', amount: 55000 },
    { name: 'Mar', amount: 84000 },
  ];

  const weeklyData = stats?.weeklyData || [
    { day: 'Mon', count: 5 },
    { day: 'Tue', count: 8 },
    { day: 'Wed', count: 3 },
    { day: 'Thu', count: 12 },
    { day: 'Fri', count: 7 },
    { day: 'Sat', count: 2 },
    { day: 'Sun', count: 1 },
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle="Company expense dashboard" />

      {/* Stat cards — 5 across */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {adminStats.map((stat: any, i: number) => (
          <StatCard key={stat.label} {...stat} index={i} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 card-surface rounded-xl p-5">
          <h3 className="font-display font-medium text-[15px] text-foreground mb-1">Monthly Expenses</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ background: 'hsl(230, 28%, 7%)', border: '1px solid hsl(230, 15%, 14%)', borderRadius: '8px', fontSize: '12px', color: 'hsl(214, 32%, 91%)' }}
                formatter={(value: number) => [formatCurrency(value), 'Amount']} />
              <Area type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="card-surface rounded-xl p-5">
          <h3 className="font-display font-medium text-[15px] text-foreground mb-1">By Category</h3>
          <p className="text-xs text-muted-foreground mb-2">Expense distribution</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(230, 28%, 7%)', border: '1px solid hsl(230, 15%, 14%)', borderRadius: '8px', fontSize: '12px', color: 'hsl(214, 32%, 91%)' }}
                formatter={(value: number) => [`${value}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {categoryData.map(c => (
              <div key={c.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                {c.name}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Weekly chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        className="card-surface rounded-xl p-5 mb-8">
        <h3 className="font-display font-medium text-[15px] text-foreground mb-1">Weekly Activity</h3>
        <p className="text-xs text-muted-foreground mb-4">Expenses submitted this week</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(215, 15%, 50%)' }} />
            <Tooltip contentStyle={{ background: 'hsl(230, 28%, 7%)', border: '1px solid hsl(230, 15%, 14%)', borderRadius: '8px', fontSize: '12px', color: 'hsl(214, 32%, 91%)' }} />
            <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={28} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Expense table with filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="card-surface rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-medium text-[15px] text-foreground">All Expenses</h2>
            <div className="flex gap-1">
              {['all', 'pending', 'approved', 'rejected'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium capitalize transition-all ${
                    filter === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input className="input-surface pl-9 py-1.5 text-xs w-48" placeholder="Search expenses..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="label-upper px-5 py-3">Employee</th>
                <th className="label-upper px-5 py-3">Description</th>
                <th className="label-upper px-5 py-3">Amount</th>
                <th className="label-upper px-5 py-3">Category</th>
                <th className="label-upper px-5 py-3">Status</th>
                <th className="label-upper px-5 py-3">Progress</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense, i) => (
                <motion.tr key={expense.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-t border-border table-row-hover transition-all">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground">{expense.avatar}</div>
                      <span className="text-sm text-foreground font-medium">{expense.employee}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-[200px] truncate">{expense.description}</td>
                  <td className="px-5 py-3.5 text-sm font-mono font-medium text-foreground">{formatCurrency(expense.convertedAmount)}</td>
                  <td className="px-5 py-3.5"><span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{expense.category}</span></td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium capitalize ${(statusColors as any)[expense.status]}`}>{expense.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <ApprovalProgress currentStep={expense.step} totalSteps={expense.totalSteps} approvers={expense.approvers} status={expense.status} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminOverview;
