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
    positive: 'bg-[#16A36A]/10 text-[#087A50] border border-[#16A36A]/25 font-medium',
    negative: 'bg-[#DC5B5B]/10 text-[#B91C1C] border border-[#DC5B5B]/25 font-medium',
    warning: 'bg-[#D99A32]/10 text-[#B45309] border border-[#D99A32]/25 font-medium',
    neutral: 'bg-[#F0F4F1] text-[#4A554E] border border-[#E7ECE8]',
    brand: 'bg-[#16A36A]/15 text-[#087A50] border border-[#16A36A]/30 font-semibold',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}
