import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, Building, Trash2, AlertTriangle, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { roleColors, roleLabels } from '@/hooks/useRole';
import { toast } from 'sonner';
import { getUsers, getManagers, createUser, deleteUser } from '@/services/api';

const AdminTeam = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [managerId, setManagerId] = useState('');
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [users, mgrs] = await Promise.all([getUsers(), getManagers()]);
      setTeam(users);
      setManagers(mgrs);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load team');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await createUser({
        full_name: name,
        email,
        role,
        manager_id: role === 'employee' ? managerId : undefined,
        department: department || undefined,
      });
      toast.success(data.message || `${name} added as ${role}.`);
      setName(''); setEmail(''); setDepartment(''); setManagerId('');
      loadData(); // Refresh team list
    } catch (err: any) {
      toast.error(err.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteUser(deleteTarget.id);
      toast.success(result.message || `${deleteTarget.name} has been removed.`);
      setDeleteTarget(null);
      loadData(); // Refresh team list
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Team Management" subtitle="Add and manage team members" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Create form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 card-surface rounded-xl p-6">
          <h2 className="font-display font-medium text-[15px] text-foreground mb-5 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Add Team Member
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label-upper block mb-1.5">Full Name</label>
              <input className="input-surface w-full" value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" required />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Email</label>
              <input className="input-surface w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" required />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Role</label>
              <select className="input-surface w-full" value={role} onChange={e => setRole(e.target.value)}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="finance">Finance</option>
                <option value="director">Director</option>
              </select>
            </div>
            {role === 'employee' && (
              <div>
                <label className="label-upper block mb-1.5">Assign Manager</label>
                <select className="input-surface w-full" value={managerId} onChange={e => setManagerId(e.target.value)}>
                  <option value="">Select a manager</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label-upper block mb-1.5">Department <span className="text-muted-foreground">(optional)</span></label>
              <input className="input-surface w-full" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded bg-primary/30" />
              <span>Temporary password will be sent to their email</span>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </form>
        </motion.div>

        {/* Team grid */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {team.length === 0 ? (
            <div className="col-span-2 text-center py-16">
              <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No team members yet. Add your first one →</p>
            </div>
          ) : team.map((member, i) => {
            const color = roleColors[member.role as keyof typeof roleColors] || '#64748b';
            return (
              <motion.div key={member.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="card-surface rounded-xl p-4 group relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-foreground"
                    style={{ background: `${color}15`, boxShadow: `0 0 0 2px ${color}30` }}>
                    {member.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Mail className="w-3 h-3" /> {member.email}
                    </div>
                  </div>
                  {member.role !== 'admin' && (
                    <button
                      onClick={() => setDeleteTarget(member)}
                      className="opacity-0 group-hover:opacity-100 transition-all w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title={`Remove ${member.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: `${color}15`, color }}>
                    {member.role}
                  </span>
                  {member.department && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Building className="w-3 h-3" /> {member.department}
                    </span>
                  )}
                  {member.manager && (
                    <span className="text-[10px] text-muted-foreground">Mgr: {member.manager}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="card-surface rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-base font-display font-medium text-foreground">Remove Team Member</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                </div>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-muted rounded-lg p-4 mb-5">
                <p className="text-sm text-foreground">
                  Are you sure you want to remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This will permanently delete their account and they will lose access to ClearClaim. Their existing expenses will remain in the system.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminTeam;
