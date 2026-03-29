import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppSidebar } from './AppSidebar';
import { useRole, roleColors } from '@/hooks/useRole';

export const AppLayout = () => {
  const { role } = useRole();
  const color = roleColors[role];

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 ml-[220px] relative">
        {/* Ambient role glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none opacity-[0.06]"
          style={{ background: `radial-gradient(ellipse 800px 400px at 50% -100px, ${color}, transparent 70%)` }}
        />
        <div className="p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
