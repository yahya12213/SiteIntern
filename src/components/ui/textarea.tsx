// @ts-nocheck
// Minimal Textarea stub
import React from 'react';

export const Textarea = React.forwardRef(({ className, ...props }: any, ref: any) => (
  <textarea
    ref={ref}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ''}`}
    {...props}
  />
));

Textarea.displayName = 'Textarea';
