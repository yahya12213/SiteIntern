import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Home,
  Calculator,
  MapPin,
  Users,
  FileSpreadsheet,
  FilePlus,
  ClipboardCheck,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  BarChart3,
  FileText,
  Award,
  MessageSquare,
  Palette,
  Layers,
} from 'lucide-react';

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

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(['gestion-comptable', 'formation-en-ligne']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const sections: NavSection[] = [
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white border-r border-gray-200 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
      <nav className="flex-1 px-3 py-4 space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const SectionIcon = section.icon;

          return (
            <div key={section.id} className="space-y-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <SectionIcon className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                  <span className="group-hover:text-blue-600">{section.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="ml-3 space-y-0.5 border-l-2 border-gray-200 pl-3">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActive(item.to);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all ${
                          active
                            ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-600 -ml-[2px]'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon
                          className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-gray-400'}`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Comptabilité PL © 2025
        </p>
      </div>
    </aside>
  );
};
