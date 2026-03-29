import React from 'react';
import { motion } from 'framer-motion';
import { useRole, roleColors } from '@/hooks/useRole';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, children }: PageHeaderProps) => {
  const { role } = useRole();
  const color = roleColors[role];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <h1 className="font-display font-bold text-[28px] gradient-text">{title}</h1>
      <p className="text-muted-foreground text-sm font-body mt-1">{subtitle}</p>
      {children && <div className="mt-4">{children}</div>}
    </motion.div>
  );
};
