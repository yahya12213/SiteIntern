// @ts-nocheck
// Minimal Dialog stub - Replace with proper implementation later
import React from 'react';

export const Dialog = ({ children, open, onOpenChange }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange?.(false)}>
      <div className="bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({ children, ...props }: any) => (
  <div className="p-6 max-w-2xl max-h-[90vh] overflow-auto" {...props}>{children}</div>
);

export const DialogHeader = ({ children, ...props }: any) => (
  <div className="mb-4" {...props}>{children}</div>
);

export const DialogTitle = ({ children, ...props }: any) => (
  <h2 className="text-xl font-bold" {...props}>{children}</h2>
);

export const DialogDescription = ({ children, ...props }: any) => (
  <p className="text-sm text-gray-600" {...props}>{children}</p>
);

export const DialogFooter = ({ children, ...props }: any) => (
  <div className="mt-6 flex gap-2 justify-end" {...props}>{children}</div>
);
