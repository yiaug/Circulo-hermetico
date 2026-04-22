import React from 'react';
import { cn } from '../../lib/utils';

export const GlassCard = ({ children, className, ...props }: any) => (
  <div 
    className={cn(
      "bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl overflow-hidden",
      className
    )} 
    {...props}
  >
    {children}
  </div>
);
