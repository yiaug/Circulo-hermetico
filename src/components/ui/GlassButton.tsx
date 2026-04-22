import React from 'react';
import { cn } from '../../lib/utils';

export const GlassButton = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: "bg-red-600/80 hover:bg-red-500 text-white",
    secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    ghost: "hover:bg-white/10 text-white/80 hover:text-white",
    danger: "bg-red-500/80 hover:bg-red-400 text-white"
  };
  
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 font-medium backdrop-blur-sm disabled:opacity-50",
        variants[variant as keyof typeof variants],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
