export const mockStats = {
  admin: [
    { label: 'Total Requests', value: 156, icon: 'receipt', sparkline: [20, 35, 28, 45, 38, 52, 48] },
    { label: 'Pending', value: 12, icon: 'clock', sparkline: [5, 8, 6, 12, 10, 15, 12] },
    { label: 'Approved', value: 124, icon: 'check-circle', sparkline: [10, 15, 20, 30, 35, 42, 47] },
    { label: 'Rejected', value: 20, icon: 'x-circle', sparkline: [3, 5, 2, 7, 4, 6, 5] },
    { label: 'Team Size', value: 8, icon: 'users', sparkline: [5, 5, 6, 7, 7, 8, 8] },
  ],
  director: [
    { label: 'Total Spend', value: 584500, prefix: '₹', icon: 'receipt', sparkline: [120, 135, 128, 145, 138, 152, 148] },
    { label: 'Pending Value', value: 45200, prefix: '₹', icon: 'clock', sparkline: [15, 28, 16, 32, 20, 35, 22] },
    { label: 'Approved Count', value: 124, icon: 'check-circle', sparkline: [10, 15, 20, 30, 35, 42, 47] },
    { label: 'Rejected Count', value: 20, icon: 'x-circle', sparkline: [3, 5, 2, 7, 4, 6, 5] },
  ],
};

export const mockExpenses = [
  { id: '1', employee: 'Arjun Mehta', role: 'employee', avatar: 'AM', amount: 8500, currency: 'INR', convertedAmount: 8500, category: 'Travel', vendor: 'IndiGo Airlines', description: 'IndiGo Airlines - Delhi to Bangalore', date: '2026-03-28', status: 'pending' as const, step: 1, totalSteps: 3, approvers: ['Manager', 'Finance', 'Director'] },
  { id: '2', employee: 'Priya Sharma', role: 'employee', avatar: 'PS', amount: 2300, currency: 'INR', convertedAmount: 2300, category: 'Food', vendor: 'Taj Palace', description: 'Client dinner at Taj Palace', date: '2026-03-27', status: 'pending' as const, step: 2, totalSteps: 3, approvers: ['Manager', 'Finance', 'Director'] },
  { id: '3', employee: 'Rahul Verma', role: 'employee', avatar: 'RV', amount: 15000, currency: 'INR', convertedAmount: 15000, category: 'Hotel', vendor: 'Hyatt Regency', description: 'Hyatt Regency - 2 nights', date: '2026-03-26', status: 'approved' as const, step: 3, totalSteps: 3, approvers: ['Manager', 'Finance', 'Director'] },
  { id: '4', employee: 'Neha Gupta', role: 'employee', avatar: 'NG', amount: 450, currency: 'USD', convertedAmount: 37800, category: 'Software', vendor: 'Figma Inc.', description: 'Annual Figma License', date: '2026-03-25', status: 'rejected' as const, step: 1, totalSteps: 3, approvers: ['Manager', 'Finance', 'Director'] },
  { id: '5', employee: 'Vikram Singh', role: 'employee', avatar: 'VS', amount: 3200, currency: 'INR', convertedAmount: 3200, category: 'Transport', vendor: 'Uber', description: 'Uber rides - March', date: '2026-03-24', status: 'approved' as const, step: 3, totalSteps: 3, approvers: ['Manager', 'Finance', 'Director'] },
  { id: '6', employee: 'Ananya Reddy', role: 'employee', avatar: 'AR', amount: 6800, currency: 'INR', convertedAmount: 6800, category: 'Equipment', vendor: 'Amazon', description: 'Logitech MX Master 3S + Keychron K2', date: '2026-03-23', status: 'pending' as const, step: 1, totalSteps: 3, approvers: ['Manager', 'Finance', 'Director'] },
  { id: '7', employee: 'Arjun Mehta', role: 'employee', avatar: 'AM', amount: 1200, currency: 'INR', convertedAmount: 1200, category: 'Food', vendor: 'Zomato', description: 'Team lunch order', date: '2026-03-22', status: 'approved' as const, step: 3, totalSteps: 3, approvers: ['Manager', 'Finance', 'Director'] },
  { id: '8', employee: 'Priya Sharma', role: 'employee', avatar: 'PS', amount: 4500, currency: 'INR', convertedAmount: 4500, category: 'Medical', vendor: 'Apollo Hospital', description: 'Annual health checkup', date: '2026-03-21', status: 'pending' as const, step: 1, totalSteps: 3, approvers: ['Manager', 'Finance', 'Director'] },
];

