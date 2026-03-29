import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Plus, Percent, UserCheck, GitBranch, Loader2, Trash2, Shield, X, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getRules, createRule, updateRule, reorderRuleSteps, getEligibleApprovers, getUsers } from '@/services/api';

const ruleTypes = [
  { id: 'sequential', icon: GitBranch, title: 'Sequential', desc: 'Each approver in order' },
  { id: 'percentage', icon: Percent, title: 'Percentage', desc: 'Required % to approve' },
  { id: 'specific', icon: UserCheck, title: 'Specific Person', desc: 'Named approver auto-clears' },
];

type StepItem = {
  id: string;
  role: string;
  label: string;
  approver_id?: string;
  approver_name?: string;
  step_order: number;
};

type EligibleApprover = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ApprovalRules = () => {
  const [selectedRule, setSelectedRule] = useState('sequential');
  const [percentage, setPercentage] = useState(60);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sequential chain state
  const [chain, setChain] = useState<StepItem[]>([
    { id: 'step-1', role: 'manager', label: 'Direct Manager', step_order: 1 },
    { id: 'step-2', role: 'finance', label: 'Finance Head', step_order: 2 },
    { id: 'step-3', role: 'director', label: 'Director', step_order: 3 },
  ]);

  // Specific person state
  const [specificApprover, setSpecificApprover] = useState<string>('');
  const [eligibleApprovers, setEligibleApprovers] = useState<EligibleApprover[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showApproverDropdown, setShowApproverDropdown] = useState(false);

  useEffect(() => {
    loadRules();
    loadApprovers();
  }, []);

  const loadApprovers = async () => {
    try {
      const [approvers, users] = await Promise.all([
        getEligibleApprovers(),
        getUsers(),
      ]);
      setEligibleApprovers(approvers);
      setAllUsers(users);
    } catch (err: any) {
      // Silently fail — non-critical
      console.error('Failed to load approvers:', err);
    }
  };

  const loadRules = async () => {
    try {
      const data = await getRules();
      setRules(data);
      if (data.length > 0) {
        const activeRule = data[0];
        setSelectedRule(activeRule.type);

        if (activeRule.type === 'percentage' && activeRule.config?.percentage) {
          setPercentage(activeRule.config.percentage);
        }

        if (activeRule.type === 'sequential' && activeRule.config?.steps) {
          const steps = activeRule.config.steps
            .sort((a: any, b: any) => (a.step_order || 0) - (b.step_order || 0))
            .map((s: any, i: number) => ({
              id: `step-${i + 1}-${Date.now()}`,
              role: s.role || '',
              label: s.label || s.role || `Step ${i + 1}`,
              approver_id: s.approver_id,
              approver_name: s.approver_name,
              step_order: i + 1,
            }));
          if (steps.length > 0) setChain(steps);
        }

        if (activeRule.type === 'specific' && activeRule.config?.approver_id) {
          setSpecificApprover(activeRule.config.approver_id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = useCallback((newOrder: StepItem[]) => {
    // Re-number the steps to ensure continuous ordering
    const renumbered = newOrder.map((item, i) => ({
      ...item,
      step_order: i + 1,
    }));
    setChain(renumbered);
  }, []);

  const addStep = () => {
    const newId = `step-${chain.length + 1}-${Date.now()}`;
    setChain([...chain, {
      id: newId,
      role: '',
      label: `Step ${chain.length + 1}`,
      step_order: chain.length + 1,
    }]);
  };

  const removeStep = (id: string) => {
    if (chain.length <= 1) {
      toast.error('At least one step is required');
      return;
    }
    const filtered = chain.filter(s => s.id !== id);
    setChain(filtered.map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const updateStepRole = (id: string, role: string) => {
    const roleLabels: Record<string, string> = {
      manager: 'Direct Manager',
      finance: 'Finance Head',
      director: 'Director',
    };
    setChain(chain.map(s =>
      s.id === id ? { ...s, role, label: roleLabels[role] || role, approver_id: undefined, approver_name: undefined } : s
    ));
  };

  const updateStepApprover = (stepId: string, approver: any) => {
    setChain(chain.map(s =>
      s.id === stepId ? { ...s, approver_id: approver.id, approver_name: approver.name, label: approver.name, role: approver.role } : s
    ));
  };

  const handleSaveRule = async () => {
    setSaving(true);
    try {
      const config: any = {};

      if (selectedRule === 'percentage') {
        config.percentage = percentage;
      }

      if (selectedRule === 'sequential') {
        // Validate: no empty steps
        const hasEmpty = chain.some(s => !s.role && !s.approver_id);
        if (hasEmpty) {
          toast.error('All steps must have a role or approver assigned');
          setSaving(false);
          return;
        }
        config.steps = chain.map((s, i) => ({
          role: s.role,
          label: s.label,
          approver_id: s.approver_id,
          approver_name: s.approver_name,
          step_order: i + 1,
        }));
      }

      if (selectedRule === 'specific') {
        if (!specificApprover) {
          toast.error('Please select a specific approver (Finance or Director)');
          setSaving(false);
          return;
        }
        config.type = 'specific';
        config.approver_id = specificApprover;
      }

      if (rules.length > 0) {
        await updateRule(rules[0].id, { type: selectedRule, config });
        toast.success('Approval rule updated');
      } else {
        await createRule({
          name: `${selectedRule.charAt(0).toUpperCase() + selectedRule.slice(1)} Rule`,
          description: `${selectedRule} approval chain`,
          type: selectedRule,
          config,
        });
        toast.success('Approval rule created');
      }
      loadRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const selectedApproverObj = eligibleApprovers.find(a => a.id === specificApprover);

  const roleColors: Record<string, string> = {
    manager: '#f59e0b',
    finance: '#10b981',
    director: '#8b5cf6',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-[28px] gradient-text">Approval Rules</h1>
        <p className="text-muted-foreground text-sm font-body mt-1">Configure approval chain and conditions</p>
      </div>

      {/* Rule type selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ruleTypes.map((rule) => (
          <motion.button
            key={rule.id}
            onClick={() => setSelectedRule(rule.id)}
            whileTap={{ scale: 0.98 }}
            className={`p-5 rounded-xl text-left transition-all ${
              selectedRule === rule.id
                ? 'card-elevated border-primary/40 shadow-[0_0_0_1px_rgba(0,229,160,0.15),0_0_24px_rgba(0,229,160,0.08)]'
                : 'card-surface'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
              selectedRule === rule.id ? 'bg-gradient-to-br from-emerald-400 to-cyan-500' : 'bg-muted'
            }`}>
              <rule.icon className={`w-5 h-5 ${selectedRule === rule.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            </div>
            <h3 className="font-display font-medium text-sm text-foreground">{rule.title}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">{rule.desc}</p>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* === SEQUENTIAL: Drag-and-drop chain === */}
        {selectedRule === 'sequential' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface rounded-xl p-6"
          >
            <h2 className="font-display font-medium text-[15px] text-foreground mb-1">Approval Chain</h2>
            <p className="text-[11px] text-muted-foreground mb-5">Drag to reorder steps. Expenses flow through each step in order.</p>

            <div className="space-y-2 relative">
              {/* Connecting line */}
              {chain.length > 1 && (
                <div className="absolute left-[18px] top-6 bottom-16 w-[2px] border-l-2 border-dashed border-primary/20 z-0" />
              )}

              <Reorder.Group axis="y" values={chain} onReorder={handleReorder} className="space-y-2 relative z-10">
                {chain.map((step, i) => (
                  <Reorder.Item key={step.id} value={step} className="list-none">
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-layer-4 group cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-primary-foreground flex-shrink-0"
                        style={{
                          background: roleColors[step.role]
                            ? `linear-gradient(135deg, ${roleColors[step.role]}, ${roleColors[step.role]}99)`
                            : 'linear-gradient(135deg, #10b981, #06b6d4)',
                        }}
                      >
                        {step.step_order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <select
                          value={step.role}
                          onChange={e => updateStepRole(step.id, e.target.value)}
                          className="input-surface w-full text-sm py-1.5"
                        >
                          <option value="">Select role...</option>
                          <option value="manager">Direct Manager</option>
                          <option value="finance">Finance Head</option>
                          <option value="director">Director</option>
                        </select>
                      </div>
                      <button
                        onClick={() => removeStep(step.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              <button
                onClick={addStep}
                className="w-full py-2.5 rounded-lg border-2 border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-primary text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Step
              </button>
            </div>

            <button
              onClick={handleSaveRule}
              disabled={saving}
              className="w-full btn-primary mt-4 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Rule'}
            </button>
          </motion.div>
        )}

        {/* === SPECIFIC PERSON: Finance/Director selector === */}
        {selectedRule === 'specific' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface rounded-xl p-6"
          >
            <h2 className="font-display font-medium text-[15px] text-foreground mb-1">Specific Approver</h2>
            <p className="text-[11px] text-muted-foreground mb-5">
              Select one person whose approval immediately clears the expense.
            </p>

            {/* Restriction badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/5 border border-warning/20 mb-4">
              <Shield className="w-4 h-4 text-warning flex-shrink-0" />
              <span className="text-[11px] text-warning">
                Only <strong>Finance</strong> or <strong>Director</strong> roles can be selected
              </span>
            </div>

            {/* Custom dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowApproverDropdown(!showApproverDropdown)}
                className="w-full input-surface flex items-center justify-between py-3 px-4"
              >
                {selectedApproverObj ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                      style={{
                        background: selectedApproverObj.role === 'finance'
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      }}
                    >
                      {selectedApproverObj.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{selectedApproverObj.name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{selectedApproverObj.role} · {selectedApproverObj.email}</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Select an approver...</span>
                )}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showApproverDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showApproverDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-layer-4 border border-border rounded-lg shadow-xl z-50 overflow-hidden"
                  >
                    {eligibleApprovers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No Finance or Director users found in your team
                      </div>
                    ) : (
                      eligibleApprovers.map(approver => (
                        <button
                          key={approver.id}
                          onClick={() => {
                            setSpecificApprover(approver.id);
                            setShowApproverDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
                            specificApprover === approver.id ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                            style={{
                              background: approver.role === 'finance'
                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                            }}
                          >
                            {approver.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{approver.name}</div>
                            <div className="text-[11px] text-muted-foreground">{approver.email}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                            approver.role === 'finance' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'
                          }`}>
                            {approver.role}
                          </span>
                          {specificApprover === approver.id && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleSaveRule}
              disabled={saving}
              className="w-full btn-primary mt-6 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Rule'}
            </button>
          </motion.div>
        )}

        {/* === PERCENTAGE: Threshold slider === */}
        {selectedRule === 'percentage' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface rounded-xl p-6"
          >
            <h2 className="font-display font-medium text-[15px] text-foreground mb-5">Approval Chain</h2>
            <div className="space-y-3 relative">
              <div className="absolute left-[18px] top-6 bottom-6 w-[2px] border-l-2 border-dashed border-primary/30" />
              {chain.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg bg-layer-4 relative">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{step.label}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">{step.role}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveRule}
              disabled={saving}
              className="w-full btn-primary mt-4 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Rule'}
            </button>
          </motion.div>
        )}

        {/* Right panel — rule explanation / percentage slider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface rounded-xl p-6"
        >
          {selectedRule === 'percentage' ? (
            <>
              <h2 className="font-display font-medium text-[15px] text-foreground mb-5">Approval Threshold</h2>
              <div className="space-y-6">
                <div className="text-center">
                  <span className="font-display font-bold text-[48px] gradient-text-accent">{percentage}%</span>
                  <p className="text-sm text-muted-foreground mt-1">of approvers must approve</p>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={10}
                  value={percentage}
                  onChange={e => setPercentage(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </>
          ) : selectedRule === 'specific' ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                <UserCheck className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-display font-medium text-sm text-foreground mb-2">Instant Approval</h3>
              <p className="text-[12px] text-muted-foreground text-center max-w-[280px] leading-relaxed">
                When the selected person <strong className="text-foreground">approves</strong>, the expense is <strong className="text-success">immediately approved</strong>. If they <strong className="text-destructive">reject</strong>, it's instantly rejected. All other steps are skipped.
              </p>
              <div className="flex gap-4 mt-5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Finance eligible
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Director eligible
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <GitBranch className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-display font-medium text-sm text-foreground mb-2">Sequential Flow</h3>
              <p className="text-[12px] text-muted-foreground text-center max-w-[280px] leading-relaxed">
                Expenses flow through each step <strong className="text-foreground">in order</strong>. Drag and drop to rearrange the approval chain. Each step must approve before the next one activates.
              </p>
              <div className="flex gap-4 mt-5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <GripVertical className="w-3 h-3" />
                  Drag to reorder
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Trash2 className="w-3 h-3" />
                  Hover to remove
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ApprovalRules;
