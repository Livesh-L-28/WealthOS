export interface CategoryVisualMeta {
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

/**
 * Returns intuitive icons and accessible, polished color tints for transactions based on category and flow type.
 * Works seamlessly in both White (light) and Dark themes with WCAG AA compliance.
 */
export function getCategoryVisualMeta(
  category: string | undefined,
  type: 'CREDIT' | 'DEBIT' = 'DEBIT',
  isDark: boolean = false
): CategoryVisualMeta {
  const norm = (category || '').toLowerCase().trim();

  // 1. Inflows / Credits
  if (type === 'CREDIT') {
    if (
      norm.includes('salary') ||
      norm.includes('payroll') ||
      norm.includes('retainer') ||
      norm.includes('consulting') ||
      norm.includes('stipend')
    ) {
      return {
        icon: '💼',
        bgColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5',
        borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
        textColor: isDark ? '#34D399' : '#059669',
      };
    }

    if (
      norm.includes('dividend') ||
      norm.includes('interest') ||
      norm.includes('yield') ||
      norm.includes('deposit') ||
      norm.includes('payout')
    ) {
      return {
        icon: '💰',
        bgColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
        borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
        textColor: isDark ? '#FBBF24' : '#D97706',
      };
    }

    if (
      norm.includes('gain') ||
      norm.includes('stock') ||
      norm.includes('equity') ||
      norm.includes('trading') ||
      norm.includes('sale')
    ) {
      return {
        icon: '📈',
        bgColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF',
        borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
        textColor: isDark ? '#60A5FA' : '#2563EB',
      };
    }

    if (
      norm.includes('refund') ||
      norm.includes('reimbursement') ||
      norm.includes('cashback') ||
      norm.includes('return')
    ) {
      return {
        icon: '🔄',
        bgColor: isDark ? 'rgba(20, 184, 166, 0.16)' : '#F0FDFA',
        borderColor: isDark ? 'rgba(20, 184, 166, 0.35)' : '#99F6E4',
        textColor: isDark ? '#2DD4BF' : '#0D9488',
      };
    }

    // Default Credit / Inflow
    return {
      icon: '↓',
      bgColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
      textColor: isDark ? '#34D399' : '#059669',
    };
  }

  // 2. Outflows / Debits
  if (
    norm.includes('dining') ||
    norm.includes('restaurant') ||
    norm.includes('cafe') ||
    norm.includes('coffee') ||
    norm.includes('food & drink') ||
    norm.includes('zomato') ||
    norm.includes('swiggy') ||
    norm.includes('starbucks')
  ) {
    return {
      icon: '🍔',
      bgColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
      textColor: isDark ? '#FBBF24' : '#D97706',
    };
  }

  if (
    norm.includes('grocer') ||
    norm.includes('supermarket') ||
    norm.includes('mart') ||
    norm.includes('blinkit') ||
    norm.includes('zepto') ||
    norm.includes('instamart') ||
    norm.includes('food & grocer')
  ) {
    return {
      icon: '🛒',
      bgColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
      textColor: isDark ? '#34D399' : '#059669',
    };
  }

  if (
    norm.includes('transport') ||
    norm.includes('fuel') ||
    norm.includes('petrol') ||
    norm.includes('diesel') ||
    norm.includes('uber') ||
    norm.includes('ola') ||
    norm.includes('rapido') ||
    norm.includes('cab') ||
    norm.includes('ride') ||
    norm.includes('auto')
  ) {
    return {
      icon: '🚗',
      bgColor: isDark ? 'rgba(14, 165, 233, 0.16)' : '#E0F2FE',
      borderColor: isDark ? 'rgba(14, 165, 233, 0.35)' : '#BAE6FD',
      textColor: isDark ? '#38BDF8' : '#0284C7',
    };
  }

  if (
    norm.includes('house') ||
    norm.includes('rent') ||
    norm.includes('maintenance') ||
    norm.includes('society') ||
    norm.includes('flat') ||
    norm.includes('mortgage')
  ) {
    return {
      icon: '🏠',
      bgColor: isDark ? 'rgba(139, 92, 246, 0.16)' : '#EDE9FE',
      borderColor: isDark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE',
      textColor: isDark ? '#A78BFA' : '#7C3AED',
    };
  }

  if (
    norm.includes('utilit') ||
    norm.includes('bill') ||
    norm.includes('electric') ||
    norm.includes('bescom') ||
    norm.includes('water') ||
    norm.includes('gas') ||
    norm.includes('internet') ||
    norm.includes('wifi') ||
    norm.includes('broadband') ||
    norm.includes('airtel') ||
    norm.includes('jio') ||
    norm.includes('mobile')
  ) {
    return {
      icon: '💡',
      bgColor: isDark ? 'rgba(234, 179, 8, 0.16)' : '#FEF9C3',
      borderColor: isDark ? 'rgba(234, 179, 8, 0.35)' : '#FEF08A',
      textColor: isDark ? '#FACC15' : '#CA8A04',
    };
  }

  if (
    norm.includes('shop') ||
    norm.includes('retail') ||
    norm.includes('amazon') ||
    norm.includes('flipkart') ||
    norm.includes('myntra') ||
    norm.includes('clothing') ||
    norm.includes('apparel')
  ) {
    return {
      icon: '🛍️',
      bgColor: isDark ? 'rgba(244, 63, 94, 0.16)' : '#FFE4E6',
      borderColor: isDark ? 'rgba(244, 63, 94, 0.35)' : '#FECDD3',
      textColor: isDark ? '#FB7185' : '#E11D48',
    };
  }

  if (
    norm.includes('health') ||
    norm.includes('medical') ||
    norm.includes('doctor') ||
    norm.includes('pharmacy') ||
    norm.includes('apollo') ||
    norm.includes('wellness') ||
    norm.includes('hospital') ||
    norm.includes('medicine')
  ) {
    return {
      icon: '🏥',
      bgColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
      borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
      textColor: isDark ? '#F87171' : '#DC2626',
    };
  }

  if (
    norm.includes('travel') ||
    norm.includes('vacation') ||
    norm.includes('flight') ||
    norm.includes('hotel') ||
    norm.includes('airbnb') ||
    norm.includes('makemytrip') ||
    norm.includes('indigo')
  ) {
    return {
      icon: '✈️',
      bgColor: isDark ? 'rgba(20, 184, 166, 0.16)' : '#F0FDFA',
      borderColor: isDark ? 'rgba(20, 184, 166, 0.35)' : '#99F6E4',
      textColor: isDark ? '#2DD4BF' : '#0D9488',
    };
  }

  if (
    norm.includes('tech') ||
    norm.includes('cloud') ||
    norm.includes('software') ||
    norm.includes('aws') ||
    norm.includes('google cloud') ||
    norm.includes('github') ||
    norm.includes('subscription') ||
    norm.includes('netflix') ||
    norm.includes('spotify')
  ) {
    return {
      icon: '💻',
      bgColor: isDark ? 'rgba(99, 102, 241, 0.16)' : '#EEF2FF',
      borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE',
      textColor: isDark ? '#818CF8' : '#4F46E5',
    };
  }

  if (
    norm.includes('sip') ||
    norm.includes('mutual fund') ||
    norm.includes('invest') ||
    norm.includes('zerodha') ||
    norm.includes('groww') ||
    norm.includes('cams') ||
    norm.includes('kfin')
  ) {
    return {
      icon: '📈',
      bgColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF',
      borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
      textColor: isDark ? '#60A5FA' : '#2563EB',
    };
  }

  if (
    norm.includes('education') ||
    norm.includes('course') ||
    norm.includes('book') ||
    norm.includes('school') ||
    norm.includes('tuition')
  ) {
    return {
      icon: '🎓',
      bgColor: isDark ? 'rgba(168, 85, 247, 0.16)' : '#F3E8FF',
      borderColor: isDark ? 'rgba(168, 85, 247, 0.35)' : '#E9D5FF',
      textColor: isDark ? '#C084FC' : '#9333EA',
    };
  }

  if (
    norm.includes('transfer') ||
    norm.includes('self') ||
    norm.includes('contra') ||
    norm.includes('internal')
  ) {
    return {
      icon: '⇄',
      bgColor: isDark ? 'rgba(148, 163, 184, 0.16)' : '#F1F5F9',
      borderColor: isDark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0',
      textColor: isDark ? '#94A3B8' : '#475569',
    };
  }

  // Default Debit / Outflow
  return {
    icon: '🏷️',
    bgColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2',
    textColor: isDark ? '#F87171' : '#DC2626',
  };
}

