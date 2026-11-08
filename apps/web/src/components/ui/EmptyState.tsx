import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center border border-dashed border-[#E7ECE8] rounded-2xl bg-[#FAFCFA] ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-white border border-[#E7ECE8] shadow-sm flex items-center justify-center text-[#16A36A] mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-[#17231D]">{title}</h4>
      <p className="text-xs text-[#758078] max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onAction}
          disabled={actionDisabled}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
