import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PERMISSIONS } from '@/config/permissions';
import {
  ChevronDown,
  ChevronUp,
  Home,
  Calculator,
  MapPin,
  Users,
  FileSpreadsheet,
  ClipboardCheck,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  BarChart3,
  FileText,
  Award,
  MessageSquare,
  Palette,
  Shield,
  Briefcase,
  UserCheck,
  Clock,
  CalendarDays,
  Settings,
  TrendingUp,
  Target,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  permission?: string; // Permission code required to see this menu item
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>(['gestion-comptable', 'formation-en-ligne', 'ressources-humaines', 'commercialisation']);

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
        { to: '/dashboard', icon: Home, label: 'Tableau de bord', permission: PERMISSIONS.accounting.dashboard.view_page },
        { to: '/admin/segments', icon: Calculator, label: 'Segments', permission: PERMISSIONS.accounting.segments.view_page },
        { to: '/admin/cities', icon: MapPin, label: 'Villes', permission: PERMISSIONS.accounting.cities.view_page },
        { to: '/admin/users', icon: Users, label: 'Utilisateurs', permission: PERMISSIONS.accounting.users.view_page },
        { to: '/admin/roles', icon: Shield, label: 'Rôles & Permissions', permission: PERMISSIONS.system.roles.view_page },
        { to: '/admin/calculation-sheets', icon: FileSpreadsheet, label: 'Fiches de calcul', permission: PERMISSIONS.accounting.sheets.view_page },
        { to: '/admin/declarations', icon: ClipboardCheck, label: 'Gérer déclarations', permission: PERMISSIONS.accounting.declarations.view_page },
      ],
    },
    {
      id: 'formation-en-ligne',
      title: 'Formation en Ligne',
      icon: GraduationCap,
      items: [
        { to: '/admin/formations-management', icon: BookOpen, label: 'Gestion des Formations', permission: PERMISSIONS.training.formations.view_page },
        { to: '/admin/sessions-formation', icon: CalendarCheck, label: 'Sessions de Formation', permission: PERMISSIONS.training.sessions.view_page },
        { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', permission: PERMISSIONS.training.analytics.view_page },
        { to: '/admin/student-reports', icon: FileText, label: 'Rapports Étudiants', permission: PERMISSIONS.training.student_reports.view_page },
        { to: '/admin/certificates', icon: Award, label: 'Certificats', permission: PERMISSIONS.training.certificates.view_page },
        { to: '/admin/certificate-templates', icon: Palette, label: 'Templates de Certificats', permission: PERMISSIONS.training.certificate_templates.view_page },
        { to: '/admin/forums', icon: MessageSquare, label: 'Forums', permission: PERMISSIONS.training.forums.view_page },
      ],
    },
    {
      id: 'ressources-humaines',
      title: 'Ressources Humaines',
      icon: Briefcase,
      items: [
        { to: '/employee/clocking', icon: Clock, label: 'Mon Pointage', permission: PERMISSIONS.hr.clocking.self },
        { to: '/admin/hr/employees', icon: UserCheck, label: 'Dossiers du Personnel', permission: PERMISSIONS.hr.employees.view_page },
        { to: '/admin/hr/attendance', icon: Clock, label: 'Temps & Présence', permission: PERMISSIONS.hr.attendance.view_page },
        { to: '/admin/hr/leaves', icon: CalendarDays, label: 'Congés & Planning', permission: PERMISSIONS.hr.leaves.view_page },
        { to: '/admin/hr/dashboard', icon: BarChart3, label: 'Tableau de bord RH', permission: PERMISSIONS.hr.dashboard.view_page },
        { to: '/admin/hr/settings', icon: Settings, label: 'Paramètres RH', permission: PERMISSIONS.hr.settings.view_page },
      ],
    },
    {
      id: 'commercialisation',
      title: 'Commercialisation',
      icon: TrendingUp,
      items: [
        { to: '/admin/commercialisation/dashboard', icon: BarChart3, label: 'Tableau de bord', permission: PERMISSIONS.commercialisation.dashboard.view_page },
        { to: '/admin/commercialisation/clients', icon: Users, label: 'Gestion des Clients', permission: PERMISSIONS.commercialisation.clients.view_page },
        { to: '/admin/commercialisation/prospects', icon: Target, label: 'Prospects', permission: PERMISSIONS.commercialisation.prospects.view_page },
        { to: '/admin/commercialisation/devis', icon: FileText, label: 'Devis', permission: PERMISSIONS.commercialisation.devis.view_page },
        { to: '/admin/commercialisation/contrats', icon: FileCheck, label: 'Contrats', permission: PERMISSIONS.commercialisation.contrats.view_page },
      ],
    },
  ];

  // Filter sections based on user permissions
  const filteredSections = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        !item.permission || hasPermission(item.permission)
      ),
    }))
    .filter(section => section.items.length > 0); // Hide empty sections

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white border-r border-gray-200 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
      <nav className="flex-1 px-3 py-4 space-y-2">
        {filteredSections.map((section) => {
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
