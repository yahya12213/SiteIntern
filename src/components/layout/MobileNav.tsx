import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Users, MapPin, FileSpreadsheet, Calculator, LogOut, FilePlus, ClipboardCheck, List, ChevronDown, ChevronUp, GraduationCap, Layers, BookOpen, CalendarCheck, BarChart3, FileText, Award, Palette, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface MobileNavProps {
  className?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['gestion-comptable', 'formation-en-ligne']);
  const { user, isAdmin, isGerant, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const adminSections: NavSection[] = [
    {
      id: 'gestion-comptable',
      title: 'Gestion Comptable',
      icon: Calculator,
      items: [
        { to: '/dashboard', icon: Home, label: 'Tableau de bord' },
        { to: '/admin/segments', icon: Calculator, label: 'Segments' },
        { to: '/admin/cities', icon: MapPin, label: 'Villes' },
        { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
        { to: '/admin/calculation-sheets', icon: FileSpreadsheet, label: 'Fiches de calcul' },
        { to: '/admin/create-declaration', icon: FilePlus, label: 'Créer déclaration' },
        { to: '/admin/declarations', icon: ClipboardCheck, label: 'Gérer déclarations' },
      ],
    },
    {
      id: 'formation-en-ligne',
      title: 'Formation en Ligne',
      icon: GraduationCap,
      items: [
        { to: '/admin/corps-formation', icon: Layers, label: 'Corps de Formation' },
        { to: '/admin/formations-management', icon: BookOpen, label: 'Gestion des Formations' },
        { to: '/admin/sessions-formation', icon: CalendarCheck, label: 'Sessions de Formation' },
        { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/admin/student-reports', icon: FileText, label: 'Rapports Étudiants' },
        { to: '/admin/certificates', icon: Award, label: 'Certificats' },
        { to: '/admin/certificate-templates', icon: Palette, label: 'Templates de Certificats' },
        { to: '/admin/forums', icon: MessageSquare, label: 'Forums' },
      ],
    },
  ];

  const professorLinks = [
    { to: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { to: '/professor/declarations', icon: List, label: 'Mes déclarations' },
  ];

  const gerantLinks = [
    { to: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { to: '/gerant/view-declarations', icon: ClipboardCheck, label: 'Voir déclarations' },
  ];

  const sections = isAdmin ? adminSections : [];
  const flatLinks = isAdmin ? [] : isGerant ? gerantLinks : professorLinks;

  const isActive = (path: string) => location.pathname === path;

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
        <nav className="flex flex-col p-2 space-y-2 overflow-y-auto flex-1">
          {/* Admin sections with collapsible groups */}
          {sections.map((section) => {
            const isExpanded = expandedSections.includes(section.id);
            const SectionIcon = section.icon;

            return (
              <div key={section.id} className="space-y-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <SectionIcon className="h-5 w-5 text-gray-600" />
                    <span>{section.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {/* Section Items */}
                {isExpanded && (
                  <div className="ml-6 space-y-0.5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(item.to);

                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            active
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <ItemIcon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Flat links for non-admin users */}
          {flatLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive(link.to)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <link.icon className={`h-5 w-5 ${isActive(link.to) ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="font-medium">{link.label}</span>
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
