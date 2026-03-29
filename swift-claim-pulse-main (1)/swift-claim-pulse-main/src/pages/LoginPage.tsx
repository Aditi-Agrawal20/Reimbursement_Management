import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiLogin } from '@/services/api';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('admin@clearclaim.io');
  const [password, setPassword] = useState('demo1234');
  const { login, companyExists } = useRole();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      login(data.token, data.user);

      if (data.user.must_change_password) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
      {/* Ambient orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,229,160,0.08) 0%, transparent 70%)',
          top: '-200px', left: '-150px',
          animation: 'float-orb 20s ease-in-out infinite alternate',
        }}
      />
      <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
          bottom: '-100px', right: '-50px',
          animation: 'float-orb 20s ease-in-out infinite alternate-reverse',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-strong rounded-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #00e5a0, #00b4d8)', boxShadow: '0 0 40px rgba(0,229,160,0.2)' }}>
              <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="font-display font-bold text-2xl text-foreground">ClearClaim</h1>
            <p className="text-muted-foreground text-sm mt-1 font-body">From receipt to reimbursement — in minutes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-upper block mb-1.5">Email</label>
              <input className="input-surface w-full" type="email" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Password</label>
              <div className="relative">
                <input className="input-surface w-full pr-10" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/setup')}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-body"
              title={companyExists ? 'Company already registered. Contact your admin.' : undefined}
            >
              First time? Set up your company →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
