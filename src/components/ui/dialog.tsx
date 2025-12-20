// @ts-nocheck
/**
 * Dialog Component - Modal amélioré
 * Support pour différentes tailles et meilleure lisibilité
 */
import React, { useEffect } from 'react';

interface DialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dialog = ({ children, open, onOpenChange }: DialogProps) => {
  // Bloquer le scroll du body quand le dialog est ouvert
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange?.(false);
      }
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => onOpenChange?.(false)}
    >
      <div
        className="bg-white rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent = ({ children, className = '' }: DialogContentProps) => {
  // Si className contient max-w-*, on n'applique pas la largeur par défaut
  const hasCustomWidth = className.includes('max-w-') || className.includes('w-[');
  const baseClasses = hasCustomWidth
    ? 'p-6 max-w-[95vw] overflow-auto'
    : 'p-6 w-[500px] max-w-[95vw] max-h-[85vh] overflow-auto';

  return (
    <div className={`${baseClasses} ${className}`}>
      {children}
    </div>
  );
};

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader = ({ children, className = '' }: DialogHeaderProps) => (
  <div className={`mb-4 pb-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle = ({ children, className = '' }: DialogTitleProps) => (
  <h2 className={`text-xl font-semibold text-gray-900 ${className}`}>
    {children}
  </h2>
);

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogDescription = ({ children, className = '' }: DialogDescriptionProps) => (
  <p className={`mt-1 text-sm text-gray-500 ${className}`}>
    {children}
  </p>
);

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter = ({ children, className = '' }: DialogFooterProps) => (
  <div className={`mt-6 pt-4 border-t border-gray-200 flex gap-3 justify-end ${className}`}>
    {children}
  </div>
);

// Composant pour fermer le dialog
export const DialogClose = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
  <>{children}</>
);

// Trigger pour ouvrir le dialog (optionnel)
export const DialogTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
  <>{children}</>
);
