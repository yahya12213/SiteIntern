// @ts-nocheck
/**
 * Select Component - Dropdown personnalisé
 * Implémentation complète et fonctionnelle
 */
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

// Context pour partager l'état entre les composants
interface SelectContextType {
  value: string;
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled: boolean;
}

const SelectContext = createContext<SelectContextType | null>(null);

const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
};

// Main Select wrapper
export const Select = ({
  children,
  value = '',
  onValueChange = () => {},
  disabled = false
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <SelectContext.Provider value={{ value, selectedLabel, setSelectedLabel, onValueChange, isOpen, setIsOpen, disabled }}>
      <div ref={containerRef} className={`relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

// Trigger button
export const SelectTrigger = ({
  children,
  className = '',
  id
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => {
  const { isOpen, setIsOpen, disabled } = useSelectContext();

  return (
    <button
      type="button"
      id={id}
      className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
    >
      <span className="truncate">{children}</span>
      <svg
        className={`ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
};

// Display value or placeholder
export const SelectValue = ({ placeholder = 'Sélectionner...' }: { placeholder?: string }) => {
  const { value, selectedLabel } = useSelectContext();

  // Afficher le label sélectionné si disponible
  // Si value existe mais pas de label (cas initial), afficher la value comme fallback
  if (value) {
    return <span>{selectedLabel || value}</span>;
  }
  return <span className="text-gray-400">{placeholder}</span>;
};

// Content container (dropdown)
export const SelectContent = ({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { isOpen } = useSelectContext();

  if (!isOpen) return null;

  return (
    <div
      className={`absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto ${className}`}
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  );
};

// Individual item
export const SelectItem = ({
  children,
  value: itemValue,
  className = ''
}: {
  children: React.ReactNode;
  value: string;
  className?: string;
}) => {
  const { value, onValueChange, setIsOpen, setSelectedLabel } = useSelectContext();
  const isSelected = value === itemValue;

  const handleClick = () => {
    onValueChange(itemValue);
    // Extraire le texte du children pour l'afficher dans SelectValue
    const label = typeof children === 'string' ? children : '';
    setSelectedLabel(label);
    setIsOpen(false);
  };

  return (
    <div
      className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'hover:bg-gray-100 text-gray-900'
      } ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center">
        {isSelected && (
          <svg className="mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        <span className={isSelected ? '' : 'ml-6'}>{children}</span>
      </div>
    </div>
  );
};

// Groupe d'items (optionnel)
export const SelectGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="py-1">{children}</div>
);

// Label pour groupe (optionnel)
export const SelectLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
    {children}
  </div>
);

// Séparateur (optionnel)
export const SelectSeparator = () => (
  <div className="my-1 h-px bg-gray-200" />
);