export const mockTeam = [
  { id: '1', name: 'Arjun Mehta', email: 'arjun@clearclaim.io', role: 'employee' as const, department: 'Engineering', manager: 'Vikram Singh' },
  { id: '2', name: 'Priya Sharma', email: 'priya@clearclaim.io', role: 'employee' as const, department: 'Design', manager: 'Neha Gupta' },
  { id: '3', name: 'Vikram Singh', email: 'vikram@clearclaim.io', role: 'manager' as const, department: 'Engineering', manager: null },
  { id: '4', name: 'Neha Gupta', email: 'neha@clearclaim.io', role: 'manager' as const, department: 'Design', manager: null },
  { id: '5', name: 'Rahul Verma', email: 'rahul@clearclaim.io', role: 'employee' as const, department: 'Sales', manager: 'Vikram Singh' },
  { id: '6', name: 'Ananya Reddy', email: 'ananya@clearclaim.io', role: 'employee' as const, department: 'Marketing', manager: 'Neha Gupta' },
  { id: '7', name: 'Ravi Kumar', email: 'ravi@clearclaim.io', role: 'finance' as const, department: 'Finance', manager: null },
  { id: '8', name: 'Sunita Patel', email: 'sunita@clearclaim.io', role: 'director' as const, department: 'Executive', manager: null },
];

export const mockApprovalChain = [
  { id: '1', role: 'Manager', name: 'Direct Manager', order: 1 },
  { id: '2', role: 'Finance', name: 'Finance Head', order: 2 },
  { id: '3', role: 'Director', name: 'Director', order: 3 },
];

export const categories = [
  { name: 'Travel', icon: 'plane', color: '#00b4d8' },
  { name: 'Food', icon: 'utensils', color: '#f59e0b' },
  { name: 'Hotel', icon: 'building', color: '#8b5cf6' },
  { name: 'Transport', icon: 'car', color: '#10b981' },
  { name: 'Medical', icon: 'heart', color: '#ef4444' },
  { name: 'Office', icon: 'briefcase', color: '#14b8a6' },
  { name: 'Entertainment', icon: 'star', color: '#ec4899' },
  { name: 'Other', icon: 'more-horizontal', color: '#64748b' },
];

export const currencies = [
  { code: 'INR', symbol: '₹', flag: '🇮🇳', rate: 1 },
  { code: 'USD', symbol: '$', flag: '🇺🇸', rate: 84 },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', rate: 91 },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', rate: 106 },
  { code: 'AED', symbol: 'د.إ', flag: '🇦🇪', rate: 22.9 },
];

export const formatCurrency = (amount: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const monthlyData = [
  { name: 'Oct', amount: 45000 },
  { name: 'Nov', amount: 62000 },
  { name: 'Dec', amount: 38000 },
  { name: 'Jan', amount: 71000 },
  { name: 'Feb', amount: 55000 },
  { name: 'Mar', amount: 84000 },
];

export const categoryBreakdown = [
  { name: 'Travel', amount: 185000, count: 45, pct: 32 },
  { name: 'Food', amount: 67000, count: 38, pct: 12 },
  { name: 'Hotel', amount: 142000, count: 22, pct: 25 },
  { name: 'Transport', amount: 54000, count: 56, pct: 9 },
  { name: 'Medical', amount: 38000, count: 12, pct: 7 },
  { name: 'Equipment', amount: 89000, count: 15, pct: 15 },
];
