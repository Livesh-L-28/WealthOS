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
  const baseClasses =
    'bg-white border border-[#E7ECE8] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(23,35,29,0.04),0_1px_2px_-1px_rgba(23,35,29,0.02)] transition-all duration-200';
  const interactiveClasses =
    variant === 'interactive'
      ? 'hover:border-[#D1D9D3] hover:shadow-md cursor-pointer'
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
    <div className={`flex items-start justify-between pb-3.5 border-b border-[#E7ECE8] mb-4 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-[#17231D] tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-[#758078] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
