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
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    positive: 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/25 font-medium',
    negative: 'bg-[#EF4444]/10 text-[#B91C1C] border border-[#EF4444]/25 font-medium',
    warning: 'bg-[#F59E0B]/10 text-[#B45309] border border-[#F59E0B]/25 font-medium',
    neutral: 'bg-[#F1F5F9] text-[#4A554E] border border-[#E2E8F0]',
    brand: 'bg-[#10B981]/15 text-[#059669] border border-[#10B981]/30 font-semibold',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}
