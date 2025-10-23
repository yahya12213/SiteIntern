import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, HardHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MobileNav } from './MobileNav';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showBackButton = false, backTo = '/dashboard' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left Section: Mobile Nav + Logo/Title */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile Navigation - Only visible on mobile */}
            <MobileNav />

            {/* Logo - Hidden on mobile, visible on larger screens */}
            <div className="hidden lg:flex items-center gap-2">
              <HardHat className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
              <span className="text-lg sm:text-xl font-bold text-gray-800">Comptabilité PL</span>
            </div>

            {/* Page Title - Visible on all screens */}
            {title && (
              <div className="flex flex-col">
                <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800 truncate max-w-[150px] sm:max-w-none">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Right Section: User Info + Logout (Hidden on mobile, shown via MobileNav) */}
          <div className="hidden lg:flex items-center gap-4">
            {/* User Info */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user?.full_name || user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>

            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">Déconnexion</span>
            </Button>
          </div>

          {/* Mobile Logo - Only visible on mobile when no title */}
          {!title && (
            <div className="lg:hidden flex items-center gap-2">
              <HardHat className="h-6 w-6 text-orange-600" />
              <span className="text-base font-bold text-gray-800">Comptabilité PL</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
