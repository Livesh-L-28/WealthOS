import React from 'react';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading page content">
      <div className="h-8 bg-slate-800/60 rounded-md w-1/3"></div>
      <div className="h-28 bg-slate-800/40 rounded-lg"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-800/50 rounded-lg"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-slate-800/40 rounded-lg"></div>
        <div className="h-64 bg-slate-800/40 rounded-lg"></div>
      </div>
    </div>
  );
}
