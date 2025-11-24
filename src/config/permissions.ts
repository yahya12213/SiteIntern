/**
 * SINGLE SOURCE OF TRUTH for all application permissions
 * This file defines ALL permissions used in the application.
 * Import and use these constants everywhere - NEVER hardcode permission strings!
 */

// Permission structure: module.menu.action
export const PERMISSIONS = {
  // ==================== ACCOUNTING MODULE ====================
  accounting: {
    dashboard: {
      view_page: 'accounting.dashboard.view_page',
    },
    segments: {
      view_page: 'accounting.segments.view_page',
      create: 'accounting.segments.create',
      update: 'accounting.segments.update',
      delete: 'accounting.segments.delete',
    },
    cities: {
      view_page: 'accounting.cities.view_page',
      create: 'accounting.cities.create',
      update: 'accounting.cities.update',
      delete: 'accounting.cities.delete',
      bulk_delete: 'accounting.cities.bulk_delete',
    },
    users: {
      view_page: 'accounting.users.view_page',
      create: 'accounting.users.create',
      update: 'accounting.users.update',
      delete: 'accounting.users.delete',
      assign_segments: 'accounting.users.assign_segments',
      assign_cities: 'accounting.users.assign_cities',
    },
    calculation_sheets: {
      view_page: 'accounting.calculation_sheets.view_page',
      view: 'accounting.calculation_sheets.view',
      create: 'accounting.calculation_sheets.create',
      update: 'accounting.calculation_sheets.update',
      edit: 'accounting.calculation_sheets.edit',
      delete: 'accounting.calculation_sheets.delete',
      publish: 'accounting.calculation_sheets.publish',
      duplicate: 'accounting.calculation_sheets.duplicate',
      export: 'accounting.calculation_sheets.export',
      settings: 'accounting.calculation_sheets.settings',
    },
    declarations: {
      view_page: 'accounting.declarations.view_page',
      view_all: 'accounting.declarations.view_all',
      create: 'accounting.declarations.create',
      fill_data: 'accounting.declarations.fill_data',
      edit_metadata: 'accounting.declarations.edit_metadata',
      delete: 'accounting.declarations.delete',
      approve: 'accounting.declarations.approve',
      submit: 'accounting.declarations.submit',
    },
    professor: {
      declarations: {
        view_page: 'accounting.professor.declarations.view_page',
        fill: 'accounting.professor.declarations.fill',
      },
    },
  },

  // ==================== SYSTEM MODULE ====================
  system: {
    roles: {
      view_page: 'system.roles.view_page',
      create: 'system.roles.create',
      update: 'system.roles.update',
      delete: 'system.roles.delete',
    },
  },

  // ==================== TRAINING MODULE ====================
  training: {
    formations: {
      view_page: 'training.formations.view_page',
      create: 'training.formations.create',
      update: 'training.formations.update',
      delete: 'training.formations.delete',
      duplicate: 'training.formations.duplicate',
      create_pack: 'training.formations.create_pack',
      edit_content: 'training.formations.edit_content',
    },
    corps: {
      view_page: 'training.corps.view_page',
      create: 'training.corps.create',
      update: 'training.corps.update',
      delete: 'training.corps.delete',
      duplicate: 'training.corps.duplicate',
    },
    centres: {
      view_page: 'training.centres.view_page',
      create: 'training.centres.create',
      update: 'training.centres.update',
      delete: 'training.centres.delete',
    },
    sessions: {
      view_page: 'training.sessions.view_page',
      create: 'training.sessions.create',
      update: 'training.sessions.update',
      delete: 'training.sessions.delete',
    },
    students: {
      view_page: 'training.students.view_page',
      create: 'training.students.create',
      update: 'training.students.update',
      delete: 'training.students.delete',
    },
    analytics: {
      view_page: 'training.analytics.view_page',
      export: 'training.analytics.export',
    },
    student_reports: {
      view_page: 'training.student_reports.view_page',
      export: 'training.student_reports.export',
    },
    certificates: {
      view_page: 'training.certificates.view_page',
      view: 'training.certificates.view',
      generate: 'training.certificates.generate',
      update: 'training.certificates.update',
      download: 'training.certificates.download',
      delete: 'training.certificates.delete',
    },
    certificate_templates: {
      view_page: 'training.certificate_templates.view_page',
      view: 'training.certificate_templates.view',
      create: 'training.certificate_templates.create',
      create_folder: 'training.certificate_templates.create_folder',
      create_template: 'training.certificate_templates.create_template',
      update: 'training.certificate_templates.update',
      rename_folder: 'training.certificate_templates.rename_folder',
      rename_template: 'training.certificate_templates.rename_template',
      delete_folder: 'training.certificate_templates.delete_folder',
      delete_template: 'training.certificate_templates.delete_template',
      duplicate: 'training.certificate_templates.duplicate',
      edit_canvas: 'training.certificate_templates.edit_canvas',
      organize: 'training.certificate_templates.organize',
    },
    template_folders: {
      view_page: 'training.template_folders.view_page',
      view: 'training.template_folders.view',
      create: 'training.template_folders.create',
      update: 'training.template_folders.update',
      delete: 'training.template_folders.delete',
    },
    forums: {
      view_page: 'training.forums.view_page',
      view: 'training.forums.view',
      create_thread: 'training.forums.create_thread',
      update_thread: 'training.forums.update_thread',
      reply: 'training.forums.reply',
      react: 'training.forums.react',
      delete: 'training.forums.delete',
      manage: 'training.forums.manage',
      moderate: 'training.forums.moderate',
    },
    student: {
      dashboard: {
        view_page: 'training.student.dashboard.view_page',
      },
      catalog: {
        view_page: 'training.student.catalog.view_page',
      },
      course: {
        view: 'training.student.course.view',
        videos: {
          view: 'training.student.course.videos.view',
        },
        tests: {
          take: 'training.student.course.tests.take',
        },
      },
      certificates: {
        view: 'training.student.certificates.view',
      },
      forums: {
        participate: 'training.student.forums.participate',
      },
    },
  },

  // ==================== HR MODULE ====================
  hr: {
    clocking: {
      self: 'hr.clocking.self',
    },
    employees: {
      view_page: 'hr.employees.view_page',
      create: 'hr.employees.create',
      update: 'hr.employees.update',
      delete: 'hr.employees.delete',
      view_salary: 'hr.employees.view_salary',
    },
    contracts: {
      manage: 'hr.contracts.manage',
    },
    documents: {
      manage: 'hr.documents.manage',
    },
    discipline: {
      manage: 'hr.discipline.manage',
    },
    attendance: {
      view_page: 'hr.attendance.view_page',
      view_all: 'hr.attendance.view_all',
      edit: 'hr.attendance.edit',
      edit_anomalies: 'hr.attendance.edit_anomalies',
      correct_records: 'hr.attendance.correct_records',
      import_records: 'hr.attendance.import_records',
      record: 'hr.attendance.record',
      validate: 'hr.attendance.validate',
      export: 'hr.attendance.export',
    },
    overtime: {
      view_page: 'hr.overtime.view_page',
      request: 'hr.overtime.request',
      approve: 'hr.overtime.approve',
      validate_payroll: 'hr.overtime.validate_payroll',
      view_reports: 'hr.overtime.view_reports',
    },
    leaves: {
      view_page: 'hr.leaves.view_page',
      request: 'hr.leaves.request',
      approve: 'hr.leaves.approve',
      approve_n1: 'hr.leaves.approve_n1',
      approve_n2: 'hr.leaves.approve_n2',
      approve_hr: 'hr.leaves.approve_hr',
      manage_balances: 'hr.leaves.manage_balances',
      view_calendar: 'hr.leaves.view_calendar',
      export: 'hr.leaves.export',
    },
    holidays: {
      manage: 'hr.holidays.manage',
    },
    dashboard: {
      view_page: 'hr.dashboard.view_page',
      export: 'hr.dashboard.export',
      export_reports: 'hr.dashboard.export_reports',
      view_monthly_reports: 'hr.dashboard.view_monthly_reports',
      generate_payroll_summary: 'hr.dashboard.generate_payroll_summary',
      export_payroll: 'hr.dashboard.export_payroll',
      view_alerts: 'hr.dashboard.view_alerts',
    },
    monthly_summary: {
      view: 'hr.monthly_summary.view',
      validate: 'hr.monthly_summary.validate',
      export: 'hr.monthly_summary.export',
    },
    settings: {
      view_page: 'hr.settings.view_page',
      manage: 'hr.settings.manage',
      manage_schedules: 'hr.settings.manage_schedules',
      manage_leave_rules: 'hr.settings.manage_leave_rules',
      manage_workflows: 'hr.settings.manage_workflows',
      update: 'hr.settings.update',
    },
  },

  // ==================== COMMERCIALISATION MODULE ====================
  commercialisation: {
    dashboard: {
      view_page: 'commercialisation.dashboard.view_page',
      view_stats: 'commercialisation.dashboard.view_stats',
      export: 'commercialisation.dashboard.export',
    },
    clients: {
      view_page: 'commercialisation.clients.view_page',
      view: 'commercialisation.clients.view',
      create: 'commercialisation.clients.create',
      edit: 'commercialisation.clients.edit',
      delete: 'commercialisation.clients.delete',
      export: 'commercialisation.clients.export',
    },
    prospects: {
      view_page: 'commercialisation.prospects.view_page',
      view: 'commercialisation.prospects.view',
      create: 'commercialisation.prospects.create',
      edit: 'commercialisation.prospects.edit',
      delete: 'commercialisation.prospects.delete',
      convert: 'commercialisation.prospects.convert',
      export: 'commercialisation.prospects.export',
    },
    devis: {
      view_page: 'commercialisation.devis.view_page',
      view: 'commercialisation.devis.view',
      create: 'commercialisation.devis.create',
      edit: 'commercialisation.devis.edit',
      delete: 'commercialisation.devis.delete',
      validate: 'commercialisation.devis.validate',
      send: 'commercialisation.devis.send',
      export: 'commercialisation.devis.export',
    },
    contrats: {
      view_page: 'commercialisation.contrats.view_page',
      view: 'commercialisation.contrats.view',
      create: 'commercialisation.contrats.create',
      edit: 'commercialisation.contrats.edit',
      delete: 'commercialisation.contrats.delete',
      sign: 'commercialisation.contrats.sign',
      archive: 'commercialisation.contrats.archive',
      export: 'commercialisation.contrats.export',
    },
  },
} as const;

