import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ApprovalProgress } from '@/components/ApprovalProgress';
import { formatCurrency } from '@/data/mockData';
import { toast } from 'sonner';
import { getExpenses, exportExpensesCSV } from '@/services/api';

const statusColors = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

const FinanceExpenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleExport = async () => {
    try {
      await exportExpensesCSV();
      toast.success('CSV exported!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export CSV');
    }
  };

  const filtered = searchQuery
    ? expenses.filter(e =>
        e.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : expenses;

  return (
    <div>
      <PageHeader title="All Expenses" subtitle="Complete expense records across the company">
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </PageHeader>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card-surface rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <h2 className="font-display font-medium text-[15px] text-foreground">All Expenses</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input className="input-surface pl-9 py-1.5 text-xs w-48" placeholder="Search expenses..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button className="input-surface px-3 py-1.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="label-upper px-5 py-3">Employee</th>
                <th className="label-upper px-5 py-3">Description</th>
                <th className="label-upper px-5 py-3">Category</th>
                <th className="label-upper px-5 py-3">Amount</th>
                <th className="label-upper px-5 py-3">Converted</th>
                <th className="label-upper px-5 py-3">Status</th>
                <th className="label-upper px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense, i) => (
                <motion.tr key={expense.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="border-t border-border table-row-hover transition-all">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground">{expense.avatar}</div>
                      <span className="text-sm text-foreground font-medium">{expense.employee}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-[200px] truncate">{expense.description}</td>
                  <td className="px-5 py-3.5"><span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{expense.category}</span></td>
                  <td className="px-5 py-3.5 text-sm font-mono font-medium text-foreground">{formatCurrency(expense.amount, expense.currency)}</td>
                  <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{formatCurrency(expense.convertedAmount)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium capitalize ${(statusColors as any)[expense.status]}`}>{expense.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{expense.date}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default FinanceExpenses;
