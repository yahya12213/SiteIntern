import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Fixed at top */}
      <Header title={title} subtitle={subtitle} />

      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar - Only visible on desktop (lg+) */}
        <Sidebar />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
