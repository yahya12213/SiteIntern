import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Users, MapPin, FileSpreadsheet, Calculator, LogOut, FilePlus, ClipboardCheck, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface MobileNavProps {
  className?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAdmin, isGerant, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const adminLinks = [
    { to: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { to: '/admin/segments', icon: Calculator, label: 'Segments' },
    { to: '/admin/cities', icon: MapPin, label: 'Villes' },
    { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { to: '/admin/calculation-sheets', icon: FileSpreadsheet, label: 'Fiches de calcul' },
    { to: '/admin/create-declaration', icon: FilePlus, label: 'Créer déclaration' },
    { to: '/admin/declarations-management', icon: ClipboardCheck, label: 'Gérer déclarations' },
  ];

  const professorLinks = [
    { to: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { to: '/professor/declarations', icon: List, label: 'Mes déclarations' },
  ];

  const gerantLinks = [
    { to: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { to: '/gerant/view-declarations', icon: ClipboardCheck, label: 'Voir déclarations' },
  ];

  const links = isAdmin ? adminLinks : isGerant ? gerantLinks : professorLinks;

  return (
    <>
      {/* Hamburger Button - Visible only on mobile */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={`lg:hidden ${className}`}
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 bg-gray-50 border-b">
          <p className="text-sm font-medium text-gray-800">{user?.full_name || user?.username}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col p-2 space-y-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <link.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </div>
    </>
  );
};
