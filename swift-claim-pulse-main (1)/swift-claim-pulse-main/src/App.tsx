import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/hooks/useRole";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import SetupPage from "@/pages/SetupPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminTeam from "@/pages/admin/AdminTeam";
import ApprovalRules from "@/pages/admin/ApprovalRules";
import SubmitExpense from "@/pages/employee/SubmitExpense";
import MyExpenses from "@/pages/employee/MyExpenses";
import PendingApprovals from "@/pages/manager/PendingApprovals";
import TeamOverview from "@/pages/manager/TeamOverview";
import FinanceExpenses from "@/pages/finance/FinanceExpenses";
import CompanyOverview from "@/pages/director/CompanyOverview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const DashboardRouter = () => {
  const { role } = useRole();

  if (role === 'admin') {
    return (
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="team" element={<AdminTeam />} />
        <Route path="rules" element={<ApprovalRules />} />
      </Routes>
    );
  }

  if (role === 'employee') {
    return (
      <Routes>
        <Route index element={<SubmitExpense />} />
        <Route path="my-expenses" element={<MyExpenses />} />
      </Routes>
    );
  }

  if (role === 'finance') {
    return (
      <Routes>
        <Route index element={<PendingApprovals />} />
        <Route path="all-expenses" element={<FinanceExpenses />} />
      </Routes>
    );
  }

  if (role === 'director') {
    return (
      <Routes>
        <Route index element={<PendingApprovals />} />
        <Route path="company-overview" element={<CompanyOverview />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route index element={<PendingApprovals />} />
      <Route path="team-overview" element={<TeamOverview />} />
    </Routes>
  );
};

const ProtectedRoute = () => {
  const { isLoggedIn, mustChangePassword } = useRole();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  return <AppLayout />;
};

const AppRoutes = () => {
  const { isLoggedIn } = useRole();
  return (
    <Routes>
      <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/dashboard/*" element={<ProtectedRoute />}>
        <Route path="*" element={<DashboardRouter />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <RoleProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </RoleProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
