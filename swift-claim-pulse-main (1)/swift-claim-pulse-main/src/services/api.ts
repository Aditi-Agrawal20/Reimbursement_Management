const API_BASE = '/api';

/**
 * Get stored auth token
 */
function getToken(): string | null {
  return localStorage.getItem('clearclaim_token');
}

/**
 * Core fetch wrapper with auth
 */
async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle CSV download
  if (res.headers.get('content-type')?.includes('text/csv')) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────────
export async function checkSetup(): Promise<{ setup_complete: boolean }> {
  return apiFetch('/check-setup');
}

export async function apiSetup(data: {
  company_name: string; country: string; currency: string;
  admin_name: string; admin_email: string; password: string;
}) {
  return apiFetch('/setup', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiLogin(email: string, password: string) {
  return apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function apiChangePassword(old_password: string, new_password: string) {
  return apiFetch('/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password }),
  });
}

// ─── Users ────────────────────────────────────────────────────
export async function getUsers() {
  return apiFetch('/users');
}

export async function getManagers() {
  return apiFetch('/users/managers');
}

export async function createUser(data: {
  full_name: string; email: string; role: string;
  manager_id?: string; department?: string;
}) {
  return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUser(id: string, data: any) {
  return apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteUser(id: string) {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
}

// ─── Expenses ─────────────────────────────────────────────────
export async function getExpenses(params?: { status?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return apiFetch(`/expenses${qs ? `?${qs}` : ''}`);
}

export async function getExpense(id: string) {
  return apiFetch(`/expenses/${id}`);
}

export async function createExpense(formData: FormData) {
  return apiFetch('/expenses', { method: 'POST', body: formData });
}

export async function scanReceipt(file: File) {
  const formData = new FormData();
  formData.append('receipt', file);
  return apiFetch('/ocr/receipt', { method: 'POST', body: formData });
}

export async function exportExpensesCSV() {
  return apiFetch('/expenses/export/csv');
}

export async function getExpenseStats() {
  return apiFetch('/expenses/stats');
}

// ─── Approvals ────────────────────────────────────────────────
export async function getPendingApprovals() {
  return apiFetch('/approvals/pending');
}

export async function approveExpense(expense_id: string, comment?: string, step_id?: string) {
  return apiFetch('/approve', {
    method: 'POST',
    body: JSON.stringify({ expense_id, step_id, comment }),
  });
}

export async function rejectExpense(expense_id: string, comment?: string, step_id?: string) {
  return apiFetch('/reject', {
    method: 'POST',
    body: JSON.stringify({ expense_id, step_id, comment }),
  });
}

// ─── Rules ────────────────────────────────────────────────────
export async function getRules() {
  return apiFetch('/rules');
}

export async function createRule(data: {
  name: string; description?: string; type: string; config?: any;
}) {
  return apiFetch('/rules', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateRule(id: string, data: any) {
  return apiFetch(`/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function reorderRuleSteps(id: string, steps: any[]) {
  return apiFetch(`/rules/${id}/reorder`, { method: 'PUT', body: JSON.stringify({ steps }) });
}

export async function deleteRule(id: string) {
  return apiFetch(`/rules/${id}`, { method: 'DELETE' });
}

export async function getEligibleApprovers() {
  return apiFetch('/rules/approvers');
}
