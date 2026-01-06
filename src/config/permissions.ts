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
    // Gestion de Projet
    projects: {
      view_page: 'accounting.projects.view_page',
      create: 'accounting.projects.create',
      update: 'accounting.projects.update',
      delete: 'accounting.projects.delete',
      export: 'accounting.projects.export',
    },
    actions: {
      view_page: 'accounting.actions.view_page',
      create: 'accounting.actions.create',
      update: 'accounting.actions.update',
      delete: 'accounting.actions.delete',
    },
    // Gestion des Professeurs
    professors: {
      view_page: 'accounting.professors.view_page',
      create: 'accounting.professors.create',
      update: 'accounting.professors.update',
      delete: 'accounting.professors.delete',
      assign_cities: 'accounting.professors.assign_cities',
      view_assignments: 'accounting.professors.view_assignments',
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
      add_student: 'training.sessions.add_student',
      edit_student: 'training.sessions.edit_student',
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
    // Boucles de validation
    validation_workflows: {
      view_page: 'hr.validation_workflows.view_page',
      create: 'hr.validation_workflows.create',
      update: 'hr.validation_workflows.update',
      delete: 'hr.validation_workflows.delete',
    },
    // Gestion des horaires
    schedules: {
      view_page: 'hr.schedules.view_page',
      manage_models: 'hr.schedules.manage_models',
      manage_holidays: 'hr.schedules.manage_holidays',
      view_validated_leaves: 'hr.schedules.view_validated_leaves',
      manage_overtime: 'hr.schedules.manage_overtime',
    },
    // Gestion de paie
    payroll: {
      view_page: 'hr.payroll.view_page',
      manage_periods: 'hr.payroll.manage_periods',
      calculate: 'hr.payroll.calculate',
      view_payslips: 'hr.payroll.view_payslips',
      generate_payslips: 'hr.payroll.generate_payslips',
      view_tests: 'hr.payroll.view_tests',
      manage_automation: 'hr.payroll.manage_automation',
      manage_config: 'hr.payroll.manage_config',
    },
    // Portail employé
    employee_portal: {
      view_page: 'hr.employee_portal.view_page',
      clock_in_out: 'hr.employee_portal.clock_in_out',
      submit_requests: 'hr.employee_portal.submit_requests',
      view_history: 'hr.employee_portal.view_history',
    },
    // Validation des demandes
    requests_validation: {
      view_page: 'hr.requests_validation.view_page',
      approve: 'hr.requests_validation.approve',
      reject: 'hr.requests_validation.reject',
    },
    // Délégation d'approbation
    delegation: {
      view_page: 'hr.delegation.view_page',
      create: 'hr.delegation.create',
      manage_all: 'hr.delegation.manage_all',
    },
    // Manager - Vue équipe
    manager: {
      team_view: 'hr.manager.team_view',
      team_attendance: 'hr.manager.team_attendance',
      team_requests: 'hr.manager.team_requests',
      approve_requests: 'hr.manager.approve_requests',
    },
    // Employé Self-Service
    my: {
      requests: 'hr.my.requests',
      payslips: 'hr.my.payslips',
      profile: 'hr.my.profile',
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
      call: 'commercialisation.prospects.call',
      update: 'commercialisation.prospects.update',
      delete: 'commercialisation.prospects.delete',
      convert: 'commercialisation.prospects.convert',
      import: 'commercialisation.prospects.import',
      export: 'commercialisation.prospects.export',
      assign: 'commercialisation.prospects.assign',
      reinject: 'commercialisation.prospects.reinject',
      clean: 'commercialisation.prospects.clean',
      view_all: 'commercialisation.prospects.view_all',
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
    // Visites physiques
    visits: {
      view_page: 'commercialisation.visits.view_page',
      create: 'commercialisation.visits.create',
      update: 'commercialisation.visits.update',
      delete: 'commercialisation.visits.delete',
      export: 'commercialisation.visits.export',
      view_analytics: 'commercialisation.visits.view_analytics',
      view_all: 'commercialisation.visits.view_all',
    },
    // Google Contacts
    google_contacts: {
      view_page: 'commercialisation.google_contacts.view_page',
      configure: 'commercialisation.google_contacts.configure',
      sync: 'commercialisation.google_contacts.sync',
      test: 'commercialisation.google_contacts.test',
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
  // Map permission codes to French labels (matching button names)
  const labels: Record<string, string> = {
    // ==================== ACCOUNTING MODULE ====================
    // Dashboard
    'accounting.dashboard.view_page': 'Voir le tableau de bord',

    // Segments
    'accounting.segments.view_page': 'Voir les segments',
    'accounting.segments.create': 'Créer',
    'accounting.segments.update': 'Modifier',
    'accounting.segments.delete': 'Supprimer',
    'accounting.segments.import_cities': 'Importer villes',

    // Cities
    'accounting.cities.view_page': 'Voir les villes',
    'accounting.cities.create': 'Créer',
    'accounting.cities.update': 'Modifier',
    'accounting.cities.delete': 'Supprimer',
    'accounting.cities.bulk_delete': 'Supprimer en masse',

    // Users
    'accounting.users.view_page': 'Voir les utilisateurs',
    'accounting.users.create': 'Créer',
    'accounting.users.update': 'Modifier',
    'accounting.users.delete': 'Supprimer',
    'accounting.users.assign_segments': 'Assigner segments',
    'accounting.users.assign_cities': 'Assigner villes',

    // Calculation Sheets
    'accounting.calculation_sheets.view_page': 'Voir les fiches de calcul',
    'accounting.calculation_sheets.view': 'Voir',
    'accounting.calculation_sheets.create': 'Créer',
    'accounting.calculation_sheets.update': 'Modifier',
    'accounting.calculation_sheets.edit': 'Modifier (éditeur)',
    'accounting.calculation_sheets.delete': 'Supprimer',
    'accounting.calculation_sheets.publish': 'Publier',
    'accounting.calculation_sheets.duplicate': 'Dupliquer',
    'accounting.calculation_sheets.export': 'Exporter',
    'accounting.calculation_sheets.settings': 'Paramètres',

    // Declarations (IMPORTANT: noms des boutons)
    'accounting.declarations.view_page': 'Voir les déclarations',
    'accounting.declarations.view_all': 'Voir toutes',
    'accounting.declarations.create': 'Créer',
    'accounting.declarations.fill_data': 'Remplir',
    'accounting.declarations.edit_metadata': 'Modifier métadonnées',
    'accounting.declarations.delete': 'Supprimer',
    'accounting.declarations.approve': 'Approuver',
    'accounting.declarations.submit': 'Soumettre',

    // Professor Declarations
    'accounting.professor.declarations.view_page': 'Voir mes déclarations',
    'accounting.professor.declarations.fill': 'Remplir',

    // Gestion de Projet
    'accounting.projects.view_page': 'Voir les projets',
    'accounting.projects.create': 'Créer un projet',
    'accounting.projects.update': 'Modifier un projet',
    'accounting.projects.delete': 'Supprimer un projet',
    'accounting.projects.export': 'Exporter les projets',

    // Actions (Plan d\'Action)
    'accounting.actions.view_page': 'Voir le plan d\'action',
    'accounting.actions.create': 'Créer une action',
    'accounting.actions.update': 'Modifier une action',
    'accounting.actions.delete': 'Supprimer une action',

    // Professeurs
    'accounting.professors.view_page': 'Voir les professeurs',
    'accounting.professors.create': 'Créer un professeur',
    'accounting.professors.update': 'Modifier un professeur',
    'accounting.professors.delete': 'Supprimer un professeur',
    'accounting.professors.assign_cities': 'Assigner des villes',
    'accounting.professors.view_assignments': 'Voir les affectations',

    // ==================== SYSTEM MODULE ====================
    'system.roles.view_page': 'Voir les rôles',
    'system.roles.create': 'Créer',
    'system.roles.update': 'Modifier',
    'system.roles.delete': 'Supprimer',

    // ==================== TRAINING MODULE ====================
    // Formations
    'training.formations.view_page': 'Voir les formations',
    'training.formations.create': 'Créer',
    'training.formations.update': 'Modifier',
    'training.formations.delete': 'Supprimer',
    'training.formations.duplicate': 'Dupliquer',
    'training.formations.create_pack': 'Créer pack',
    'training.formations.edit_content': 'Éditer contenu',

    // Corps de Formation
    'training.corps.view_page': 'Voir les corps',
    'training.corps.create': 'Créer',
    'training.corps.update': 'Modifier',
    'training.corps.delete': 'Supprimer',
    'training.corps.duplicate': 'Dupliquer',

    // Centres
    'training.centres.view_page': 'Voir les centres',
    'training.centres.create': 'Créer',
    'training.centres.update': 'Modifier',
    'training.centres.delete': 'Supprimer',

    // Sessions
    'training.sessions.view_page': 'Voir les sessions',
    'training.sessions.create': 'Créer',
    'training.sessions.update': 'Modifier',
    'training.sessions.delete': 'Supprimer',
    'training.sessions.add_student': 'Ajouter étudiant',
    'training.sessions.edit_student': 'Modifier étudiant',

    // Students
    'training.students.view_page': 'Voir les étudiants',
    'training.students.create': 'Créer',
    'training.students.update': 'Modifier',
    'training.students.delete': 'Supprimer',

    // Analytics
    'training.analytics.view_page': 'Voir les analytics',
    'training.analytics.export': 'Exporter',

    // Student Reports
    'training.student_reports.view_page': 'Voir les rapports',
    'training.student_reports.export': 'Exporter',

    // Certificates
    'training.certificates.view_page': 'Voir les certificats',
    'training.certificates.view': 'Voir',
    'training.certificates.generate': 'Générer',
    'training.certificates.update': 'Modifier',
    'training.certificates.download': 'Télécharger',
    'training.certificates.delete': 'Supprimer',

    // Certificate Templates (IMPORTANT: noms des boutons)
    'training.certificate_templates.view_page': 'Voir les templates',
    'training.certificate_templates.view': 'Voir',
    'training.certificate_templates.create': 'Créer',
    'training.certificate_templates.create_folder': 'Nouveau dossier',
    'training.certificate_templates.create_template': 'Nouveau template',
    'training.certificate_templates.update': 'Modifier',
    'training.certificate_templates.rename_folder': 'Renommer dossier',
    'training.certificate_templates.rename_template': 'Renommer template',
    'training.certificate_templates.delete_folder': 'Supprimer dossier',
    'training.certificate_templates.delete_template': 'Supprimer template',
    'training.certificate_templates.duplicate': 'Dupliquer',
    'training.certificate_templates.edit_canvas': 'Modifier Canvas',
    'training.certificate_templates.organize': 'Organiser',

    // Template Folders
    'training.template_folders.view_page': 'Voir les dossiers',
    'training.template_folders.view': 'Voir',
    'training.template_folders.create': 'Créer',
    'training.template_folders.update': 'Modifier',
    'training.template_folders.delete': 'Supprimer',

    // Forums
    'training.forums.view_page': 'Voir les forums',
    'training.forums.view': 'Voir',
    'training.forums.create_thread': 'Créer discussion',
    'training.forums.update_thread': 'Modifier discussion',
    'training.forums.reply': 'Répondre',
    'training.forums.react': 'Réagir',
    'training.forums.delete': 'Supprimer',
    'training.forums.manage': 'Gérer',
    'training.forums.moderate': 'Modérer',

    // Student Portal
    'training.student.dashboard.view_page': 'Voir tableau de bord',
    'training.student.catalog.view_page': 'Voir catalogue',
    'training.student.course.view': 'Voir cours',
    'training.student.course.videos.view': 'Voir vidéos',
    'training.student.course.tests.take': 'Passer tests',
    'training.student.certificates.view': 'Voir certificats',
    'training.student.forums.participate': 'Participer',

    // ==================== HR MODULE ====================
    'hr.clocking.self': 'Pointage personnel',

    // Employees
    'hr.employees.view_page': 'Voir le personnel',
    'hr.employees.create': 'Créer',
    'hr.employees.update': 'Modifier',
    'hr.employees.delete': 'Supprimer',
    'hr.employees.view_salary': 'Voir salaire',

    // Contracts
    'hr.contracts.manage': 'Gérer contrats',

    // Documents
    'hr.documents.manage': 'Gérer documents',

    // Discipline
    'hr.discipline.manage': 'Gérer discipline',

    // Attendance
    'hr.attendance.view_page': 'Voir présence',
    'hr.attendance.view_all': 'Voir toutes',
    'hr.attendance.edit': 'Modifier',
    'hr.attendance.edit_anomalies': 'Modifier anomalies',
    'hr.attendance.correct_records': 'Corriger enregistrements',
    'hr.attendance.import_records': 'Importer enregistrements',
    'hr.attendance.record': 'Enregistrer',
    'hr.attendance.validate': 'Valider',
    'hr.attendance.export': 'Exporter',

    // Overtime
    'hr.overtime.view_page': 'Voir heures sup',
    'hr.overtime.request': 'Demander',
    'hr.overtime.approve': 'Approuver',
    'hr.overtime.validate_payroll': 'Valider paie',
    'hr.overtime.view_reports': 'Voir rapports',

    // Leaves
    'hr.leaves.view_page': 'Voir congés',
    'hr.leaves.request': 'Demander',
    'hr.leaves.approve': 'Approuver',
    'hr.leaves.approve_n1': 'Approuver N+1',
    'hr.leaves.approve_n2': 'Approuver N+2',
    'hr.leaves.approve_hr': 'Approuver RH',
    'hr.leaves.manage_balances': 'Gérer soldes',
    'hr.leaves.view_calendar': 'Voir calendrier',
    'hr.leaves.export': 'Exporter',

    // Holidays
    'hr.holidays.manage': 'Gérer jours fériés',

    // Dashboard
    'hr.dashboard.view_page': 'Voir tableau de bord',
    'hr.dashboard.export': 'Exporter',
    'hr.dashboard.export_reports': 'Exporter rapports',
    'hr.dashboard.view_monthly_reports': 'Voir rapports mensuels',
    'hr.dashboard.generate_payroll_summary': 'Générer résumé paie',
    'hr.dashboard.export_payroll': 'Exporter paie',
    'hr.dashboard.view_alerts': 'Voir alertes',

    // Monthly Summary
    'hr.monthly_summary.view': 'Voir',
    'hr.monthly_summary.validate': 'Valider',
    'hr.monthly_summary.export': 'Exporter',

    // Settings
    'hr.settings.view_page': 'Voir paramètres',
    'hr.settings.manage': 'Gérer',
    'hr.settings.manage_schedules': 'Gérer horaires',
    'hr.settings.manage_leave_rules': 'Gérer règles congés',
    'hr.settings.manage_workflows': 'Gérer workflows',
    'hr.settings.update': 'Modifier',

    // ==================== COMMERCIALISATION MODULE ====================
    // Dashboard
    'commercialisation.dashboard.view_page': 'Voir tableau de bord',
    'commercialisation.dashboard.view_stats': 'Voir statistiques',
    'commercialisation.dashboard.export': 'Exporter',

    // Clients
    'commercialisation.clients.view_page': 'Voir les clients',
    'commercialisation.clients.view': 'Voir',
    'commercialisation.clients.create': 'Créer',
    'commercialisation.clients.edit': 'Modifier',
    'commercialisation.clients.delete': 'Supprimer',
    'commercialisation.clients.export': 'Exporter',

    // Prospects
    'commercialisation.prospects.view_page': 'Voir les prospects',
    'commercialisation.prospects.view': 'Voir',
    'commercialisation.prospects.create': 'Créer',
    'commercialisation.prospects.edit': 'Modifier',
    'commercialisation.prospects.call': 'Appeler',
    'commercialisation.prospects.update': 'Mettre à jour',
    'commercialisation.prospects.delete': 'Supprimer',
    'commercialisation.prospects.convert': 'Convertir',
    'commercialisation.prospects.import': 'Importer',
    'commercialisation.prospects.export': 'Exporter',
    'commercialisation.prospects.assign': 'Assigner',
    'commercialisation.prospects.reinject': 'Réinjecter',
    'commercialisation.prospects.clean': 'Nettoyer',
    'commercialisation.prospects.view_all': 'Voir tous',

    // Devis
    'commercialisation.devis.view_page': 'Voir les devis',
    'commercialisation.devis.view': 'Voir',
    'commercialisation.devis.create': 'Créer',
    'commercialisation.devis.edit': 'Modifier',
    'commercialisation.devis.delete': 'Supprimer',
    'commercialisation.devis.validate': 'Valider',
    'commercialisation.devis.send': 'Envoyer',
    'commercialisation.devis.export': 'Exporter',

    // Contrats
    'commercialisation.contrats.view_page': 'Voir les contrats',
    'commercialisation.contrats.view': 'Voir',
    'commercialisation.contrats.create': 'Créer',
    'commercialisation.contrats.edit': 'Modifier',
    'commercialisation.contrats.delete': 'Supprimer',
    'commercialisation.contrats.sign': 'Signer',
    'commercialisation.contrats.archive': 'Archiver',
    'commercialisation.contrats.export': 'Exporter',

    // Visites
    'commercialisation.visits.view_page': 'Voir les visites',
    'commercialisation.visits.create': 'Enregistrer une visite',
    'commercialisation.visits.update': 'Modifier une visite',
    'commercialisation.visits.delete': 'Supprimer une visite',
    'commercialisation.visits.export': 'Exporter les visites',
    'commercialisation.visits.view_analytics': 'Voir les analytics',
    'commercialisation.visits.view_all': 'Voir toutes les visites',

    // Google Contacts
    'commercialisation.google_contacts.view_page': 'Voir Gestion G-Contacte',
    'commercialisation.google_contacts.configure': 'Configurer tokens Google',
    'commercialisation.google_contacts.sync': 'Synchroniser contacts',
    'commercialisation.google_contacts.test': 'Tester connexion Google',
  };

  return labels[code] || code;
}