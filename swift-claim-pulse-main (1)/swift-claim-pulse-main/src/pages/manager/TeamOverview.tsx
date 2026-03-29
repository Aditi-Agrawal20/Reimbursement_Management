import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency } from '@/data/mockData';
import { getExpenses, getUsers } from '@/services/api';
import { toast } from 'sonner';

const TeamOverview = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [teamSize, setTeamSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expData, userData] = await Promise.all([getExpenses(), getUsers()]);
      setExpenses(expData);
      setTeamSize(userData.filter((u: any) => u.role === 'employee').length);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.convertedAmount, 0);
  const totalApproved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.convertedAmount, 0);

  const staffData = [
    { name: 'Jan', amount: 45 },
    { name: 'Feb', amount: 80 },
    { name: 'Mar', amount: 75 },
    { name: 'Apr', amount: 84 },
    { name: 'May', amount: 62 },
  ];

  return (
    <div>
      <PageHeader title="Team Overview" subtitle="Expense summary across your team" />

      {/* Summary pills */}
      <div className="flex gap-4 mb-8">
        {[
          { label: 'Pending Total', value: formatCurrency(totalPending), color: 'text-warning' },
          { label: 'Approved Total', value: formatCurrency(totalApproved), color: 'text-success' },
          { label: 'Team Size', value: teamSize.toString(), color: 'text-info' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card-surface rounded-xl p-5 flex-1"
          >
            <div className={`font-mono font-bold text-xl ${item.color}`}>{item.value}</div>
            <div className="label-upper mt-1">{item.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Staff activity chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card-surface rounded-xl p-5 mb-8"
      >
        <h3 className="font-display font-medium text-[15px] text-foreground mb-1">Monthly Activity</h3>
        <p className="text-xs text-muted-foreground mb-4">Expense submissions per month (%)</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={staffData}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(215, 15%, 55%)' }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="amount" fill="hsl(210, 70%, 55%)" radius={[4, 4, 0, 0]} barSize={28} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-surface rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display font-medium text-[15px] text-foreground">All Team Expenses</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="label-upper px-5 py-3 text-left">Employee</th>
              <th className="label-upper px-5 py-3 text-left">Description</th>
              <th className="label-upper px-5 py-3 text-left">Amount</th>
              <th className="label-upper px-5 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr key={expense.id} className="border-t border-border table-row-hover transition-all">
                <td className="px-5 py-3 text-sm text-foreground">{expense.employee}</td>
                <td className="px-5 py-3 text-sm text-muted-foreground">{expense.description}</td>
                <td className="px-5 py-3 text-sm font-mono text-foreground">{formatCurrency(expense.convertedAmount)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-md font-medium capitalize ${
                    expense.status === 'approved' ? 'bg-success/10 text-success' :
                    expense.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                    'bg-warning/10 text-warning'
                  }`}>{expense.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default TeamOverview;
