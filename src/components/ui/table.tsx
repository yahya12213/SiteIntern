// @ts-nocheck
// Minimal Table stub
import React from 'react';

export const Table = ({ children, ...props }: any) => (
  <div className="w-full overflow-auto">
    <table className="w-full border-collapse" {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children, ...props }: any) => (
  <thead className="bg-gray-50" {...props}>{children}</thead>
);

export const TableBody = ({ children, ...props }: any) => (
  <tbody {...props}>{children}</tbody>
);

export const TableRow = ({ children, ...props }: any) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50" {...props}>
    {children}
  </tr>
);

export const TableHead = ({ children, ...props }: any) => (
  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props}>
    {children}
  </th>
);

export const TableCell = ({ children, ...props }: any) => (
  <td className="px-4 py-3 text-sm text-gray-900" {...props}>
    {children}
  </td>
);
