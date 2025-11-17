import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useMemo } from 'react';

/**
 * Hook for checking user permissions
 * Uses the new hierarchical permission system (module.menu.action)
 *
 * Example codes:
 * - accounting.segments.view_page
 * - accounting.segments.create
 * - training.formations.delete
 */
export function usePermission() {
  const { user, permissions, hasPermission: contextHasPermission, hasAnyPermission: contextHasAnyPermission } = useAuth();

  // Check if user has a specific permission
  const can = useCallback((permissionCode: string): boolean => {
    // Admin always has all permissions
    if (user?.role === 'admin') return true;

    // Check wildcard permission
    if (permissions.includes('*')) return true;

    // Check specific permission
    return permissions.includes(permissionCode);
  }, [user, permissions]);

  // Check if user has any of the specified permissions
  const canAny = useCallback((...permissionCodes: string[]): boolean => {
    if (user?.role === 'admin') return true;
    if (permissions.includes('*')) return true;
    return permissionCodes.some(code => permissions.includes(code));
  }, [user, permissions]);

  // Check if user has all of the specified permissions
  const canAll = useCallback((...permissionCodes: string[]): boolean => {
    if (user?.role === 'admin') return true;
    if (permissions.includes('*')) return true;
    return permissionCodes.every(code => permissions.includes(code));
  }, [user, permissions]);

  // Check if user can view a specific page (menu item)
  const canViewPage = useCallback((module: string, menu: string): boolean => {
    const code = `${module}.${menu}.view_page`;
    return can(code);
  }, [can]);

  // Check if user can perform an action on a menu/page
  const canAction = useCallback((module: string, menu: string, action: string): boolean => {
    const code = `${module}.${menu}.${action}`;
    return can(code);
  }, [can]);

  // Get all view_page permissions (for menu visibility)
  const viewablePages = useMemo(() => {
    if (user?.role === 'admin' || permissions.includes('*')) {
      // Admin sees all pages - return a special marker
      return ['*'];
    }
    return permissions.filter(p => p.endsWith('.view_page'));
  }, [user, permissions]);

  // Check if user can see any page in a specific module
  const canAccessModule = useCallback((module: string): boolean => {
    if (user?.role === 'admin') return true;
    if (permissions.includes('*')) return true;
    return permissions.some(p => p.startsWith(`${module}.`) && p.endsWith('.view_page'));
  }, [user, permissions]);

  // Accounting module specific checks
  const accounting = useMemo(() => ({
    // Dashboard
    canViewDashboard: can('accounting.dashboard.view_page'),

    // Segments
    canViewSegments: can('accounting.segments.view_page'),
    canCreateSegment: can('accounting.segments.create'),
    canUpdateSegment: can('accounting.segments.update'),
    canDeleteSegment: can('accounting.segments.delete'),
    canImportCities: can('accounting.segments.import_cities'),

    // Cities
    canViewCities: can('accounting.cities.view_page'),
    canCreateCity: can('accounting.cities.create'),
    canUpdateCity: can('accounting.cities.update'),
    canDeleteCity: can('accounting.cities.delete'),
    canBulkDeleteCities: can('accounting.cities.bulk_delete'),

    // Users
    canViewUsers: can('accounting.users.view_page'),
    canCreateUser: can('accounting.users.create'),
    canUpdateUser: can('accounting.users.update'),
    canDeleteUser: can('accounting.users.delete'),
    canAssignSegments: can('accounting.users.assign_segments'),
    canAssignCities: can('accounting.users.assign_cities'),
    canAssignRoles: can('accounting.users.assign_roles'),

    // Roles
    canViewRoles: can('accounting.roles.view_page'),
    canCreateRole: can('accounting.roles.create'),
    canUpdateRole: can('accounting.roles.update'),
    canDeleteRole: can('accounting.roles.delete'),

    // Calculation Sheets
    canViewSheets: can('accounting.calculation_sheets.view_page'),
    canCreateSheet: can('accounting.calculation_sheets.create'),
    canUpdateSheet: can('accounting.calculation_sheets.update'),
    canDeleteSheet: can('accounting.calculation_sheets.delete'),
    canPublishSheet: can('accounting.calculation_sheets.publish'),
    canDuplicateSheet: can('accounting.calculation_sheets.duplicate'),
    canExportSheet: can('accounting.calculation_sheets.export'),
    canManageSheetSettings: can('accounting.calculation_sheets.settings'),

    // Create Declaration
    canAccessCreateDeclaration: can('accounting.create_declaration.view_page'),

    // Manage Declarations
    canViewDeclarations: can('accounting.declarations.view_page'),
    canViewAllDeclarations: can('accounting.declarations.view_all'),
    canCreateDeclarationForOther: can('accounting.declarations.create'),
    canUpdateDeclaration: can('accounting.declarations.update'),
    canDeleteDeclaration: can('accounting.declarations.delete'),
    canApproveDeclaration: can('accounting.declarations.approve'),
    canRejectDeclaration: can('accounting.declarations.reject'),
    canRequestModification: can('accounting.declarations.request_modification'),
  }), [can]);

  // Training module specific checks
  const training = useMemo(() => ({
    // Formations
    canViewFormations: can('training.formations.view_page'),
    canCreateFormation: can('training.formations.create'),
    canUpdateFormation: can('training.formations.update'),
    canDeleteFormation: can('training.formations.delete'),
    canDuplicateFormation: can('training.formations.duplicate'),
    canCreatePack: can('training.formations.create_pack'),
    canEditContent: can('training.formations.edit_content'),
    canCreateCorps: can('training.corps.create'),
    canUpdateCorps: can('training.corps.update'),
    canDeleteCorps: can('training.corps.delete'),

    // Sessions
    canViewSessions: can('training.sessions.view_page'),
    canCreateSession: can('training.sessions.create'),
    canUpdateSession: can('training.sessions.update'),
    canDeleteSession: can('training.sessions.delete'),
    canViewSessionDetails: can('training.sessions.view_details'),

    // Analytics
    canViewAnalytics: can('training.analytics.view_page'),
    canExportAnalyticsCsv: can('training.analytics.export_csv'),
    canChangePeriod: can('training.analytics.change_period'),

    // Student Reports
    canViewStudentReports: can('training.student_reports.view_page'),
    canSearchStudents: can('training.student_reports.search'),
    canExportStudentsCsv: can('training.student_reports.export_csv'),
    canExportStudentsPdf: can('training.student_reports.export_pdf'),

    // Certificates
    canViewCertificates: can('training.certificates.view_page'),
    canDownloadCertificate: can('training.certificates.download'),
    canDeleteCertificate: can('training.certificates.delete'),
    canSearchCertificates: can('training.certificates.search'),

    // Certificate Templates
    canViewTemplates: can('training.certificate_templates.view_page'),
    canCreateFolder: can('training.certificate_templates.create_folder'),
    canCreateTemplate: can('training.certificate_templates.create_template'),
    canRenameTemplate: can('training.certificate_templates.rename'),
    canDeleteTemplate: can('training.certificate_templates.delete'),
    canDuplicateTemplate: can('training.certificate_templates.duplicate'),
    canEditCanvas: can('training.certificate_templates.edit_canvas'),
    canOrganizeTemplates: can('training.certificate_templates.organize'),

    // Forums
    canViewForums: can('training.forums.view_page'),
    canPinDiscussion: can('training.forums.pin_discussion'),
    canLockDiscussion: can('training.forums.lock_discussion'),
    canDeleteForumContent: can('training.forums.delete_content'),
    canModerate: can('training.forums.moderate'),
  }), [can]);

  return {
    // Generic permission checks
    can,
    canAny,
    canAll,
    canViewPage,
    canAction,
    canAccessModule,

    // Utility
    viewablePages,
    permissions,
    isAdmin: user?.role === 'admin',

    // Module-specific permissions
    accounting,
    training,
  };
}

