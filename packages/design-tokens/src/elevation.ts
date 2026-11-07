/**
 * WealthOS Dark-Mode Specific Elevation & Layering
 */
export const elevation = {
  0: {
    background: '#0B0F17',
    border: 'none',
    boxShadow: 'none',
  },
  1: {
    background: '#111827',
    border: '1px solid #1F2937',
    boxShadow: 'none',
  },
  2: {
    background: '#1E293B',
    border: '1px solid #374151',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
  },
  3: {
    background: '#1E293B',
    border: '1px solid #4B5563',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.7)',
  },
  4: {
    background: '#1E293B',
    border: '1px solid #6366F1',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
  },
} as const;

export const zIndex = {
  base: 0,
  sticky: 100,
  dropdown: 200,
  modalBackdrop: 300,
  modal: 400,
  popover: 500,
  toast: 600,
} as const;