// Type-safe permission utilities
export type PermissionModule = keyof typeof PERMISSIONS;
export type PermissionMenu<M extends PermissionModule> = keyof typeof PERMISSIONS[M];
export type PermissionAction<
  M extends PermissionModule,
  Me extends PermissionMenu<M>
> = keyof typeof PERMISSIONS[M][Me];

// Helper to get all permissions as flat array
export function getAllPermissionCodes(): string[] {
  const codes: string[] = [];

  Object.values(PERMISSIONS).forEach(moduleObj => {
    Object.values(moduleObj).forEach(menuObj => {
      Object.values(menuObj).forEach(permission => {
        if (typeof permission === 'string') {
          codes.push(permission);
        }
      });
    });
  });

  return codes;
}

// Helper to validate if a permission code exists
export function isValidPermission(code: string): boolean {
  return getAllPermissionCodes().includes(code);
}

// Helper to get permission label (for UI display)
export function getPermissionLabel(code: string): string {
  // Map permission codes to French labels
  const labels: Record<string, string> = {
    // Accounting
    'accounting.dashboard.view_page': 'Voir le tableau de bord',
    'accounting.segments.view_page': 'Voir les segments',
    'accounting.cities.view_page': 'Voir les villes',
    'accounting.users.view_page': 'Voir les utilisateurs',
    'accounting.sheets.view_page': 'Voir les fiches de calcul',
    'accounting.declarations.view_page': 'Voir les déclarations',

    // System
    'system.roles.view_page': 'Voir les rôles et permissions',

    // Training
    'training.formations.view_page': 'Voir les formations',
    'training.sessions.view_page': 'Voir les sessions',
    'training.analytics.view_page': 'Voir les analytics',
    'training.student_reports.view_page': 'Voir les rapports étudiants',
    'training.certificates.view_page': 'Voir les certificats',
    'training.certificate_templates.view_page': 'Voir les templates de certificats',
    'training.forums.view_page': 'Voir les forums',

    // HR
    'hr.clocking.self': 'Pointage personnel',
    'hr.employees.view_page': 'Voir les dossiers du personnel',
    'hr.attendance.view_page': 'Voir temps et présence',
    'hr.leaves.view_page': 'Voir congés et planning',
    'hr.dashboard.view_page': 'Voir tableau de bord RH',
    'hr.settings.view_page': 'Voir paramètres RH',

    // Commercialisation
    'commercialisation.dashboard.view_page': 'Voir tableau de bord commercial',
    'commercialisation.clients.view_page': 'Voir les clients',
    'commercialisation.prospects.view_page': 'Voir les prospects',
    'commercialisation.devis.view_page': 'Voir les devis',
    'commercialisation.contrats.view_page': 'Voir les contrats',
  };

  return labels[code] || code;
}