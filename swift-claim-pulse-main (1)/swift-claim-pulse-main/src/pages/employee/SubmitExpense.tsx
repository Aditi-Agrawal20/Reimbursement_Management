import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, Plane, Utensils, Building, Car, Laptop, Monitor, Briefcase, MoreHorizontal, Sparkles, Check, AlertTriangle, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { categories, currencies, formatCurrency } from '@/data/mockData';
import { toast } from 'sonner';
import { createExpense, scanReceipt } from '@/services/api';

const iconMap: Record<string, React.ElementType> = {
  plane: Plane, utensils: Utensils, building: Building, car: Car,
  laptop: Laptop, monitor: Monitor, briefcase: Briefcase, 'more-horizontal': MoreHorizontal,
};

const SubmitExpense = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setHasReceipt(true);
    setOcrWarning(null);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }

    // Call AI OCR to extract data
    setIsScanning(true);
    setScanComplete(false);

    try {
      const result = await scanReceipt(file);

      if (result.success && result.data) {
        const d = result.data;
        if (d.amount) setAmount(String(d.amount));
        if (d.currency) setCurrency(d.currency);
        if (d.date) setDate(d.date);
        if (d.description) setDescription(d.description);
        if (d.vendor) setVendor(d.vendor);
        if (d.category) {
          // Match to available categories (case-insensitive)
          const match = categories.find(
            c => c.name.toLowerCase() === d.category.toLowerCase()
          );
          if (match) setSelectedCategory(match.name);
          else setSelectedCategory(d.category);
        }
        toast.success('Receipt scanned — form auto-filled!');
      } else {
        // OCR failed or returned fallback
        if (result.warning) {
          setOcrWarning(result.warning);
          toast.warning('OCR unavailable — please fill the form manually');
        } else {
          toast.info('Receipt uploaded! Fill in the details below.');
        }
      }
    } catch (err: any) {
      console.error('OCR error:', err);
      setOcrWarning(err.message || 'OCR scan failed');
      toast.error('Receipt scan failed — please fill in the form manually');
    } finally {
      setIsScanning(false);
      setScanComplete(true);
    }
  }, []);

  const clearReceipt = useCallback(() => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setHasReceipt(false);
    setScanComplete(false);
    setOcrWarning(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('currency', currency);
      formData.append('category', selectedCategory);
      formData.append('vendor', vendor);
      formData.append('description', description);
      formData.append('date', date);
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await createExpense(formData);
      toast.success('Expense submitted for approval!');

      // Reset form
      setAmount(''); setDescription(''); setVendor(''); setSelectedCategory('');
      setCurrency('INR'); setHasReceipt(false); setScanComplete(false); setReceiptFile(null);
      setReceiptPreview(null); setOcrWarning(null);
      setDate(new Date().toISOString().split('T')[0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCurr = currencies.find(c => c.code === currency);
  const convertedAmount = amount ? (parseFloat(amount) * (selectedCurr?.rate || 1) / currencies[0].rate) : 0;

  return (
    <div>
      <PageHeader title="Submit Expense" subtitle="Upload a receipt or fill manually" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface rounded-xl p-6"
          >
            <h2 className="font-display font-medium text-[15px] text-foreground mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" /> Receipt Scanner
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body">AI Powered</span>
            </h2>

            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                id="receipt-upload"
                onChange={handleFileSelect}
              />
              <AnimatePresence mode="wait">
                {isScanning ? (
                  <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-56 rounded-lg bg-muted relative overflow-hidden flex items-center justify-center">
                    {receiptPreview && (
                      <img src={receiptPreview} alt="Receipt" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                    )}
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"
                      style={{ animation: 'scan-line 1.5s ease-in-out infinite', top: '50%' }} />
                    <div className="text-center z-10">
                      <Sparkles className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                      <p className="text-sm text-foreground font-body">AI is analyzing your receipt...</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Extracting amount, vendor, category & more</p>
                    </div>
                  </motion.div>
                ) : scanComplete ? (
                  <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg border border-success/20 overflow-hidden">
                    <div className="relative">
                      {receiptPreview ? (
                        <div className="relative h-40 overflow-hidden">
                          <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                        </div>
                      ) : (
                        <div className="h-20 bg-success/5" />
                      )}
                      <div className={`${receiptPreview ? 'absolute bottom-0 left-0 right-0' : ''} p-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-success" />
                          </div>
                          <div>
                            <p className="text-sm text-success font-medium">Receipt scanned!</p>
                            <p className="text-[11px] text-muted-foreground">{receiptFile?.name}</p>
                          </div>
                        </div>
                        <button type="button" onClick={clearReceipt}
                          className="w-7 h-7 rounded-full bg-muted/80 hover:bg-destructive/20 flex items-center justify-center transition-colors">
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                    {ocrWarning && (
                      <div className="px-4 pb-3 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-warning">{ocrWarning}</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.label key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    htmlFor="receipt-upload"
                    className="h-48 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer flex items-center justify-center transition-all group block">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mx-auto mb-2 transition-colors" />
                      <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Click to upload receipt</p>
                      <p className="text-[11px] text-muted-foreground mt-1">AI will auto-fill the form</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-2">Supports JPEG, PNG, WebP, PDF (max 10MB)</p>
                    </div>
                  </motion.label>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Category selector */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <label className="label-upper block mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => {
                const Icon = iconMap[cat.icon] || MoreHorizontal;
                const isSelected = selectedCategory === cat.name;
                return (
                  <button key={cat.name} type="button" onClick={() => setSelectedCategory(cat.name)}
                    className={`p-3 rounded-lg text-center transition-all ${
                      isSelected ? 'bg-primary/10 border border-primary/30 scale-105' : 'bg-muted border border-transparent hover:border-border'
                    }`}>
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-[10px] ${isSelected ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Amount + Currency */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label-upper block mb-1.5">Amount</label>
              <input className="input-surface w-full font-mono" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Currency</label>
              <select className="input-surface w-full" value={currency} onChange={e => setCurrency(e.target.value)}>
                {currencies.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
            </div>
            {amount && currency !== 'INR' && (
              <p className="col-span-3 text-xs text-muted-foreground font-mono">≈ {formatCurrency(convertedAmount)} (company currency)</p>
            )}
          </motion.div>

          {/* Vendor + Description + Date */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
            <div>
              <label className="label-upper block mb-1.5">Vendor</label>
              <input className="input-surface w-full" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. IndiGo Airlines" />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Description</label>
              <input className="input-surface w-full" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" required />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Date</label>
              <input className="input-surface w-full" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </motion.div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-lg font-body font-medium text-sm bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all">
            {submitting ? 'Submitting...' : 'Submit Expense'}
          </button>
        </form>

        {/* Live preview card */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="card-surface rounded-xl p-6 h-fit sticky top-8">
          <h2 className="font-display font-medium text-[15px] text-foreground mb-5">Preview</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="label-upper">Amount</span>
              <span className="font-mono font-bold text-2xl text-foreground">{amount ? formatCurrency(parseFloat(amount), currency) : '—'}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between">
              <span className="label-upper">Category</span>
              <span className="text-sm text-foreground">{selectedCategory || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="label-upper">Vendor</span>
              <span className="text-sm text-foreground text-right max-w-[200px] truncate">{vendor || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="label-upper">Description</span>
              <span className="text-sm text-foreground text-right max-w-[200px] truncate">{description || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="label-upper">Date</span>
              <span className="text-sm text-foreground">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="label-upper">Receipt</span>
              <span className={`text-sm ${hasReceipt ? 'text-success' : 'text-muted-foreground'}`}>{hasReceipt ? '✓ Uploaded' : 'Not uploaded'}</span>
            </div>
            {amount && currency !== 'INR' && (
              <>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="label-upper">Converted (INR)</span>
                  <span className="font-mono text-sm text-foreground">{formatCurrency(convertedAmount)}</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SubmitExpense;