// Type for permission code - useful for type safety
export type PermissionCode =
  // Accounting module
  | 'accounting.dashboard.view_page'
  | 'accounting.segments.view_page' | 'accounting.segments.create' | 'accounting.segments.update' | 'accounting.segments.delete' | 'accounting.segments.import_cities'
  | 'accounting.cities.view_page' | 'accounting.cities.create' | 'accounting.cities.update' | 'accounting.cities.delete' | 'accounting.cities.bulk_delete'
  | 'accounting.users.view_page' | 'accounting.users.create' | 'accounting.users.update' | 'accounting.users.delete' | 'accounting.users.assign_segments' | 'accounting.users.assign_cities' | 'accounting.users.assign_roles'
  | 'accounting.roles.view_page' | 'accounting.roles.create' | 'accounting.roles.update' | 'accounting.roles.delete'
  | 'accounting.calculation_sheets.view_page' | 'accounting.calculation_sheets.create' | 'accounting.calculation_sheets.update' | 'accounting.calculation_sheets.delete' | 'accounting.calculation_sheets.publish' | 'accounting.calculation_sheets.duplicate' | 'accounting.calculation_sheets.export' | 'accounting.calculation_sheets.settings'
  | 'accounting.create_declaration.view_page'
  | 'accounting.declarations.view_page' | 'accounting.declarations.view_all' | 'accounting.declarations.create' | 'accounting.declarations.update' | 'accounting.declarations.delete' | 'accounting.declarations.approve' | 'accounting.declarations.reject' | 'accounting.declarations.request_modification'
  // Training module
  | 'training.formations.view_page' | 'training.formations.create' | 'training.formations.update' | 'training.formations.delete' | 'training.formations.duplicate' | 'training.formations.create_pack' | 'training.formations.edit_content'
  | 'training.corps.create' | 'training.corps.update' | 'training.corps.delete'
  | 'training.sessions.view_page' | 'training.sessions.create' | 'training.sessions.update' | 'training.sessions.delete' | 'training.sessions.view_details'
  | 'training.analytics.view_page' | 'training.analytics.export_csv' | 'training.analytics.change_period'
  | 'training.student_reports.view_page' | 'training.student_reports.search' | 'training.student_reports.export_csv' | 'training.student_reports.export_pdf'
  | 'training.certificates.view_page' | 'training.certificates.download' | 'training.certificates.delete' | 'training.certificates.search'
  | 'training.certificate_templates.view_page' | 'training.certificate_templates.create_folder' | 'training.certificate_templates.create_template' | 'training.certificate_templates.rename' | 'training.certificate_templates.delete' | 'training.certificate_templates.duplicate' | 'training.certificate_templates.edit_canvas' | 'training.certificate_templates.organize'
  | 'training.forums.view_page' | 'training.forums.pin_discussion' | 'training.forums.lock_discussion' | 'training.forums.delete_content' | 'training.forums.moderate';
