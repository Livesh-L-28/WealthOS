import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'positive' | 'negative' | 'warning' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    positive: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60',
    negative: 'bg-rose-950/60 text-rose-300 border border-rose-800/60',
    warning: 'bg-amber-950/60 text-amber-300 border border-amber-800/60',
    neutral: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
    brand: 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}

