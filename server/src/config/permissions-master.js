/**
 * PERMISSIONS MASTER - Source Unique de Vérité
 *
 * Ce fichier définit TOUTES les permissions du système avec leurs labels et descriptions en français.
 * Format: module.menu.action
 *
 * Modules:
 * - accounting: Gestion Comptable
 * - training: Formation en Ligne
 * - hr: Ressources Humaines
 * - commercialisation: Commercialisation
 * - system: Système
 */

export const PERMISSIONS_MASTER = {
  // ============================================================
  // MODULE 1: GESTION COMPTABLE
  // ============================================================
  accounting: {
    dashboard: [
      {
        action: 'view_page',
        label: 'Voir le tableau de bord',
        description: 'Permet d\'accéder au tableau de bord principal avec les statistiques générales',
        sort_order: 1
      }
    ],

    segments: [
      {
        action: 'view_page',
        label: 'Voir la page des segments',
        description: 'Permet d\'accéder à la liste des segments',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer un segment',
        description: 'Permet de créer un nouveau segment de formation',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier un segment',
        description: 'Permet de modifier les informations d\'un segment existant',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer un segment',
        description: 'Permet de supprimer définitivement un segment',
        sort_order: 4
      }
    ],

    cities: [
      {
        action: 'view_page',
        label: 'Voir la page des villes',
        description: 'Permet d\'accéder à la liste des villes',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer une ville',
        description: 'Permet d\'ajouter une nouvelle ville au système',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier une ville',
        description: 'Permet de modifier les informations d\'une ville',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer une ville',
        description: 'Permet de supprimer une ville du système',
        sort_order: 4
      },
      {
        action: 'bulk_delete',
        label: 'Suppression en masse',
        description: 'Permet de supprimer plusieurs villes en une seule action',
        sort_order: 5
      }
    ],

    users: [
      {
        action: 'view_page',
        label: 'Voir la page des utilisateurs',
        description: 'Permet d\'accéder à la liste des utilisateurs du système',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer un utilisateur',
        description: 'Permet de créer un nouveau compte utilisateur',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier un utilisateur',
        description: 'Permet de modifier les informations d\'un utilisateur',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer un utilisateur',
        description: 'Permet de supprimer un compte utilisateur',
        sort_order: 4
      },
      {
        action: 'assign_segments',
        label: 'Assigner des segments',
        description: 'Permet d\'attribuer des segments à un utilisateur pour limiter son accès',
        sort_order: 5
      },
      {
        action: 'assign_cities',
        label: 'Assigner des villes',
        description: 'Permet d\'attribuer des villes à un utilisateur pour limiter son accès',
        sort_order: 6
      }
    ],

    calculation_sheets: [
      {
        action: 'view_page',
        label: 'Voir la page des fiches',
        description: 'Permet d\'accéder à la liste des fiches de calcul',
        sort_order: 1
      },
      {
        action: 'view',
        label: 'Voir les détails',
        description: 'Permet de consulter le contenu d\'une fiche de calcul',
        sort_order: 2
      },
      {
        action: 'create',
        label: 'Créer une fiche',
        description: 'Permet de créer une nouvelle fiche de calcul',
        sort_order: 3
      },
      {
        action: 'update',
        label: 'Modifier une fiche',
        description: 'Permet de modifier les métadonnées d\'une fiche',
        sort_order: 4
      },
      {
        action: 'edit',
        label: 'Éditer le contenu',
        description: 'Permet d\'éditer les cellules et formules de la fiche',
        sort_order: 5
      },
      {
        action: 'delete',
        label: 'Supprimer une fiche',
        description: 'Permet de supprimer définitivement une fiche de calcul',
        sort_order: 6
      },
      {
        action: 'publish',
        label: 'Publier une fiche',
        description: 'Permet de publier une fiche pour qu\'elle soit accessible aux professeurs',
        sort_order: 7
      },
      {
        action: 'duplicate',
        label: 'Dupliquer une fiche',
        description: 'Permet de créer une copie d\'une fiche existante',
        sort_order: 8
      },
      {
        action: 'export',
        label: 'Exporter une fiche',
        description: 'Permet d\'exporter les données au format Excel',
        sort_order: 9
      }
    ],

    declarations: [
      {
        action: 'view_page',
        label: 'Voir la page des déclarations',
        description: 'Permet d\'accéder à la liste des déclarations',
        sort_order: 1
      },
      {
        action: 'view_all',
        label: 'Voir toutes les déclarations',
        description: 'Permet de voir les déclarations de tous les utilisateurs',
        sort_order: 2
      },
      {
        action: 'create',
        label: 'Créer une déclaration',
        description: 'Permet de créer une nouvelle déclaration',
        sort_order: 3
      },
      {
        action: 'fill_data',
        label: 'Remplir les données',
        description: 'Permet de saisir les données dans une déclaration',
        sort_order: 4
      },
      {
        action: 'edit_metadata',
        label: 'Modifier les métadonnées',
        description: 'Permet de modifier les informations générales de la déclaration',
        sort_order: 5
      },
      {
        action: 'delete',
        label: 'Supprimer une déclaration',
        description: 'Permet de supprimer définitivement une déclaration',
        sort_order: 6
      },
      {
        action: 'submit',
        label: 'Soumettre une déclaration',
        description: 'Permet de soumettre une déclaration pour approbation',
        sort_order: 7
      },
      {
        action: 'approve',
        label: 'Approuver une déclaration',
        description: 'Permet d\'approuver une déclaration soumise',
        sort_order: 8
      },
      {
        action: 'reject',
        label: 'Rejeter une déclaration',
        description: 'Permet de rejeter une déclaration avec un commentaire',
        sort_order: 9
      }
    ],

    projects: [
      {
        action: 'view_page',
        label: 'Voir la page des projets',
        description: 'Permet d\'accéder à la liste des projets',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer un projet',
        description: 'Permet de créer un nouveau projet',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier un projet',
        description: 'Permet de modifier les informations d\'un projet',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer un projet',
        description: 'Permet de supprimer un projet',
        sort_order: 4
      },
      {
        action: 'export',
        label: 'Exporter les projets',
        description: 'Permet d\'exporter la liste des projets',
        sort_order: 5
      }
    ]
  },

  // ============================================================
  // MODULE 2: FORMATION EN LIGNE
  // ============================================================
  training: {
    formations: [
      {
        action: 'view_page',
        label: 'Voir la page des formations',
        description: 'Permet d\'accéder à la liste des formations',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer une formation',
        description: 'Permet de créer une nouvelle formation',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier une formation',
        description: 'Permet de modifier les informations d\'une formation',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer une formation',
        description: 'Permet de supprimer une formation et son contenu',
        sort_order: 4
      },
      {
        action: 'duplicate',
        label: 'Dupliquer une formation',
        description: 'Permet de créer une copie d\'une formation existante',
        sort_order: 5
      },
      {
        action: 'create_pack',
        label: 'Créer un pack',
        description: 'Permet de regrouper plusieurs formations en un pack',
        sort_order: 6
      },
      {
        action: 'edit_content',
        label: 'Éditer le contenu',
        description: 'Permet d\'ajouter/modifier des modules, vidéos et tests',
        sort_order: 7
      }
    ],

    corps: [
      {
        action: 'view_page',
        label: 'Voir les corps de formation',
        description: 'Permet de voir les catégories de formations',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer un corps',
        description: 'Permet de créer une nouvelle catégorie de formations',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier un corps',
        description: 'Permet de modifier une catégorie de formations',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer un corps',
        description: 'Permet de supprimer une catégorie (formations incluses)',
        sort_order: 4
      },
      {
        action: 'duplicate',
        label: 'Dupliquer un corps',
        description: 'Permet de dupliquer une catégorie avec ses formations',
        sort_order: 5
      }
    ],

    sessions: [
      {
        action: 'view_page',
        label: 'Voir la page des sessions',
        description: 'Permet d\'accéder à la liste des sessions de formation',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer une session',
        description: 'Permet de créer une nouvelle session de formation',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier une session',
        description: 'Permet de modifier les informations d\'une session',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer une session',
        description: 'Permet de supprimer une session et ses inscriptions',
        sort_order: 4
      },
      {
        action: 'add_student',
        label: 'Ajouter un étudiant',
        description: 'Permet d\'inscrire un étudiant à la session',
        sort_order: 5
      },
      {
        action: 'edit_student',
        label: 'Modifier un étudiant',
        description: 'Permet de modifier l\'inscription d\'un étudiant',
        sort_order: 6
      },
      {
        action: 'remove_student',
        label: 'Retirer un étudiant',
        description: 'Permet de retirer un étudiant inscrit à une session',
        sort_order: 7
      },
      {
        action: 'delete_payment',
        label: 'Supprimer un paiement',
        description: 'Permet de supprimer un paiement enregistré (opération sensible)',
        sort_order: 8
      }
    ],

    analytics: [
      {
        action: 'view_page',
        label: 'Voir la page analytics',
        description: 'Permet d\'accéder aux statistiques de formation',
        sort_order: 1
      },
      {
        action: 'export',
        label: 'Exporter les analytics',
        description: 'Permet d\'exporter les statistiques au format Excel',
        sort_order: 2
      }
    ],

    student_reports: [
      {
        action: 'view_page',
        label: 'Voir les rapports',
        description: 'Permet d\'accéder aux rapports de progression des étudiants',
        sort_order: 1
      },
      {
        action: 'export',
        label: 'Exporter les rapports',
        description: 'Permet d\'exporter les rapports étudiants',
        sort_order: 2
      }
    ],

    certificates: [
      {
        action: 'view_page',
        label: 'Voir la page des certificats',
        description: 'Permet d\'accéder à la liste des certificats générés',
        sort_order: 1
      },
      {
        action: 'view',
        label: 'Voir un certificat',
        description: 'Permet de visualiser un certificat spécifique',
        sort_order: 2
      },
      {
        action: 'generate',
        label: 'Générer un certificat',
        description: 'Permet de générer un certificat pour un étudiant',
        sort_order: 3
      },
      {
        action: 'update',
        label: 'Modifier un certificat',
        description: 'Permet de modifier les informations d\'un certificat',
        sort_order: 4
      },
      {
        action: 'download',
        label: 'Télécharger un certificat',
        description: 'Permet de télécharger le PDF du certificat',
        sort_order: 5
      },
      {
        action: 'delete',
        label: 'Supprimer un certificat',
        description: 'Permet de révoquer/supprimer un certificat',
        sort_order: 6
      }
    ],

    certificate_templates: [
      {
        action: 'view_page',
        label: 'Voir la page des templates',
        description: 'Permet d\'accéder à la liste des modèles de certificats',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer un template',
        description: 'Permet de créer un nouveau modèle de certificat',
        sort_order: 2
      },
      {
        action: 'create_folder',
        label: 'Créer un dossier',
        description: 'Permet de créer un dossier pour organiser les templates',
        sort_order: 3
      },
      {
        action: 'update',
        label: 'Modifier un template',
        description: 'Permet de modifier un modèle de certificat',
        sort_order: 4
      },
      {
        action: 'delete_template',
        label: 'Supprimer un template',
        description: 'Permet de supprimer un modèle de certificat',
        sort_order: 5
      },
      {
        action: 'delete_folder',
        label: 'Supprimer un dossier',
        description: 'Permet de supprimer un dossier de templates',
        sort_order: 6
      },
      {
        action: 'duplicate',
        label: 'Dupliquer un template',
        description: 'Permet de créer une copie d\'un modèle',
        sort_order: 7
      },
      {
        action: 'edit_canvas',
        label: 'Éditer le design',
        description: 'Permet d\'utiliser l\'éditeur visuel pour personnaliser le certificat',
        sort_order: 8
      },
      {
        action: 'organize',
        label: 'Organiser les templates',
        description: 'Permet de déplacer les templates entre dossiers',
        sort_order: 9
      }
    ],

    forums: [
      {
        action: 'view_page',
        label: 'Voir la page des forums',
        description: 'Permet d\'accéder à la modération des forums',
        sort_order: 1
      },
      {
        action: 'view',
        label: 'Voir les discussions',
        description: 'Permet de lire les discussions des forums',
        sort_order: 2
      },
      {
        action: 'create_thread',
        label: 'Créer une discussion',
        description: 'Permet de créer une nouvelle discussion',
        sort_order: 3
      },
      {
        action: 'reply',
        label: 'Répondre',
        description: 'Permet de répondre aux discussions',
        sort_order: 4
      },
      {
        action: 'delete',
        label: 'Supprimer',
        description: 'Permet de supprimer des messages ou discussions',
        sort_order: 5
      },
      {
        action: 'manage',
        label: 'Gérer les forums',
        description: 'Permet d\'épingler/verrouiller des discussions',
        sort_order: 6
      },
      {
        action: 'moderate',
        label: 'Modérer',
        description: 'Permet de modérer le contenu des forums',
        sort_order: 7
      }
    ],

    professors: [
      {
        action: 'view_page',
        label: 'Voir la page des professeurs',
        description: 'Permet d\'accéder à la liste des professeurs',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer un professeur',
        description: 'Permet de créer un nouveau compte professeur',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier un professeur',
        description: 'Permet de modifier les informations d\'un professeur',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer un professeur',
        description: 'Permet de supprimer un compte professeur',
        sort_order: 4
      },
      {
        action: 'assign_segments',
        label: 'Affecter des segments',
        description: 'Permet d\'assigner des segments à un professeur',
        sort_order: 5
      },
      {
        action: 'assign_cities',
        label: 'Affecter des villes',
        description: 'Permet d\'assigner des villes à un professeur',
        sort_order: 6
      }
    ]
  },

  // ============================================================
  // MODULE 3: RESSOURCES HUMAINES
  // ============================================================
  hr: {
    validation_workflows: [
      {
        action: 'view_page',
        label: 'Voir la page des boucles',
        description: 'Permet d\'accéder à la gestion des workflows de validation',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer une boucle',
        description: 'Permet de créer un nouveau workflow de validation',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier une boucle',
        description: 'Permet de modifier les étapes d\'un workflow',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer une boucle',
        description: 'Permet de supprimer un workflow de validation',
        sort_order: 4
      }
    ],

    schedules: [
      {
        action: 'view_page',
        label: 'Voir la page des horaires',
        description: 'Permet d\'accéder à la gestion des plannings',
        sort_order: 1
      },
      {
        action: 'manage_models',
        label: 'Gérer les modèles',
        description: 'Permet de créer/modifier des modèles d\'horaires',
        sort_order: 2
      },
      {
        action: 'manage_holidays',
        label: 'Gérer les jours fériés',
        description: 'Permet de définir les jours fériés',
        sort_order: 3
      },
      {
        action: 'view_validated_leaves',
        label: 'Voir les congés validés',
        description: 'Permet de consulter le calendrier des congés approuvés',
        sort_order: 4
      },
      {
        action: 'manage_overtime',
        label: 'Gérer les heures sup',
        description: 'Permet de gérer les demandes d\'heures supplémentaires',
        sort_order: 5
      }
    ],

    payroll: [
      {
        action: 'view_page',
        label: 'Voir la page de paie',
        description: 'Permet d\'accéder au module de gestion de la paie',
        sort_order: 1
      },
      {
        action: 'manage_periods',
        label: 'Gérer les périodes',
        description: 'Permet de créer/clôturer des périodes de paie',
        sort_order: 2
      },
      {
        action: 'calculate',
        label: 'Calculer la paie',
        description: 'Permet de lancer le calcul des salaires',
        sort_order: 3
      },
      {
        action: 'view_payslips',
        label: 'Voir les fiches de paie',
        description: 'Permet de consulter les bulletins de salaire',
        sort_order: 4
      },
      {
        action: 'generate_payslips',
        label: 'Générer les fiches',
        description: 'Permet de générer les bulletins de salaire PDF',
        sort_order: 5
      },
      {
        action: 'manage_config',
        label: 'Configurer la paie',
        description: 'Permet de configurer les règles de calcul de paie',
        sort_order: 6
      }
    ],

    employee_portal: [
      {
        action: 'view_page',
        label: 'Voir la page de pointage',
        description: 'Permet d\'accéder à la gestion des pointages',
        sort_order: 1
      },
      {
        action: 'clock_in_out',
        label: 'Pointer',
        description: 'Permet d\'enregistrer les entrées/sorties',
        sort_order: 2
      },
      {
        action: 'submit_requests',
        label: 'Soumettre des demandes',
        description: 'Permet de faire des demandes de congés/absences',
        sort_order: 3
      },
      {
        action: 'view_history',
        label: 'Voir l\'historique',
        description: 'Permet de consulter l\'historique des pointages',
        sort_order: 4
      }
    ],

    attendance: [
      {
        action: 'view_page',
        label: 'Voir la page de présence',
        description: 'Permet d\'accéder à la gestion des présences',
        sort_order: 1
      },
      {
        action: 'view_all',
        label: 'Voir toutes les présences',
        description: 'Permet de voir les pointages de tous les employés',
        sort_order: 2
      },
      {
        action: 'edit',
        label: 'Modifier les présences',
        description: 'Permet de corriger les enregistrements de présence',
        sort_order: 3
      },
      {
        action: 'edit_anomalies',
        label: 'Traiter les anomalies',
        description: 'Permet de résoudre les anomalies de pointage',
        sort_order: 4
      },
      {
        action: 'validate',
        label: 'Valider les présences',
        description: 'Permet de valider les pointages du mois',
        sort_order: 5
      },
      {
        action: 'export',
        label: 'Exporter les présences',
        description: 'Permet d\'exporter les données de présence',
        sort_order: 6
      },
      {
        action: 'approve_overtime',
        label: 'Approuver heures supplémentaires',
        description: 'Permet d\'approuver les demandes d\'heures supplémentaires',
        sort_order: 7
      },
      {
        action: 'reject_overtime',
        label: 'Rejeter heures supplémentaires',
        description: 'Permet de rejeter les demandes d\'heures supplémentaires',
        sort_order: 8
      }
    ],

    employees: [
      {
        action: 'view_page',
        label: 'Voir la page des employés',
        description: 'Permet d\'accéder aux dossiers des employés',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer un employé',
        description: 'Permet de créer un nouveau dossier employé',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier un employé',
        description: 'Permet de modifier les informations d\'un employé',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer un employé',
        description: 'Permet de supprimer un dossier employé',
        sort_order: 4
      },
      {
        action: 'view_salary',
        label: 'Voir le salaire',
        description: 'Permet de consulter les informations salariales',
        sort_order: 5
      },
      {
        action: 'manage_contracts',
        label: 'Gérer les contrats',
        description: 'Permet de gérer les contrats de travail',
        sort_order: 6
      },
      {
        action: 'manage_documents',
        label: 'Gérer les documents',
        description: 'Permet de gérer les documents de l\'employé',
        sort_order: 7
      },
      {
        action: 'manage_discipline',
        label: 'Gérer la discipline',
        description: 'Permet de gérer les dossiers disciplinaires',
        sort_order: 8
      }
    ],

    holidays: [
      {
        action: 'view_page',
        label: 'Voir les jours fériés',
        description: 'Permet de consulter la liste des jours fériés',
        sort_order: 1
      },
      {
        action: 'manage',
        label: 'Gérer les jours fériés',
        description: 'Permet de créer, modifier et supprimer des jours fériés',
        sort_order: 2
      }
    ],

    requests_validation: [
      {
        action: 'view_page',
        label: 'Voir la page de validation',
        description: 'Permet d\'accéder aux demandes à valider',
        sort_order: 1
      },
      {
        action: 'approve',
        label: 'Approuver une demande',
        description: 'Permet d\'approuver les demandes de congés/absences',
        sort_order: 2
      },
      {
        action: 'reject',
        label: 'Rejeter une demande',
        description: 'Permet de rejeter une demande avec motif',
        sort_order: 3
      }
    ],

    leaves: [
      {
        action: 'view_page',
        label: 'Voir les congés',
        description: 'Permet de consulter les demandes de congés',
        sort_order: 1
      },
      {
        action: 'request',
        label: 'Demander un congé',
        description: 'Permet de soumettre une demande de congé',
        sort_order: 2
      },
      {
        action: 'approve_n1',
        label: 'Approuver (N+1)',
        description: 'Permet au manager direct d\'approuver',
        sort_order: 3
      },
      {
        action: 'approve_n2',
        label: 'Approuver (N+2)',
        description: 'Permet au manager supérieur d\'approuver',
        sort_order: 4
      },
      {
        action: 'approve_hr',
        label: 'Approuver (RH)',
        description: 'Permet aux RH de valider définitivement',
        sort_order: 5
      },
      {
        action: 'manage_balances',
        label: 'Gérer les soldes',
        description: 'Permet de modifier les soldes de congés',
        sort_order: 6
      },
      {
        action: 'export',
        label: 'Exporter les congés',
        description: 'Permet d\'exporter les données de congés',
        sort_order: 7
      }
    ]
  },

  // ============================================================
  // MODULE 4: COMMERCIALISATION
  // ============================================================
  commercialisation: {
    dashboard: [
      {
        action: 'view_page',
        label: 'Voir le tableau de bord',
        description: 'Permet d\'accéder aux statistiques commerciales',
        sort_order: 1
      },
      {
        action: 'view_stats',
        label: 'Voir les statistiques',
        description: 'Permet de consulter les KPIs commerciaux',
        sort_order: 2
      },
      {
        action: 'export',
        label: 'Exporter le dashboard',
        description: 'Permet d\'exporter les statistiques',
        sort_order: 3
      }
    ],

    clients: [
      {
        action: 'view_page',
        label: 'Voir la page des clients',
        description: 'Permet d\'accéder à la liste des clients',
        sort_order: 1
      },
      {
        action: 'view',
        label: 'Voir un client',
        description: 'Permet de consulter la fiche d\'un client',
        sort_order: 2
      },
      {
        action: 'create',
        label: 'Créer un client',
        description: 'Permet de créer une nouvelle fiche client',
        sort_order: 3
      },
      {
        action: 'edit',
        label: 'Modifier un client',
        description: 'Permet de modifier les informations d\'un client',
        sort_order: 4
      },
      {
        action: 'delete',
        label: 'Supprimer un client',
        description: 'Permet de supprimer un client',
        sort_order: 5
      },
      {
        action: 'export',
        label: 'Exporter les clients',
        description: 'Permet d\'exporter la liste des clients',
        sort_order: 6
      }
    ],

    prospects: [
      {
        action: 'view_page',
        label: 'Voir la page des prospects',
        description: 'Permet d\'accéder à la liste des prospects',
        sort_order: 1
      },
      {
        action: 'view',
        label: 'Voir un prospect',
        description: 'Permet de consulter la fiche d\'un prospect',
        sort_order: 2
      },
      {
        action: 'view_all',
        label: 'Voir tous les prospects',
        description: 'Permet de voir les prospects de tous les commerciaux',
        sort_order: 3
      },
      {
        action: 'create',
        label: 'Créer un prospect',
        description: 'Permet d\'ajouter un nouveau prospect',
        sort_order: 4
      },
      {
        action: 'edit',
        label: 'Modifier un prospect',
        description: 'Permet de modifier les informations d\'un prospect',
        sort_order: 5
      },
      {
        action: 'call',
        label: 'Appeler un prospect',
        description: 'Permet d\'enregistrer un appel téléphonique',
        sort_order: 6
      },
      {
        action: 'delete',
        label: 'Supprimer un prospect',
        description: 'Permet de supprimer un prospect',
        sort_order: 7
      },
      {
        action: 'convert',
        label: 'Convertir en client',
        description: 'Permet de transformer un prospect en client',
        sort_order: 8
      },
      {
        action: 'import',
        label: 'Importer des prospects',
        description: 'Permet d\'importer des prospects depuis un fichier',
        sort_order: 9
      },
      {
        action: 'export',
        label: 'Exporter les prospects',
        description: 'Permet d\'exporter la liste des prospects',
        sort_order: 10
      },
      {
        action: 'assign',
        label: 'Assigner un prospect',
        description: 'Permet d\'attribuer un prospect à un commercial',
        sort_order: 11
      },
      {
        action: 'reinject',
        label: 'Réinjecter un prospect',
        description: 'Permet de remettre un prospect dans le pool',
        sort_order: 12
      },
      {
        action: 'clean',
        label: 'Nettoyer les prospects',
        description: 'Permet de supprimer les prospects obsolètes/doublons',
        sort_order: 13
      }
    ],

    devis: [
      {
        action: 'view_page',
        label: 'Voir la page des devis',
        description: 'Permet d\'accéder à la liste des devis',
        sort_order: 1
      },
      {
        action: 'view',
        label: 'Voir un devis',
        description: 'Permet de consulter un devis',
        sort_order: 2
      },
      {
        action: 'create',
        label: 'Créer un devis',
        description: 'Permet de créer un nouveau devis',
        sort_order: 3
      },
      {
        action: 'edit',
        label: 'Modifier un devis',
        description: 'Permet de modifier un devis existant',
        sort_order: 4
      },
      {
        action: 'delete',
        label: 'Supprimer un devis',
        description: 'Permet de supprimer un devis',
        sort_order: 5
      },
      {
        action: 'validate',
        label: 'Valider un devis',
        description: 'Permet de valider un devis pour envoi',
        sort_order: 6
      },
      {
        action: 'send',
        label: 'Envoyer un devis',
        description: 'Permet d\'envoyer le devis au client',
        sort_order: 7
      },
      {
        action: 'export',
        label: 'Exporter les devis',
        description: 'Permet d\'exporter la liste des devis',
        sort_order: 8
      }
    ],

    contrats: [
      {
        action: 'view_page',
        label: 'Voir la page des contrats',
        description: 'Permet d\'accéder à la liste des contrats',
        sort_order: 1
      },
      {
        action: 'view',
        label: 'Voir un contrat',
        description: 'Permet de consulter un contrat',
        sort_order: 2
      },
      {
        action: 'create',
        label: 'Créer un contrat',
        description: 'Permet de créer un nouveau contrat',
        sort_order: 3
      },
      {
        action: 'edit',
        label: 'Modifier un contrat',
        description: 'Permet de modifier un contrat',
        sort_order: 4
      },
      {
        action: 'delete',
        label: 'Supprimer un contrat',
        description: 'Permet de supprimer un contrat',
        sort_order: 5
      },
      {
        action: 'sign',
        label: 'Signer un contrat',
        description: 'Permet de marquer un contrat comme signé',
        sort_order: 6
      },
      {
        action: 'archive',
        label: 'Archiver un contrat',
        description: 'Permet d\'archiver un contrat terminé',
        sort_order: 7
      },
      {
        action: 'export',
        label: 'Exporter les contrats',
        description: 'Permet d\'exporter la liste des contrats',
        sort_order: 8
      }
    ]
  },

  // ============================================================
  // MODULE 5: SYSTÈME
  // ============================================================
  system: {
    roles: [
      {
        action: 'view_page',
        label: 'Voir la page des rôles',
        description: 'Permet d\'accéder à la gestion des rôles et permissions',
        sort_order: 1
      },
      {
        action: 'create',
        label: 'Créer un rôle',
        description: 'Permet de créer un nouveau rôle avec des permissions personnalisées',
        sort_order: 2
      },
      {
        action: 'update',
        label: 'Modifier un rôle',
        description: 'Permet de modifier les permissions d\'un rôle existant',
        sort_order: 3
      },
      {
        action: 'delete',
        label: 'Supprimer un rôle',
        description: 'Permet de supprimer un rôle (si aucun utilisateur n\'y est assigné)',
        sort_order: 4
      }
    ]
  }
};

/**
 * Comptage total des permissions
 */
export function getTotalPermissionsCount() {
  let total = 0;
  for (const module of Object.values(PERMISSIONS_MASTER)) {
    for (const actions of Object.values(module)) {
      total += actions.length;
    }
  }
  return total;
}

/**
 * Générer la liste complète des codes de permissions
 */
export function getAllPermissionCodes() {
  const codes = [];
  for (const [moduleName, module] of Object.entries(PERMISSIONS_MASTER)) {
    for (const [menuName, actions] of Object.entries(module)) {
      for (const action of actions) {
        codes.push(`${moduleName}.${menuName}.${action.action}`);
      }
    }
  }
  return codes;
}

console.log(`✅ PERMISSIONS_MASTER loaded: ${getTotalPermissionsCount()} permissions defined`);
