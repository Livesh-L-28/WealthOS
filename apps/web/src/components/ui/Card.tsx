import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive';
}

export function Card({
  children,
  className = '',
  variant = 'default',
  ...props
}: CardProps) {
  const baseClasses = 'bg-[#1E293B] border border-slate-800 rounded-lg p-5';
  const interactiveClasses =
    variant === 'interactive'
      ? 'hover:border-slate-700 hover:bg-[#243042] transition-colors cursor-pointer'
      : '';

  return (
    <div className={`${baseClasses} ${interactiveClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between pb-4 border-b border-slate-800/80 mb-4 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

