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
  const { user, permissions } = useAuth();

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
    canBulkDeleteCity: can('accounting.cities.bulk_delete'),

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
    canViewSheet: can('accounting.calculation_sheets.view'),
    canCreateSheet: can('accounting.calculation_sheets.create'),
    canUpdateSheet: can('accounting.calculation_sheets.update'),
    canEditCalculationSheet: can('accounting.calculation_sheets.edit'),
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
    canCreateDeclaration: can('accounting.declarations.create'),
    canCreateDeclarationForOther: can('accounting.declarations.create'),
    canFillData: can('accounting.declarations.fill_data'),
    canEditMetadata: can('accounting.declarations.edit_metadata'),
    canDeleteDeclaration: can('accounting.declarations.delete'),
    canApproveDeclaration: can('accounting.declarations.approve'),
    canSubmitDeclaration: can('accounting.declarations.submit'),
    canRejectDeclaration: can('accounting.declarations.reject'),
    canRequestModification: can('accounting.declarations.request_modification'),

    // Professors
    canViewProfessors: can('accounting.professors.view_page'),
    canCreateProfessor: can('accounting.professors.create'),
    canUpdateProfessor: can('accounting.professors.update'),
    canDeleteProfessor: can('accounting.professors.delete'),
    canAssignProfessorCities: can('accounting.professors.assign_cities'),
    canViewProfessorAssignments: can('accounting.professors.view_assignments'),
  }), [can]);

  // HR module specific checks
  const hr = useMemo(() => ({
    // Employees
    canViewEmployees: can('hr.employees.view_page'),
    canCreateEmployee: can('hr.employees.create'),
    canUpdateEmployee: can('hr.employees.update'),
    canDeleteEmployee: can('hr.employees.delete'),
    canViewContracts: can('hr.employees.view_contracts'),
    canManageDocuments: can('hr.employees.manage_documents'),
    canViewDisciplinary: can('hr.employees.view_disciplinary'),
    canManageDisciplinary: can('hr.employees.manage_disciplinary'),

    // Attendance
    canViewAttendance: can('hr.attendance.view_page'),
    canRecordAttendance: can('hr.attendance.record'),
    canCorrectAttendance: can('hr.attendance.correct'),
    canValidateAttendance: can('hr.attendance.validate'),
    canExportAttendance: can('hr.attendance.export'),

    // Overtime
    canRequestOvertime: can('hr.overtime.request'),
    canApproveOvertime: can('hr.overtime.approve'),
    canValidateOvertimePayroll: can('hr.overtime.validate_payroll'),
    canViewOvertimeReports: can('hr.overtime.view_reports'),

    // Leaves
    canViewLeaves: can('hr.leaves.view_page'),
    canRequestLeave: can('hr.leaves.request'),
    canApproveLeave: can('hr.leaves.approve'),
    canManageBalances: can('hr.leaves.manage_balances'),
    canViewCalendar: can('hr.leaves.view_calendar'),
    canManageHolidays: can('hr.leaves.manage_holidays'),
    canExportLeaves: can('hr.leaves.export'),

    // Dashboard
    canViewHRDashboard: can('hr.dashboard.view_page'),
    canViewMonthlyReports: can('hr.dashboard.view_monthly_reports'),
    canGeneratePayrollSummary: can('hr.dashboard.generate_payroll_summary'),
    canExportPayroll: can('hr.dashboard.export_payroll'),
    canViewAlerts: can('hr.dashboard.view_alerts'),

    // Settings
    canViewSettings: can('hr.settings.view_page'),
    canUpdateSettings: can('hr.settings.update'),
    canManageLeaveTypes: can('hr.settings.manage_leave_types'),
    canManageSchedules: can('hr.settings.manage_schedules'),
  }), [can]);

  // Training module specific checks
  const training = useMemo(() => ({
    // Professors
    canViewProfessors: can('training.professors.view_page'),
    canCreateProfessor: can('training.professors.create'),
    canUpdateProfessor: can('training.professors.edit'),
    canDeleteProfessor: can('training.professors.delete'),
    canAssignProfessorSegments: can('training.professors.assign_segments'),
    canAssignProfessorCities: can('training.professors.assign_cities'),

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
    canDuplicateCorps: can('training.corps.duplicate'),

    // Sessions
    canViewSessions: can('training.sessions.view_page'),
    canCreateSession: can('training.sessions.create'),
    canUpdateSession: can('training.sessions.update'),
    canDeleteSession: can('training.sessions.delete'),
    canViewSessionDetails: can('training.sessions.view_details'),
    canAddStudentToSession: can('training.sessions.add_student'),
    canEditStudentInSession: can('training.sessions.edit_student'),

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
    canRenameFolder: can('training.certificate_templates.rename_folder'),
    canRenameTemplate: can('training.certificate_templates.rename_template'),
    canDeleteFolder: can('training.certificate_templates.delete_folder'),
    canDeleteTemplate: can('training.certificate_templates.delete_template'),
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

  // Commercialisation module specific checks
  const commercialisation = useMemo(() => ({
    // Dashboard
    canViewDashboard: can('commercialisation.dashboard.view_page'),
    canViewStats: can('commercialisation.dashboard.view_stats'),
    canExportStats: can('commercialisation.dashboard.export'),

    // Clients
    canViewClients: can('commercialisation.clients.view_page'),
    canViewClientDetails: can('commercialisation.clients.view'),
    canCreateClient: can('commercialisation.clients.create'),
    canUpdateClient: can('commercialisation.clients.edit'),
    canDeleteClient: can('commercialisation.clients.delete'),
    canExportClients: can('commercialisation.clients.export'),

    // Prospects
    canViewProspects: can('commercialisation.prospects.view_page'),
    canViewProspectDetails: can('commercialisation.prospects.view'),
    canCreateProspect: can('commercialisation.prospects.create'),
    canCallProspect: can('commercialisation.prospects.call'),
    canUpdateProspect: can('commercialisation.prospects.update'),
    canDeleteProspect: can('commercialisation.prospects.delete'),
    canImportProspects: can('commercialisation.prospects.import'),
    canExportProspects: can('commercialisation.prospects.export'),
    canAssignProspect: can('commercialisation.prospects.assign'),
    canReinjectProspect: can('commercialisation.prospects.reinject'),
    canCleanProspects: can('commercialisation.prospects.clean'),
    canViewAllProspects: can('commercialisation.prospects.view_all'),

    // Devis (Quotes)
    canViewDevis: can('commercialisation.devis.view_page'),
    canViewDevisDetails: can('commercialisation.devis.view'),
    canCreateDevis: can('commercialisation.devis.create'),
    canUpdateDevis: can('commercialisation.devis.edit'),
    canDeleteDevis: can('commercialisation.devis.delete'),
    canValidateDevis: can('commercialisation.devis.validate'),
    canSendDevis: can('commercialisation.devis.send'),
    canExportDevis: can('commercialisation.devis.export'),

    // Contrats (Contracts)
    canViewContrats: can('commercialisation.contrats.view_page'),
    canViewContratDetails: can('commercialisation.contrats.view'),
    canCreateContrat: can('commercialisation.contrats.create'),
    canUpdateContrat: can('commercialisation.contrats.edit'),
    canDeleteContrat: can('commercialisation.contrats.delete'),
    canSignContrat: can('commercialisation.contrats.sign'),
    canArchiveContrat: can('commercialisation.contrats.archive'),
    canExportContrat: can('commercialisation.contrats.export'),
  }), [can]);

  // System module specific checks
  const system = useMemo(() => ({
    // Roles & Permissions
    canViewRoles: can('system.roles.view_page'),
    canCreateRole: can('system.roles.create'),
    canUpdateRole: can('system.roles.update'),
    canDeleteRole: can('system.roles.delete'),
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
    hr,
    commercialisation,
    system,
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
  | 'training.sessions.view_page' | 'training.sessions.create' | 'training.sessions.update' | 'training.sessions.delete' | 'training.sessions.view_details' | 'training.sessions.add_student' | 'training.sessions.edit_student'
  | 'training.analytics.view_page' | 'training.analytics.export_csv' | 'training.analytics.change_period'
  | 'training.student_reports.view_page' | 'training.student_reports.search' | 'training.student_reports.export_csv' | 'training.student_reports.export_pdf'
  | 'training.certificates.view_page' | 'training.certificates.download' | 'training.certificates.delete' | 'training.certificates.search'
  | 'training.certificate_templates.view_page' | 'training.certificate_templates.create_folder' | 'training.certificate_templates.create_template' | 'training.certificate_templates.rename' | 'training.certificate_templates.delete' | 'training.certificate_templates.duplicate' | 'training.certificate_templates.edit_canvas' | 'training.certificate_templates.organize'
  | 'training.forums.view_page' | 'training.forums.pin_discussion' | 'training.forums.lock_discussion' | 'training.forums.delete_content' | 'training.forums.moderate'
  // HR module
  | 'hr.employees.view_page' | 'hr.employees.create' | 'hr.employees.update' | 'hr.employees.delete' | 'hr.employees.view_contracts' | 'hr.employees.manage_documents' | 'hr.employees.view_disciplinary' | 'hr.employees.manage_disciplinary'
  | 'hr.attendance.view_page' | 'hr.attendance.record' | 'hr.attendance.correct' | 'hr.attendance.validate' | 'hr.attendance.export'
  | 'hr.overtime.request' | 'hr.overtime.approve' | 'hr.overtime.validate_payroll' | 'hr.overtime.view_reports'
  | 'hr.leaves.view_page' | 'hr.leaves.request' | 'hr.leaves.approve' | 'hr.leaves.manage_balances' | 'hr.leaves.view_calendar' | 'hr.leaves.manage_holidays' | 'hr.leaves.export'
  | 'hr.dashboard.view_page' | 'hr.dashboard.view_monthly_reports' | 'hr.dashboard.generate_payroll_summary' | 'hr.dashboard.export_payroll' | 'hr.dashboard.view_alerts'
  | 'hr.settings.view_page' | 'hr.settings.update' | 'hr.settings.manage_leave_types' | 'hr.settings.manage_schedules'
  // Commercialisation module
  | 'commercialisation.dashboard.view_page'
  | 'commercialisation.clients.view_page' | 'commercialisation.clients.view' | 'commercialisation.clients.create' | 'commercialisation.clients.edit' | 'commercialisation.clients.delete' | 'commercialisation.clients.export'
  | 'commercialisation.prospects.view_page' | 'commercialisation.prospects.view' | 'commercialisation.prospects.create' | 'commercialisation.prospects.call' | 'commercialisation.prospects.update' | 'commercialisation.prospects.delete' | 'commercialisation.prospects.import' | 'commercialisation.prospects.export' | 'commercialisation.prospects.assign' | 'commercialisation.prospects.reinject' | 'commercialisation.prospects.clean' | 'commercialisation.prospects.view_all'
  | 'commercialisation.devis.view_page' | 'commercialisation.devis.view' | 'commercialisation.devis.create' | 'commercialisation.devis.edit' | 'commercialisation.devis.delete' | 'commercialisation.devis.validate'
  | 'commercialisation.contrats.view_page' | 'commercialisation.contrats.view' | 'commercialisation.contrats.create' | 'commercialisation.contrats.edit' | 'commercialisation.contrats.delete' | 'commercialisation.contrats.sign';
