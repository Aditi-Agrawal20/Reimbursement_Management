import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, CheckCircle, Users, XCircle } from 'lucide-react';
import { useRole, roleColors } from '@/hooks/useRole';

const iconMap: Record<string, React.ElementType> = {
  'receipt': TrendingUp,
  'clock': Clock,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'users': Users,
};

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  icon: string;
  sparkline: number[];
  index: number;
}

const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-40">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
};

export const StatCard = ({ label, value, prefix = '', icon, sparkline, index }: StatCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const { role } = useRole();
  const color = roleColors[role];
  const Icon = iconMap[icon] || TrendingUp;

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="card-surface rounded-xl p-5 group"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
        </div>
        <MiniSparkline data={sparkline} color={color} />
      </div>
      <div className="mt-4">
        <div className="font-mono font-bold text-[28px] gradient-text tabular-nums">
          {prefix}{displayValue.toLocaleString('en-IN')}
        </div>
        <div className="label-upper mt-1">{label}</div>
      </div>
    </motion.div>
  );
};
