import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency } from '@/data/mockData';
import { ApprovalProgress } from '@/components/ApprovalProgress';
import { getExpenses } from '@/services/api';
import { toast } from 'sonner';

const statusBorder = {
  pending: 'border-l-warning',
  approved: 'border-l-success',
  rejected: 'border-l-destructive',
};

const MyExpenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Expenses" subtitle="Track your expense claims" />

      {/* Summary pills */}
      <div className="flex gap-3 mb-8">
        {[
          { label: 'Pending', count: expenses.filter(e => e.status === 'pending').length, color: 'bg-warning/10 text-warning' },
          { label: 'Approved', count: expenses.filter(e => e.status === 'approved').length, color: 'bg-success/10 text-success' },
          { label: 'Rejected', count: expenses.filter(e => e.status === 'rejected').length, color: 'bg-destructive/10 text-destructive' },
        ].map(p => (
          <span key={p.label} className={`px-3 py-1.5 rounded-full text-xs font-medium ${p.color}`}>
            {p.label}: {p.count}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-info/20 to-transparent" />
        <div className="space-y-4">
          {expenses.map((expense, i) => (
            <motion.div key={expense.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex gap-4">
              <div className="relative flex-shrink-0 w-12 flex justify-center pt-5">
                <div className={`w-3 h-3 rounded-full ${
                  expense.status === 'approved' ? 'bg-success' :
                  expense.status === 'rejected' ? 'bg-destructive' :
                  'bg-warning animate-pulse'
                }`} />
              </div>
              <div className={`flex-1 card-surface rounded-xl p-5 border-l-2 ${(statusBorder as any)[expense.status]}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{expense.description}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{expense.date} · {expense.category}</p>
                  </div>
                  <span className="font-mono font-bold text-lg text-foreground">{formatCurrency(expense.convertedAmount)}</span>
                </div>
                <ApprovalProgress currentStep={expense.step} totalSteps={expense.totalSteps} approvers={expense.approvers} status={expense.status} />
              </div>
            </motion.div>
          ))}
          {!loading && expenses.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No expenses yet. Submit your first one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyExpenses;
