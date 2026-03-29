import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiSetup, checkSetup } from '@/services/api';

const countries = [
  { name: 'India', flag: '🇮🇳', currency: 'INR' },
  { name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { name: 'UAE', flag: '🇦🇪', currency: 'AED' },
  { name: 'Germany', flag: '🇪🇺', currency: 'EUR' },
];

const SetupPage = () => {
  const { login, setCompanyExists } = useRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [country, setCountry] = useState('India');
  const [adminName, setAdminName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const selectedCountry = countries.find(c => c.name === country);

  // Check if setup was already done
  useEffect(() => {
    checkSetup()
      .then(data => {
        if (data.setup_complete) {
          toast.info('Setup already complete. Please log in.');
          navigate('/');
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  if (checking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await apiSetup({
        company_name: companyName,
        country,
        currency: selectedCountry?.currency || 'INR',
        admin_name: adminName,
        admin_email: adminEmail,
        password,
      });

      setCompanyExists(true);
      login(data.token, data.user);
      navigate('/dashboard');
      toast.success('Company created! Welcome to ClearClaim.');
    } catch (err: any) {
      toast.error(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
      <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,229,160,0.08) 0%, transparent 70%)', top: '-200px', left: '-150px', animation: 'float-orb 20s ease-in-out infinite alternate' }}
      />
      <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', bottom: '-100px', right: '-50px', animation: 'float-orb 20s ease-in-out infinite alternate-reverse' }}
      />

      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-lg mx-4">
        <div className="glass-strong rounded-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 40px rgba(124,58,237,0.2)' }}>
              <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="font-display font-bold text-2xl text-foreground">Set Up Your Company</h1>
            <p className="text-muted-foreground text-sm mt-1 font-body">One-time admin account setup</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-upper block mb-1.5">Admin Full Name</label>
              <input className="input-surface w-full" placeholder="Arjun Mehta" required
                value={adminName} onChange={e => setAdminName(e.target.value)} />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Company Name</label>
              <input className="input-surface w-full" placeholder="Acme Corp" required
                value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Country</label>
              <select className="input-surface w-full" value={country} onChange={e => setCountry(e.target.value)}>
                {countries.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
              {selectedCountry && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">Default currency: {selectedCountry.flag} {selectedCountry.currency}</p>
              )}
            </div>
            <div>
              <label className="label-upper block mb-1.5">Admin Email</label>
              <input className="input-surface w-full" type="email" placeholder="admin@company.com" required
                value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-upper block mb-1.5">Password</label>
                <input className="input-surface w-full" type="password" placeholder="••••••••" required
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="label-upper block mb-1.5">Confirm Password</label>
                <input className="input-surface w-full" type="password" placeholder="••••••••" required
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Company <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <button onClick={() => navigate('/')} className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground mt-4 font-body transition-colors">
            ← Back to login
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SetupPage;
