// @ts-nocheck
/**
 * Dialog Component - Modal amélioré
 * Support pour différentes tailles, meilleure lisibilité et redimensionnement
 */
import React, { useEffect, useState, useRef } from 'react';

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
  resizable?: boolean;
}

export const DialogContent = ({ children, className = '', resizable = false }: DialogContentProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  // Initialiser la taille au montage
  useEffect(() => {
    if (contentRef.current && resizable) {
      const rect = contentRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
  }, [resizable]);

  // Gestion du redimensionnement
  const handleMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!contentRef.current) return;

    const rect = contentRef.current.getBoundingClientRect();
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - resizeRef.current.startX;
      const deltaY = moveEvent.clientY - resizeRef.current.startY;

      let newWidth = resizeRef.current.startWidth;
      let newHeight = resizeRef.current.startHeight;

      if (direction.includes('e')) newWidth = Math.max(400, resizeRef.current.startWidth + deltaX);
      if (direction.includes('w')) newWidth = Math.max(400, resizeRef.current.startWidth - deltaX);
      if (direction.includes('s')) newHeight = Math.max(300, resizeRef.current.startHeight + deltaY);
      if (direction.includes('n')) newHeight = Math.max(300, resizeRef.current.startHeight - deltaY);

      // Limites max
      newWidth = Math.min(newWidth, window.innerWidth * 0.95);
      newHeight = Math.min(newHeight, window.innerHeight * 0.95);

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Si className contient max-w-*, on n'applique pas la largeur par défaut
  const hasCustomWidth = className.includes('max-w-') || className.includes('w-[');
  const baseClasses = hasCustomWidth
    ? 'p-6 max-w-[95vw] overflow-auto'
    : 'p-6 w-[500px] max-w-[95vw] max-h-[85vh] overflow-auto';

  // Style dynamique pour le redimensionnement
  const dynamicStyle = resizable && size.width > 0 ? {
    width: `${size.width}px`,
    height: `${size.height}px`,
    maxWidth: '95vw',
    maxHeight: '95vh',
  } : {};

  return (
    <div
      ref={contentRef}
      className={`${baseClasses} ${className} ${resizable ? 'relative' : ''}`}
      style={dynamicStyle}
    >
      {children}

      {/* Poignées de redimensionnement */}
      {resizable && (
        <>
          {/* Coin bas-droite - avec icône visible */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400 rounded-tl z-10"
            onMouseDown={(e) => handleMouseDown(e, 'se')}
            title="Redimensionner"
          >
            <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
          </div>

          {/* Coin haut-droite */}
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'ne')}
          />

          {/* Coin haut-gauche */}
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'nw')}
          />

          {/* Coin bas-gauche */}
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'sw')}
          />

          {/* Bord droit */}
          <div
            className="absolute top-1 right-0 w-2 h-[calc(100%-8px)] cursor-e-resize hover:bg-blue-200/50"
            onMouseDown={(e) => handleMouseDown(e, 'e')}
          />

          {/* Bord gauche */}
          <div
            className="absolute top-1 left-0 w-2 h-[calc(100%-8px)] cursor-w-resize hover:bg-blue-200/50"
            onMouseDown={(e) => handleMouseDown(e, 'w')}
          />

          {/* Bord haut */}
          <div
            className="absolute top-0 left-1 w-[calc(100%-8px)] h-2 cursor-n-resize hover:bg-blue-200/50"
            onMouseDown={(e) => handleMouseDown(e, 'n')}
          />

          {/* Bord bas */}
          <div
            className="absolute bottom-0 left-1 w-[calc(100%-8px)] h-2 cursor-s-resize hover:bg-blue-200/50"
            onMouseDown={(e) => handleMouseDown(e, 's')}
          />
        </>
      )}
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
