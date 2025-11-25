// @ts-nocheck
// Minimal Select stub
import React from 'react';

export const Select = ({ children, value, onValueChange, disabled }: any) => (
  <div className={disabled ? 'opacity-50 cursor-not-allowed' : ''}>
    {React.Children.map(children, child =>
      React.isValidElement(child) && child.type === SelectTrigger
        ? React.cloneElement(child, { value, onValueChange, disabled } as any)
        : child
    )}
  </div>
);

export const SelectTrigger = ({ children, value, onValueChange, disabled }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left disabled:opacity-50"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {children}
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {React.Children.map(children, child =>
            React.isValidElement(child) && child.type === SelectContent
              ? React.cloneElement(child, { onValueChange, onClose: () => setIsOpen(false) } as any)
              : null
          )}
        </div>
      )}
    </div>
  );
};

export const SelectValue = ({ placeholder }: any) => <span>{placeholder}</span>;

export const SelectContent = ({ children, onValueChange, onClose }: any) => (
  <div>
    {React.Children.map(children, child =>
      React.isValidElement(child)
        ? React.cloneElement(child, { onValueChange, onClose } as any)
        : child
    )}
  </div>
);

export const SelectItem = ({ children, value, onValueChange, onClose }: any) => (
  <div
    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
    onClick={() => {
      onValueChange?.(value);
      onClose?.();
    }}
  >
    {children}
  </div>
);
