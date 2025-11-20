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
    },
    users: {
      view_page: 'accounting.users.view_page',
      create: 'accounting.users.create',
      update: 'accounting.users.update',
      delete: 'accounting.users.delete',
    },
    calculation_sheets: {
      view_page: 'accounting.calculation_sheets.view_page',
      create: 'accounting.calculation_sheets.create',
      update: 'accounting.calculation_sheets.update',
      edit: 'accounting.calculation_sheets.edit',
      delete: 'accounting.calculation_sheets.delete',
      publish: 'accounting.calculation_sheets.publish',
    },
    declarations: {
      view_page: 'accounting.declarations.view_page',
      view_all: 'accounting.declarations.view_all',
      create: 'accounting.declarations.create',
      update: 'accounting.declarations.update',
      delete: 'accounting.declarations.delete',
      approve: 'accounting.declarations.approve',
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
    },
    sessions: {
      view_page: 'training.sessions.view_page',
      create: 'training.sessions.create',
      update: 'training.sessions.update',
      delete: 'training.sessions.delete',
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
      download: 'training.certificates.download',
      delete: 'training.certificates.delete',
    },
    certificate_templates: {
      view_page: 'training.certificate_templates.view_page',
      create_folder: 'training.certificate_templates.create_folder',
      create_template: 'training.certificate_templates.create_template',
      rename: 'training.certificate_templates.rename',
      delete: 'training.certificate_templates.delete',
      duplicate: 'training.certificate_templates.duplicate',
      edit_canvas: 'training.certificate_templates.edit_canvas',
      organize: 'training.certificate_templates.organize',
    },
    forums: {
      view_page: 'training.forums.view_page',
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
    },
    attendance: {
      view_page: 'hr.attendance.view_page',
      view_all: 'hr.attendance.view_all',
      edit: 'hr.attendance.edit',
    },
    leaves: {
      view_page: 'hr.leaves.view_page',
      request: 'hr.leaves.request',
      approve: 'hr.leaves.approve',
    },
    dashboard: {
      view_page: 'hr.dashboard.view_page',
      export: 'hr.dashboard.export',
    },
    settings: {
      view_page: 'hr.settings.view_page',
      manage: 'hr.settings.manage',
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