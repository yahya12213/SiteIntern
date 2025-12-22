// @ts-nocheck
import React from 'react';

export const Badge = ({ children, variant = 'default', className = '', ...props }: any) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200',
    secondary: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200',
    destructive: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    info: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    outline: 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300',
    primary: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 hover:shadow-sm ${variantClasses[variant] || variantClasses.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
