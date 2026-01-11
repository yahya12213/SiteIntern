import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PERMISSIONS } from '@/config/permissions';
import {
  ChevronDown,
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
  MessageSquare,
  Palette,
  Shield,
  Briefcase,
  Clock,
  TrendingUp,
  Target,
  Trash2,
  GitBranch,
  Calendar,
  Wallet,
  User,
  CheckSquare,
  FolderKanban,
  Cloud,
  ArrowRightLeft,
  UserCheck,
  Receipt,
  Send,
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
  const [expandedSections, setExpandedSections] = useState<string[]>(['gestion-comptable', 'formation', 'ressources-humaines', 'mon-equipe', 'mon-espace-rh', 'commercialisation']);

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
        { to: '/dashboard', icon: Home, label: 'Tableau de bord', permission: PERMISSIONS.gestion_comptable.tableau_de_bord.voir },
        { to: '/admin/segments', icon: Calculator, label: 'Segments', permission: PERMISSIONS.gestion_comptable.segments.voir },
        { to: '/admin/cities', icon: MapPin, label: 'Villes', permission: PERMISSIONS.gestion_comptable.villes.voir },
        { to: '/admin/users', icon: Users, label: 'Utilisateurs', permission: PERMISSIONS.gestion_comptable.utilisateurs.voir },
        { to: '/admin/roles', icon: Shield, label: 'Rôles & Permissions', permission: PERMISSIONS.gestion_comptable.roles_permissions.voir },
        { to: '/admin/calculation-sheets', icon: FileSpreadsheet, label: 'Fiches de calcul', permission: PERMISSIONS.gestion_comptable.fiches_calcul.voir },
        { to: '/admin/declarations', icon: ClipboardCheck, label: 'Gérer déclarations', permission: PERMISSIONS.gestion_comptable.declarations.voir },
        { to: '/admin/projects', icon: FolderKanban, label: 'Gestion de Projet', permission: PERMISSIONS.gestion_comptable.gestion_projet.voir },
      ],
    },
    {
      id: 'formation',
      title: 'Formation',
      icon: GraduationCap,
      items: [
        { to: '/admin/formations-management', icon: BookOpen, label: 'Gestion des Formations', permission: PERMISSIONS.formation.gestion_formations.voir },
        { to: '/admin/sessions-formation', icon: CalendarCheck, label: 'Sessions de Formation', permission: PERMISSIONS.formation.sessions_formation.voir },
        { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', permission: PERMISSIONS.formation.analytics.voir },
        { to: '/admin/student-reports', icon: FileText, label: 'Rapports Étudiants', permission: PERMISSIONS.formation.rapports_etudiants.voir },
        { to: '/admin/students-list', icon: Users, label: 'Liste des Étudiants', permission: PERMISSIONS.formation.liste_etudiants.voir },
        { to: '/admin/certificate-templates', icon: Palette, label: 'Templates de Certificats', permission: PERMISSIONS.formation.templates_certificats.voir },
        { to: '/admin/forums', icon: MessageSquare, label: 'Forums', permission: PERMISSIONS.formation.forums.voir },
      ],
    },
    {
      id: 'ressources-humaines',
      title: 'Ressources Humaines',
      icon: Briefcase,
      items: [
        { to: '/admin/hr/validation-workflows', icon: GitBranch, label: 'Boucles de Validation', permission: PERMISSIONS.ressources_humaines.boucles_validation.voir },
        { to: '/admin/hr/schedules', icon: Calendar, label: 'Gestion des Horaires', permission: PERMISSIONS.ressources_humaines.gestion_horaires.voir },
        { to: '/admin/hr/payroll', icon: Wallet, label: 'Gestion de Paie', permission: PERMISSIONS.ressources_humaines.gestion_paie.voir },
        { to: '/admin/hr/employee-portal', icon: Clock, label: 'Gestion Pointage', permission: PERMISSIONS.ressources_humaines.gestion_pointage.voir },
        { to: '/admin/hr/employees', icon: User, label: 'Dossier Employé', permission: PERMISSIONS.ressources_humaines.dossier_employe.voir },
        { to: '/admin/hr/requests-validation', icon: CheckSquare, label: 'Validation des Demandes', permission: PERMISSIONS.ressources_humaines.validation_demandes.voir },
        { to: '/admin/hr/delegations', icon: ArrowRightLeft, label: 'Délégations', permission: PERMISSIONS.ressources_humaines.delegations.voir },
      ],
    },
    // Section Manager - Vue Équipe
    {
      id: 'mon-equipe',
      title: 'Mon Équipe',
      icon: UserCheck,
      items: [
        { to: '/manager/team-attendance', icon: Clock, label: 'Pointages équipe', permission: PERMISSIONS.mon_equipe.pointages_equipe.voir },
        { to: '/manager/team-requests', icon: CheckSquare, label: 'Demandes équipe', permission: PERMISSIONS.mon_equipe.demandes_equipe.voir },
      ],
    },
    // Section Employé - Mon Espace RH
    {
      id: 'mon-espace-rh',
      title: 'Mon Espace RH',
      icon: User,
      items: [
        { to: '/employee/clocking', icon: Clock, label: 'Mon Pointage', permission: PERMISSIONS.mon_espace_rh.mon_pointage.voir },
        { to: '/employee/requests', icon: Send, label: 'Mes Demandes', permission: PERMISSIONS.mon_espace_rh.mes_demandes.voir },
        { to: '/employee/payslips', icon: Receipt, label: 'Mes Bulletins', permission: PERMISSIONS.mon_espace_rh.mes_bulletins.voir },
      ],
    },
    {
      id: 'commercialisation',
      title: 'Commercialisation',
      icon: TrendingUp,
      items: [
        { to: '/admin/commercialisation/dashboard', icon: BarChart3, label: 'Tableau de bord', permission: PERMISSIONS.commercialisation.tableau_de_bord.voir },
        { to: '/admin/commercialisation/prospects', icon: Target, label: 'Prospects', permission: PERMISSIONS.commercialisation.prospects.voir },
        { to: '/admin/commercialisation/prospects-cleaning', icon: Trash2, label: 'Nettoyage Prospects', permission: PERMISSIONS.commercialisation.nettoyage_prospects.voir },
        { to: '/admin/commercialisation/google-contacts', icon: Cloud, label: 'Gestion G-Contacte', permission: PERMISSIONS.commercialisation.gestion_gcontacte.voir },
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
    <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-gradient-to-b from-white to-gray-50/50 border-r border-gray-100 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto shadow-soft">
      <nav className="flex-1 px-3 py-4 space-y-2">
        {filteredSections.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const SectionIcon = section.icon;

          return (
            <div key={section.id} className="space-y-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-sm rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors duration-200">
                    <SectionIcon className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
                  </div>
                  <span className="group-hover:text-blue-600 transition-colors duration-200">{section.title}</span>
                </div>
                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="ml-3 space-y-0.5 border-l-2 border-gray-200/60 pl-3 animate-fade-in">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActive(item.to);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm shadow-blue-500/25'
                            : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon
                          className={`h-4 w-4 transition-colors duration-200 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}
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
      <div className="px-6 py-4 border-t border-gray-100 bg-white/50">
        <p className="text-xs text-gray-400 text-center font-medium">
          Comptabilité PL © 2025
        </p>
      </div>
    </aside>
  );
};
