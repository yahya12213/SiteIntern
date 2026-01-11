import express from 'express';
import pg from 'pg';
const { Pool } = pg;

const router = express.Router();

// Migration 109: Refactorisation des permissions en francais
// Aligne les codes de permissions avec les noms des menus en francais
// Structure hierarchique: section.sous_menu.onglet?.action

router.post('/run', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('=== Migration 109: Refactorisation des permissions en francais ===');

    // Step 1: Sauvegarder les associations role_permissions actuelles avec mapping
    console.log('Step 1: Sauvegarde des associations role_permissions...');
    await client.query(`
      CREATE TEMP TABLE IF NOT EXISTS temp_role_permissions_backup AS
      SELECT rp.role_id, p.id as permission_code
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
    `);

    // Step 2: Creation du mapping ancien -> nouveau
    console.log('Step 2: Creation du mapping des permissions...');
    await client.query(`
      CREATE TEMP TABLE IF NOT EXISTS permission_mapping (
        old_code TEXT PRIMARY KEY,
        new_code TEXT NOT NULL
      )
    `);

    // Mapping des anciennes permissions vers les nouvelles
    await client.query(`
      INSERT INTO permission_mapping (old_code, new_code) VALUES
      -- Gestion Comptable
      ('accounting.dashboard.view_page', 'gestion_comptable.tableau_de_bord.voir'),
      ('accounting.segments.view_page', 'gestion_comptable.segments.voir'),
      ('accounting.segments.create', 'gestion_comptable.segments.creer'),
      ('accounting.segments.update', 'gestion_comptable.segments.modifier'),
      ('accounting.segments.delete', 'gestion_comptable.segments.supprimer'),
      ('accounting.cities.view_page', 'gestion_comptable.villes.voir'),
      ('accounting.cities.create', 'gestion_comptable.villes.creer'),
      ('accounting.cities.update', 'gestion_comptable.villes.modifier'),
      ('accounting.cities.delete', 'gestion_comptable.villes.supprimer'),
      ('system.users.view_page', 'gestion_comptable.utilisateurs.voir'),
      ('system.users.create', 'gestion_comptable.utilisateurs.creer'),
      ('system.users.update', 'gestion_comptable.utilisateurs.modifier'),
      ('system.users.delete', 'gestion_comptable.utilisateurs.supprimer'),
      ('system.roles.view_page', 'gestion_comptable.roles_permissions.voir'),
      ('system.roles.create', 'gestion_comptable.roles_permissions.creer'),
      ('system.roles.update', 'gestion_comptable.roles_permissions.modifier'),
      ('system.roles.delete', 'gestion_comptable.roles_permissions.supprimer'),
      ('accounting.sheets.view_page', 'gestion_comptable.fiches_calcul.voir'),
      ('accounting.sheets.create', 'gestion_comptable.fiches_calcul.creer'),
      ('accounting.sheets.update', 'gestion_comptable.fiches_calcul.modifier'),
      ('accounting.sheets.delete', 'gestion_comptable.fiches_calcul.supprimer'),
      ('accounting.declarations.view_page', 'gestion_comptable.declarations.voir'),
      ('accounting.declarations.create', 'gestion_comptable.declarations.creer'),
      ('accounting.declarations.update', 'gestion_comptable.declarations.modifier_metadata'),
      ('accounting.declarations.delete', 'gestion_comptable.declarations.supprimer'),
      ('accounting.declarations.approve', 'gestion_comptable.declarations.approuver'),
      ('accounting.projects.view_page', 'gestion_comptable.gestion_projet.voir'),
      ('accounting.projects.create', 'gestion_comptable.gestion_projet.creer'),
      ('accounting.projects.update', 'gestion_comptable.gestion_projet.modifier'),
      ('accounting.projects.delete', 'gestion_comptable.gestion_projet.supprimer'),
      -- Formation
      ('training.formations.view_page', 'formation.gestion_formations.voir'),
      ('training.formations.create', 'formation.gestion_formations.creer'),
      ('training.formations.update', 'formation.gestion_formations.modifier'),
      ('training.formations.delete', 'formation.gestion_formations.supprimer'),
      ('training.sessions.view_page', 'formation.sessions_formation.voir'),
      ('training.sessions.create', 'formation.sessions_formation.creer'),
      ('training.sessions.update', 'formation.sessions_formation.modifier'),
      ('training.sessions.delete', 'formation.sessions_formation.supprimer'),
      ('training.analytics.view_page', 'formation.analytics.voir'),
      ('training.reports.view_page', 'formation.rapports_etudiants.voir'),
      ('training.students.view_page', 'formation.liste_etudiants.voir'),
      ('training.students.create', 'formation.liste_etudiants.creer'),
      ('training.students.update', 'formation.liste_etudiants.modifier'),
      ('training.students.delete', 'formation.liste_etudiants.supprimer'),
      ('training.certificates.view_page', 'formation.templates_certificats.voir'),
      ('training.forums.view_page', 'formation.forums.voir'),
      -- Ressources Humaines
      ('hr.workflows.view_page', 'ressources_humaines.boucles_validation.voir'),
      ('hr.workflows.create', 'ressources_humaines.boucles_validation.creer'),
      ('hr.workflows.update', 'ressources_humaines.boucles_validation.modifier'),
      ('hr.workflows.delete', 'ressources_humaines.boucles_validation.supprimer'),
      ('hr.schedules.view_page', 'ressources_humaines.gestion_horaires.voir'),
      ('hr.payroll.view_page', 'ressources_humaines.gestion_paie.voir'),
      ('hr.clocking.view_page', 'ressources_humaines.gestion_pointage.voir'),
      ('hr.employees.view_page', 'ressources_humaines.dossier_employe.voir'),
      ('hr.employees.create', 'ressources_humaines.dossier_employe.creer'),
      ('hr.employees.update', 'ressources_humaines.dossier_employe.modifier'),
      ('hr.employees.delete', 'ressources_humaines.dossier_employe.supprimer'),
      ('hr.requests.view_page', 'ressources_humaines.validation_demandes.voir'),
      ('hr.requests.approve', 'ressources_humaines.validation_demandes.approuver'),
      ('hr.delegation.view_page', 'ressources_humaines.delegations.voir'),
      ('hr.delegation.create', 'ressources_humaines.delegations.creer'),
      -- Mon Equipe
      ('manager.attendance.view_page', 'mon_equipe.pointages_equipe.voir'),
      ('manager.requests.view_page', 'mon_equipe.demandes_equipe.voir'),
      ('manager.requests.approve', 'mon_equipe.demandes_equipe.approuver'),
      -- Mon Espace RH
      ('employee.clocking.view_page', 'mon_espace_rh.mon_pointage.voir'),
      ('employee.requests.view_page', 'mon_espace_rh.mes_demandes.voir'),
      ('employee.requests.create', 'mon_espace_rh.mes_demandes.creer'),
      ('employee.payslips.view_page', 'mon_espace_rh.mes_bulletins.voir'),
      -- Commercialisation
      ('commercialisation.dashboard.view_page', 'commercialisation.tableau_de_bord.voir'),
      ('commercialisation.prospects.view_page', 'commercialisation.prospects.voir'),
      ('commercialisation.prospects.create', 'commercialisation.prospects.creer'),
      ('commercialisation.prospects.update', 'commercialisation.prospects.modifier'),
      ('commercialisation.prospects.delete', 'commercialisation.prospects.supprimer'),
      ('commercialisation.cleaning.view_page', 'commercialisation.nettoyage_prospects.voir'),
      ('commercialisation.gcontact.view_page', 'commercialisation.gestion_gcontacte.voir')
      ON CONFLICT (old_code) DO NOTHING
    `);

    // Step 3: Inserer toutes les nouvelles permissions
    console.log('Step 3: Insertion des nouvelles permissions en francais...');

    const newPermissions = [
      // ==================== GESTION COMPTABLE ====================
      { id: 'gestion_comptable.acces', name: 'Acces Gestion Comptable', description: 'Acces a la section Gestion Comptable', category: 'gestion_comptable', parent_id: null },
      // Tableau de bord
      { id: 'gestion_comptable.tableau_de_bord.voir', name: 'Voir Tableau de bord', description: 'Acces au tableau de bord comptable', category: 'gestion_comptable', parent_id: 'gestion_comptable.acces' },
      // Segments
      { id: 'gestion_comptable.segments.voir', name: 'Voir Segments', description: 'Voir la liste des segments', category: 'gestion_comptable', parent_id: 'gestion_comptable.acces' },
      { id: 'gestion_comptable.segments.creer', name: 'Creer Segment', description: 'Creer un nouveau segment', category: 'gestion_comptable', parent_id: 'gestion_comptable.segments.voir' },
      { id: 'gestion_comptable.segments.modifier', name: 'Modifier Segment', description: 'Modifier un segment existant', category: 'gestion_comptable', parent_id: 'gestion_comptable.segments.voir' },
      { id: 'gestion_comptable.segments.supprimer', name: 'Supprimer Segment', description: 'Supprimer un segment', category: 'gestion_comptable', parent_id: 'gestion_comptable.segments.voir' },
      { id: 'gestion_comptable.segments.importer_villes', name: 'Importer Villes', description: 'Importer des villes dans un segment', category: 'gestion_comptable', parent_id: 'gestion_comptable.segments.voir' },
      // Villes
      { id: 'gestion_comptable.villes.voir', name: 'Voir Villes', description: 'Voir la liste des villes', category: 'gestion_comptable', parent_id: 'gestion_comptable.acces' },
      { id: 'gestion_comptable.villes.creer', name: 'Creer Ville', description: 'Creer une nouvelle ville', category: 'gestion_comptable', parent_id: 'gestion_comptable.villes.voir' },
      { id: 'gestion_comptable.villes.modifier', name: 'Modifier Ville', description: 'Modifier une ville existante', category: 'gestion_comptable', parent_id: 'gestion_comptable.villes.voir' },
      { id: 'gestion_comptable.villes.supprimer', name: 'Supprimer Ville', description: 'Supprimer une ville', category: 'gestion_comptable', parent_id: 'gestion_comptable.villes.voir' },
      { id: 'gestion_comptable.villes.supprimer_masse', name: 'Supprimer Villes en masse', description: 'Supprimer plusieurs villes', category: 'gestion_comptable', parent_id: 'gestion_comptable.villes.voir' },
      // Utilisateurs
      { id: 'gestion_comptable.utilisateurs.voir', name: 'Voir Utilisateurs', description: 'Voir la liste des utilisateurs', category: 'gestion_comptable', parent_id: 'gestion_comptable.acces' },
      { id: 'gestion_comptable.utilisateurs.creer', name: 'Creer Utilisateur', description: 'Creer un nouvel utilisateur', category: 'gestion_comptable', parent_id: 'gestion_comptable.utilisateurs.voir' },
      { id: 'gestion_comptable.utilisateurs.modifier', name: 'Modifier Utilisateur', description: 'Modifier un utilisateur', category: 'gestion_comptable', parent_id: 'gestion_comptable.utilisateurs.voir' },
      { id: 'gestion_comptable.utilisateurs.supprimer', name: 'Supprimer Utilisateur', description: 'Supprimer un utilisateur', category: 'gestion_comptable', parent_id: 'gestion_comptable.utilisateurs.voir' },
      { id: 'gestion_comptable.utilisateurs.assigner_segments', name: 'Assigner Segments', description: 'Assigner des segments aux utilisateurs', category: 'gestion_comptable', parent_id: 'gestion_comptable.utilisateurs.voir' },
      { id: 'gestion_comptable.utilisateurs.assigner_villes', name: 'Assigner Villes', description: 'Assigner des villes aux utilisateurs', category: 'gestion_comptable', parent_id: 'gestion_comptable.utilisateurs.voir' },
      { id: 'gestion_comptable.utilisateurs.assigner_roles', name: 'Assigner Roles', description: 'Assigner des roles aux utilisateurs', category: 'gestion_comptable', parent_id: 'gestion_comptable.utilisateurs.voir' },
      // Roles & Permissions
      { id: 'gestion_comptable.roles_permissions.voir', name: 'Voir Roles & Permissions', description: 'Voir les roles et permissions', category: 'gestion_comptable', parent_id: 'gestion_comptable.acces' },
      { id: 'gestion_comptable.roles_permissions.creer', name: 'Creer Role', description: 'Creer un nouveau role', category: 'gestion_comptable', parent_id: 'gestion_comptable.roles_permissions.voir' },
      { id: 'gestion_comptable.roles_permissions.modifier', name: 'Modifier Role', description: 'Modifier un role', category: 'gestion_comptable', parent_id: 'gestion_comptable.roles_permissions.voir' },
      { id: 'gestion_comptable.roles_permissions.supprimer', name: 'Supprimer Role', description: 'Supprimer un role', category: 'gestion_comptable', parent_id: 'gestion_comptable.roles_permissions.voir' },
      // Fiches de calcul
      { id: 'gestion_comptable.fiches_calcul.voir', name: 'Voir Fiches de calcul', description: 'Voir les fiches de calcul', category: 'gestion_comptable', parent_id: 'gestion_comptable.acces' },
      { id: 'gestion_comptable.fiches_calcul.creer', name: 'Creer Fiche', description: 'Creer une fiche de calcul', category: 'gestion_comptable', parent_id: 'gestion_comptable.fiches_calcul.voir' },
      { id: 'gestion_comptable.fiches_calcul.modifier', name: 'Modifier Fiche', description: 'Modifier une fiche de calcul', category: 'gestion_comptable', parent_id: 'gestion_comptable.fiches_calcul.voir' },
      { id: 'gestion_comptable.fiches_calcul.supprimer', name: 'Supprimer Fiche', description: 'Supprimer une fiche de calcul', category: 'gestion_comptable', parent_id: 'gestion_comptable.fiches_calcul.voir' },
      { id: 'gestion_comptable.fiches_calcul.publier', name: 'Publier Fiche', description: 'Publier une fiche de calcul', category: 'gestion_comptable', parent_id: 'gestion_comptable.fiches_calcul.voir' },
      { id: 'gestion_comptable.fiches_calcul.dupliquer', name: 'Dupliquer Fiche', description: 'Dupliquer une fiche de calcul', category: 'gestion_comptable', parent_id: 'gestion_comptable.fiches_calcul.voir' },
      { id: 'gestion_comptable.fiches_calcul.exporter', name: 'Exporter Fiche', description: 'Exporter une fiche de calcul', category: 'gestion_comptable', parent_id: 'gestion_comptable.fiches_calcul.voir' },
      { id: 'gestion_comptable.fiches_calcul.parametres', name: 'Parametres Fiche', description: 'Gerer les parametres des fiches', category: 'gestion_comptable', parent_id: 'gestion_comptable.fiches_calcul.voir' },
      // Declarations
      { id: 'gestion_comptable.declarations.voir', name: 'Voir Declarations', description: 'Voir les declarations', category: 'gestion_comptable', parent_id: 'gestion_comptable.acces' },
      { id: 'gestion_comptable.declarations.voir_toutes', name: 'Voir Toutes Declarations', description: 'Voir toutes les declarations', category: 'gestion_comptable', parent_id: 'gestion_comptable.declarations.voir' },
      { id: 'gestion_comptable.declarations.creer', name: 'Creer Declaration', description: 'Creer une declaration', category: 'gestion_comptable', parent_id: 'gestion_comptable.declarations.voir' },
      { id: 'gestion_comptable.declarations.remplir', name: 'Remplir Declaration', description: 'Remplir une declaration', category: 'gestion_comptable', parent_id: 'gestion_comptable.declarations.voir' },
      { id: 'gestion_comptable.declarations.modifier_metadata', name: 'Modifier Metadata', description: 'Modifier les metadonnees', category: 'gestion_comptable', parent_id: 'gestion_comptable.declarations.voir' },
      { id: 'gestion_comptable.declarations.supprimer', name: 'Supprimer Declaration', description: 'Supprimer une declaration', category: 'gestion_comptable', parent_id: 'gestion_comptable.declarations.voir' },
      { id: 'gestion_comptable.declarations.approuver', name: 'Approuver Declaration', description: 'Approuver une declaration', category: 'gestion_comptable', parent_id: 'gestion_comptable.declarations.voir' },
      { id: 'gestion_comptable.declarations.rejeter', name: 'Rejeter Declaration', description: 'Rejeter une declaration', category: 'gestion_comptable', parent_id: 'gestion_comptable.declarations.voir' },
      { id: 'gestion_comptable.declarations.soumettre', name: 'Soumettre Declaration', description: 'Soumettre une declaration', category: 'gestion_comptable', parent_id: 'gestion_comptable.declarations.voir' },
      // Gestion de Projet
      { id: 'gestion_comptable.gestion_projet.voir', name: 'Voir Projets', description: 'Voir les projets', category: 'gestion_comptable', parent_id: 'gestion_comptable.acces' },
      { id: 'gestion_comptable.gestion_projet.creer', name: 'Creer Projet', description: 'Creer un projet', category: 'gestion_comptable', parent_id: 'gestion_comptable.gestion_projet.voir' },
      { id: 'gestion_comptable.gestion_projet.modifier', name: 'Modifier Projet', description: 'Modifier un projet', category: 'gestion_comptable', parent_id: 'gestion_comptable.gestion_projet.voir' },
      { id: 'gestion_comptable.gestion_projet.supprimer', name: 'Supprimer Projet', description: 'Supprimer un projet', category: 'gestion_comptable', parent_id: 'gestion_comptable.gestion_projet.voir' },
      { id: 'gestion_comptable.gestion_projet.exporter', name: 'Exporter Projets', description: 'Exporter les projets', category: 'gestion_comptable', parent_id: 'gestion_comptable.gestion_projet.voir' },

      // ==================== FORMATION ====================
      { id: 'formation.acces', name: 'Acces Formation', description: 'Acces a la section Formation', category: 'formation', parent_id: null },
      // Gestion des Formations
      { id: 'formation.gestion_formations.voir', name: 'Voir Formations', description: 'Voir les formations', category: 'formation', parent_id: 'formation.acces' },
      { id: 'formation.gestion_formations.creer', name: 'Creer Formation', description: 'Creer une formation', category: 'formation', parent_id: 'formation.gestion_formations.voir' },
      { id: 'formation.gestion_formations.modifier', name: 'Modifier Formation', description: 'Modifier une formation', category: 'formation', parent_id: 'formation.gestion_formations.voir' },
      { id: 'formation.gestion_formations.supprimer', name: 'Supprimer Formation', description: 'Supprimer une formation', category: 'formation', parent_id: 'formation.gestion_formations.voir' },
      { id: 'formation.gestion_formations.dupliquer', name: 'Dupliquer Formation', description: 'Dupliquer une formation', category: 'formation', parent_id: 'formation.gestion_formations.voir' },
      { id: 'formation.gestion_formations.creer_pack', name: 'Creer Pack', description: 'Creer un pack de formations', category: 'formation', parent_id: 'formation.gestion_formations.voir' },
      { id: 'formation.gestion_formations.editer_contenu', name: 'Editer Contenu', description: 'Editer le contenu des formations', category: 'formation', parent_id: 'formation.gestion_formations.voir' },
      // Sessions de Formation
      { id: 'formation.sessions_formation.voir', name: 'Voir Sessions', description: 'Voir les sessions de formation', category: 'formation', parent_id: 'formation.acces' },
      { id: 'formation.sessions_formation.creer', name: 'Creer Session', description: 'Creer une session', category: 'formation', parent_id: 'formation.sessions_formation.voir' },
      { id: 'formation.sessions_formation.modifier', name: 'Modifier Session', description: 'Modifier une session', category: 'formation', parent_id: 'formation.sessions_formation.voir' },
      { id: 'formation.sessions_formation.supprimer', name: 'Supprimer Session', description: 'Supprimer une session', category: 'formation', parent_id: 'formation.sessions_formation.voir' },
      { id: 'formation.sessions_formation.ajouter_etudiant', name: 'Ajouter Etudiant', description: 'Ajouter un etudiant a la session', category: 'formation', parent_id: 'formation.sessions_formation.voir' },
      { id: 'formation.sessions_formation.modifier_etudiant', name: 'Modifier Etudiant Session', description: 'Modifier un etudiant dans la session', category: 'formation', parent_id: 'formation.sessions_formation.voir' },
      // Analytics
      { id: 'formation.analytics.voir', name: 'Voir Analytics', description: 'Voir les analytics', category: 'formation', parent_id: 'formation.acces' },
      { id: 'formation.analytics.exporter', name: 'Exporter Analytics', description: 'Exporter les analytics', category: 'formation', parent_id: 'formation.analytics.voir' },
      { id: 'formation.analytics.changer_periode', name: 'Changer Periode', description: 'Changer la periode des analytics', category: 'formation', parent_id: 'formation.analytics.voir' },
      // Rapports Etudiants
      { id: 'formation.rapports_etudiants.voir', name: 'Voir Rapports', description: 'Voir les rapports etudiants', category: 'formation', parent_id: 'formation.acces' },
      { id: 'formation.rapports_etudiants.rechercher', name: 'Rechercher Rapports', description: 'Rechercher dans les rapports', category: 'formation', parent_id: 'formation.rapports_etudiants.voir' },
      { id: 'formation.rapports_etudiants.exporter_csv', name: 'Exporter CSV', description: 'Exporter les rapports en CSV', category: 'formation', parent_id: 'formation.rapports_etudiants.voir' },
      { id: 'formation.rapports_etudiants.exporter_pdf', name: 'Exporter PDF', description: 'Exporter les rapports en PDF', category: 'formation', parent_id: 'formation.rapports_etudiants.voir' },
      // Liste des Etudiants
      { id: 'formation.liste_etudiants.voir', name: 'Voir Etudiants', description: 'Voir la liste des etudiants', category: 'formation', parent_id: 'formation.acces' },
      { id: 'formation.liste_etudiants.creer', name: 'Creer Etudiant', description: 'Creer un etudiant', category: 'formation', parent_id: 'formation.liste_etudiants.voir' },
      { id: 'formation.liste_etudiants.modifier', name: 'Modifier Etudiant', description: 'Modifier un etudiant', category: 'formation', parent_id: 'formation.liste_etudiants.voir' },
      { id: 'formation.liste_etudiants.supprimer', name: 'Supprimer Etudiant', description: 'Supprimer un etudiant', category: 'formation', parent_id: 'formation.liste_etudiants.voir' },
      // Templates de Certificats
      { id: 'formation.templates_certificats.voir', name: 'Voir Templates', description: 'Voir les templates de certificats', category: 'formation', parent_id: 'formation.acces' },
      { id: 'formation.templates_certificats.creer_dossier', name: 'Creer Dossier', description: 'Creer un dossier de templates', category: 'formation', parent_id: 'formation.templates_certificats.voir' },
      { id: 'formation.templates_certificats.creer_template', name: 'Creer Template', description: 'Creer un template', category: 'formation', parent_id: 'formation.templates_certificats.voir' },
      { id: 'formation.templates_certificats.renommer', name: 'Renommer Template', description: 'Renommer un template', category: 'formation', parent_id: 'formation.templates_certificats.voir' },
      { id: 'formation.templates_certificats.supprimer', name: 'Supprimer Template', description: 'Supprimer un template', category: 'formation', parent_id: 'formation.templates_certificats.voir' },
      { id: 'formation.templates_certificats.dupliquer', name: 'Dupliquer Template', description: 'Dupliquer un template', category: 'formation', parent_id: 'formation.templates_certificats.voir' },
      { id: 'formation.templates_certificats.editer_canvas', name: 'Editer Canvas', description: 'Editer le canvas du template', category: 'formation', parent_id: 'formation.templates_certificats.voir' },
      // Forums
      { id: 'formation.forums.voir', name: 'Voir Forums', description: 'Voir les forums', category: 'formation', parent_id: 'formation.acces' },
      { id: 'formation.forums.creer_discussion', name: 'Creer Discussion', description: 'Creer une discussion', category: 'formation', parent_id: 'formation.forums.voir' },
      { id: 'formation.forums.repondre', name: 'Repondre', description: 'Repondre aux discussions', category: 'formation', parent_id: 'formation.forums.voir' },
      { id: 'formation.forums.reagir', name: 'Reagir', description: 'Reagir aux messages', category: 'formation', parent_id: 'formation.forums.voir' },
      { id: 'formation.forums.supprimer', name: 'Supprimer Forum', description: 'Supprimer des messages', category: 'formation', parent_id: 'formation.forums.voir' },
      { id: 'formation.forums.epingler', name: 'Epingler', description: 'Epingler des discussions', category: 'formation', parent_id: 'formation.forums.voir' },
      { id: 'formation.forums.verrouiller', name: 'Verrouiller', description: 'Verrouiller des discussions', category: 'formation', parent_id: 'formation.forums.voir' },
      { id: 'formation.forums.moderer', name: 'Moderer', description: 'Moderer les forums', category: 'formation', parent_id: 'formation.forums.voir' },

      // ==================== RESSOURCES HUMAINES ====================
      { id: 'ressources_humaines.acces', name: 'Acces RH', description: 'Acces a la section Ressources Humaines', category: 'ressources_humaines', parent_id: null },
      // Boucles de Validation
      { id: 'ressources_humaines.boucles_validation.voir', name: 'Voir Boucles Validation', description: 'Voir les boucles de validation', category: 'ressources_humaines', parent_id: 'ressources_humaines.acces' },
      { id: 'ressources_humaines.boucles_validation.creer', name: 'Creer Boucle', description: 'Creer une boucle de validation', category: 'ressources_humaines', parent_id: 'ressources_humaines.boucles_validation.voir' },
      { id: 'ressources_humaines.boucles_validation.modifier', name: 'Modifier Boucle', description: 'Modifier une boucle de validation', category: 'ressources_humaines', parent_id: 'ressources_humaines.boucles_validation.voir' },
      { id: 'ressources_humaines.boucles_validation.supprimer', name: 'Supprimer Boucle', description: 'Supprimer une boucle de validation', category: 'ressources_humaines', parent_id: 'ressources_humaines.boucles_validation.voir' },
      // Gestion des Horaires
      { id: 'ressources_humaines.gestion_horaires.voir', name: 'Voir Gestion Horaires', description: 'Voir la gestion des horaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.acces' },
      // Onglet Modeles
      { id: 'ressources_humaines.gestion_horaires.modeles.creer', name: 'Creer Modele Horaire', description: 'Creer un modele d\'horaire', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      { id: 'ressources_humaines.gestion_horaires.modeles.modifier', name: 'Modifier Modele Horaire', description: 'Modifier un modele d\'horaire', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      { id: 'ressources_humaines.gestion_horaires.modeles.supprimer', name: 'Supprimer Modele Horaire', description: 'Supprimer un modele d\'horaire', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      // Onglet Jours Feries
      { id: 'ressources_humaines.gestion_horaires.jours_feries.creer', name: 'Creer Jour Ferie', description: 'Creer un jour ferie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      { id: 'ressources_humaines.gestion_horaires.jours_feries.modifier', name: 'Modifier Jour Ferie', description: 'Modifier un jour ferie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      { id: 'ressources_humaines.gestion_horaires.jours_feries.supprimer', name: 'Supprimer Jour Ferie', description: 'Supprimer un jour ferie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      // Onglet Conges Valides
      { id: 'ressources_humaines.gestion_horaires.conges_valides.voir', name: 'Voir Conges Valides', description: 'Voir les conges valides', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      // Onglet Heures Supplementaires
      { id: 'ressources_humaines.gestion_horaires.heures_sup.voir', name: 'Voir Heures Sup', description: 'Voir les heures supplementaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      { id: 'ressources_humaines.gestion_horaires.heures_sup.approuver', name: 'Approuver Heures Sup', description: 'Approuver les heures supplementaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.heures_sup.voir' },
      { id: 'ressources_humaines.gestion_horaires.heures_sup.rejeter', name: 'Rejeter Heures Sup', description: 'Rejeter les heures supplementaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.heures_sup.voir' },
      { id: 'ressources_humaines.gestion_horaires.heures_sup.creer_periode', name: 'Creer Periode HS', description: 'Creer une periode d\'heures supplementaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.heures_sup.voir' },
      { id: 'ressources_humaines.gestion_horaires.heures_sup.supprimer_periode', name: 'Supprimer Periode HS', description: 'Supprimer une periode d\'heures supplementaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.heures_sup.voir' },
      { id: 'ressources_humaines.gestion_horaires.heures_sup.recalculer', name: 'Recalculer Heures Sup', description: 'Recalculer les heures supplementaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.heures_sup.voir' },
      // Onglet Config HS
      { id: 'ressources_humaines.gestion_horaires.config_hs.voir', name: 'Voir Config HS', description: 'Voir la configuration des heures supplementaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.voir' },
      { id: 'ressources_humaines.gestion_horaires.config_hs.modifier', name: 'Modifier Config HS', description: 'Modifier la configuration des heures supplementaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_horaires.config_hs.voir' },
      // Gestion de Paie
      { id: 'ressources_humaines.gestion_paie.voir', name: 'Voir Gestion Paie', description: 'Voir la gestion de paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.acces' },
      // Onglet Periodes
      { id: 'ressources_humaines.gestion_paie.periodes.creer', name: 'Creer Periode Paie', description: 'Creer une periode de paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      { id: 'ressources_humaines.gestion_paie.periodes.ouvrir', name: 'Ouvrir Periode Paie', description: 'Ouvrir une periode de paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      { id: 'ressources_humaines.gestion_paie.periodes.fermer', name: 'Fermer Periode Paie', description: 'Fermer une periode de paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      { id: 'ressources_humaines.gestion_paie.periodes.supprimer', name: 'Supprimer Periode Paie', description: 'Supprimer une periode de paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      // Onglet Calculs
      { id: 'ressources_humaines.gestion_paie.calculs.calculer', name: 'Calculer Paie', description: 'Lancer le calcul de paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      // Onglet Bulletins
      { id: 'ressources_humaines.gestion_paie.bulletins.voir', name: 'Voir Bulletins', description: 'Voir les bulletins de paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      { id: 'ressources_humaines.gestion_paie.bulletins.valider', name: 'Valider Bulletin', description: 'Valider un bulletin', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.bulletins.voir' },
      { id: 'ressources_humaines.gestion_paie.bulletins.valider_tous', name: 'Valider Tous Bulletins', description: 'Valider tous les bulletins', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.bulletins.voir' },
      { id: 'ressources_humaines.gestion_paie.bulletins.telecharger', name: 'Telecharger Bulletin', description: 'Telecharger un bulletin', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.bulletins.voir' },
      { id: 'ressources_humaines.gestion_paie.bulletins.exporter_cnss', name: 'Exporter CNSS', description: 'Exporter la declaration CNSS', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.bulletins.voir' },
      { id: 'ressources_humaines.gestion_paie.bulletins.exporter_virements', name: 'Exporter Virements', description: 'Exporter le fichier de virements', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.bulletins.voir' },
      // Onglet Tests
      { id: 'ressources_humaines.gestion_paie.tests.voir', name: 'Voir Tests Paie', description: 'Voir les tests et logs de paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      // Onglet Automatisation
      { id: 'ressources_humaines.gestion_paie.automatisation.voir', name: 'Voir Automatisation', description: 'Voir l\'automatisation de la paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      { id: 'ressources_humaines.gestion_paie.automatisation.configurer', name: 'Configurer Automatisation', description: 'Configurer l\'automatisation', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.automatisation.voir' },
      // Onglet Configuration
      { id: 'ressources_humaines.gestion_paie.configuration.voir', name: 'Voir Configuration Paie', description: 'Voir la configuration de la paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.voir' },
      { id: 'ressources_humaines.gestion_paie.configuration.modifier', name: 'Modifier Configuration Paie', description: 'Modifier la configuration de la paie', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_paie.configuration.voir' },
      // Gestion Pointage
      { id: 'ressources_humaines.gestion_pointage.voir', name: 'Voir Gestion Pointage', description: 'Voir la gestion du pointage', category: 'ressources_humaines', parent_id: 'ressources_humaines.acces' },
      { id: 'ressources_humaines.gestion_pointage.pointer', name: 'Pointer', description: 'Effectuer un pointage', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_pointage.voir' },
      { id: 'ressources_humaines.gestion_pointage.corriger', name: 'Corriger Pointage', description: 'Corriger un pointage', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_pointage.voir' },
      { id: 'ressources_humaines.gestion_pointage.importer', name: 'Importer Pointages', description: 'Importer des pointages', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_pointage.voir' },
      { id: 'ressources_humaines.gestion_pointage.exporter', name: 'Exporter Pointages', description: 'Exporter les pointages', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_pointage.voir' },
      { id: 'ressources_humaines.gestion_pointage.valider', name: 'Valider Pointages', description: 'Valider les pointages', category: 'ressources_humaines', parent_id: 'ressources_humaines.gestion_pointage.voir' },
      // Dossier Employe
      { id: 'ressources_humaines.dossier_employe.voir', name: 'Voir Dossier Employe', description: 'Voir les dossiers employes', category: 'ressources_humaines', parent_id: 'ressources_humaines.acces' },
      { id: 'ressources_humaines.dossier_employe.creer', name: 'Creer Dossier', description: 'Creer un dossier employe', category: 'ressources_humaines', parent_id: 'ressources_humaines.dossier_employe.voir' },
      { id: 'ressources_humaines.dossier_employe.modifier', name: 'Modifier Dossier', description: 'Modifier un dossier employe', category: 'ressources_humaines', parent_id: 'ressources_humaines.dossier_employe.voir' },
      { id: 'ressources_humaines.dossier_employe.supprimer', name: 'Supprimer Dossier', description: 'Supprimer un dossier employe', category: 'ressources_humaines', parent_id: 'ressources_humaines.dossier_employe.voir' },
      { id: 'ressources_humaines.dossier_employe.voir_salaire', name: 'Voir Salaire', description: 'Voir le salaire de l\'employe', category: 'ressources_humaines', parent_id: 'ressources_humaines.dossier_employe.voir' },
      { id: 'ressources_humaines.dossier_employe.gerer_contrats', name: 'Gerer Contrats', description: 'Gerer les contrats de l\'employe', category: 'ressources_humaines', parent_id: 'ressources_humaines.dossier_employe.voir' },
      { id: 'ressources_humaines.dossier_employe.gerer_documents', name: 'Gerer Documents', description: 'Gerer les documents de l\'employe', category: 'ressources_humaines', parent_id: 'ressources_humaines.dossier_employe.voir' },
      { id: 'ressources_humaines.dossier_employe.gerer_discipline', name: 'Gerer Discipline', description: 'Gerer les actions disciplinaires', category: 'ressources_humaines', parent_id: 'ressources_humaines.dossier_employe.voir' },
      // Validation des Demandes
      { id: 'ressources_humaines.validation_demandes.voir', name: 'Voir Validation Demandes', description: 'Voir la validation des demandes', category: 'ressources_humaines', parent_id: 'ressources_humaines.acces' },
      { id: 'ressources_humaines.validation_demandes.approuver', name: 'Approuver Demande', description: 'Approuver une demande', category: 'ressources_humaines', parent_id: 'ressources_humaines.validation_demandes.voir' },
      { id: 'ressources_humaines.validation_demandes.rejeter', name: 'Rejeter Demande', description: 'Rejeter une demande', category: 'ressources_humaines', parent_id: 'ressources_humaines.validation_demandes.voir' },
      // Delegations
      { id: 'ressources_humaines.delegations.voir', name: 'Voir Delegations', description: 'Voir les delegations', category: 'ressources_humaines', parent_id: 'ressources_humaines.acces' },
      { id: 'ressources_humaines.delegations.creer', name: 'Creer Delegation', description: 'Creer une delegation', category: 'ressources_humaines', parent_id: 'ressources_humaines.delegations.voir' },
      { id: 'ressources_humaines.delegations.gerer_toutes', name: 'Gerer Toutes Delegations', description: 'Gerer toutes les delegations', category: 'ressources_humaines', parent_id: 'ressources_humaines.delegations.voir' },

      // ==================== MON EQUIPE ====================
      { id: 'mon_equipe.acces', name: 'Acces Mon Equipe', description: 'Acces a la section Mon Equipe', category: 'mon_equipe', parent_id: null },
      { id: 'mon_equipe.pointages_equipe.voir', name: 'Voir Pointages Equipe', description: 'Voir les pointages de l\'equipe', category: 'mon_equipe', parent_id: 'mon_equipe.acces' },
      { id: 'mon_equipe.pointages_equipe.supprimer', name: 'Supprimer Pointage Equipe', description: 'Supprimer un pointage de l\'equipe', category: 'mon_equipe', parent_id: 'mon_equipe.pointages_equipe.voir' },
      { id: 'mon_equipe.demandes_equipe.voir', name: 'Voir Demandes Equipe', description: 'Voir les demandes de l\'equipe', category: 'mon_equipe', parent_id: 'mon_equipe.acces' },
      { id: 'mon_equipe.demandes_equipe.approuver', name: 'Approuver Demande Equipe', description: 'Approuver une demande de l\'equipe', category: 'mon_equipe', parent_id: 'mon_equipe.demandes_equipe.voir' },
      { id: 'mon_equipe.demandes_equipe.rejeter', name: 'Rejeter Demande Equipe', description: 'Rejeter une demande de l\'equipe', category: 'mon_equipe', parent_id: 'mon_equipe.demandes_equipe.voir' },

      // ==================== MON ESPACE RH ====================
      { id: 'mon_espace_rh.acces', name: 'Acces Mon Espace RH', description: 'Acces a Mon Espace RH', category: 'mon_espace_rh', parent_id: null },
      { id: 'mon_espace_rh.mon_pointage.voir', name: 'Voir Mon Pointage', description: 'Voir mes pointages', category: 'mon_espace_rh', parent_id: 'mon_espace_rh.acces' },
      { id: 'mon_espace_rh.mon_pointage.pointer', name: 'Pointer', description: 'Effectuer mon pointage', category: 'mon_espace_rh', parent_id: 'mon_espace_rh.mon_pointage.voir' },
      { id: 'mon_espace_rh.mes_demandes.voir', name: 'Voir Mes Demandes', description: 'Voir mes demandes', category: 'mon_espace_rh', parent_id: 'mon_espace_rh.acces' },
      { id: 'mon_espace_rh.mes_demandes.creer', name: 'Creer Demande', description: 'Creer une demande', category: 'mon_espace_rh', parent_id: 'mon_espace_rh.mes_demandes.voir' },
      { id: 'mon_espace_rh.mes_demandes.annuler', name: 'Annuler Demande', description: 'Annuler une demande', category: 'mon_espace_rh', parent_id: 'mon_espace_rh.mes_demandes.voir' },
      { id: 'mon_espace_rh.mes_bulletins.voir', name: 'Voir Mes Bulletins', description: 'Voir mes bulletins de paie', category: 'mon_espace_rh', parent_id: 'mon_espace_rh.acces' },
      { id: 'mon_espace_rh.mes_bulletins.telecharger', name: 'Telecharger Bulletin', description: 'Telecharger mon bulletin', category: 'mon_espace_rh', parent_id: 'mon_espace_rh.mes_bulletins.voir' },

      // ==================== COMMERCIALISATION ====================
      { id: 'commercialisation.acces', name: 'Acces Commercialisation', description: 'Acces a la section Commercialisation', category: 'commercialisation', parent_id: null },
      // Tableau de bord
      { id: 'commercialisation.tableau_de_bord.voir', name: 'Voir Tableau de bord', description: 'Voir le tableau de bord commercial', category: 'commercialisation', parent_id: 'commercialisation.acces' },
      { id: 'commercialisation.tableau_de_bord.voir_stats', name: 'Voir Statistiques', description: 'Voir les statistiques', category: 'commercialisation', parent_id: 'commercialisation.tableau_de_bord.voir' },
      { id: 'commercialisation.tableau_de_bord.exporter', name: 'Exporter Stats', description: 'Exporter les statistiques', category: 'commercialisation', parent_id: 'commercialisation.tableau_de_bord.voir' },
      // Prospects
      { id: 'commercialisation.prospects.voir', name: 'Voir Prospects', description: 'Voir les prospects', category: 'commercialisation', parent_id: 'commercialisation.acces' },
      { id: 'commercialisation.prospects.voir_tous', name: 'Voir Tous Prospects', description: 'Voir tous les prospects', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.creer', name: 'Creer Prospect', description: 'Creer un prospect', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.modifier', name: 'Modifier Prospect', description: 'Modifier un prospect', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.supprimer', name: 'Supprimer Prospect', description: 'Supprimer un prospect', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.appeler', name: 'Appeler Prospect', description: 'Appeler un prospect', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.convertir', name: 'Convertir Prospect', description: 'Convertir un prospect en client', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.importer', name: 'Importer Prospects', description: 'Importer des prospects', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.exporter', name: 'Exporter Prospects', description: 'Exporter des prospects', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.assigner', name: 'Assigner Prospect', description: 'Assigner un prospect', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      { id: 'commercialisation.prospects.reinjecter', name: 'Reinjecter Prospect', description: 'Reinjecter un prospect dans le cycle', category: 'commercialisation', parent_id: 'commercialisation.prospects.voir' },
      // Nettoyage Prospects
      { id: 'commercialisation.nettoyage_prospects.voir', name: 'Voir Nettoyage', description: 'Voir le nettoyage des prospects', category: 'commercialisation', parent_id: 'commercialisation.acces' },
      { id: 'commercialisation.nettoyage_prospects.nettoyer', name: 'Nettoyer Prospects', description: 'Nettoyer les prospects', category: 'commercialisation', parent_id: 'commercialisation.nettoyage_prospects.voir' },
      // Gestion G-Contacte
      { id: 'commercialisation.gestion_gcontacte.voir', name: 'Voir G-Contacte', description: 'Voir la gestion G-Contacte', category: 'commercialisation', parent_id: 'commercialisation.acces' },
      { id: 'commercialisation.gestion_gcontacte.configurer', name: 'Configurer G-Contacte', description: 'Configurer G-Contacte', category: 'commercialisation', parent_id: 'commercialisation.gestion_gcontacte.voir' },
      { id: 'commercialisation.gestion_gcontacte.synchroniser', name: 'Synchroniser G-Contacte', description: 'Synchroniser avec G-Contacte', category: 'commercialisation', parent_id: 'commercialisation.gestion_gcontacte.voir' },
      { id: 'commercialisation.gestion_gcontacte.tester', name: 'Tester G-Contacte', description: 'Tester la connexion G-Contacte', category: 'commercialisation', parent_id: 'commercialisation.gestion_gcontacte.voir' },
    ];

    for (const perm of newPermissions) {
      await client.query(`
        INSERT INTO permissions (id, name, description, category, parent_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          parent_id = EXCLUDED.parent_id
      `, [perm.id, perm.name, perm.description, perm.category, perm.parent_id]);
    }
    console.log(`${newPermissions.length} nouvelles permissions inserees`);

    // Step 4: Migrer les associations role_permissions vers les nouveaux codes
    console.log('Step 4: Migration des associations role_permissions...');
    await client.query(`
      -- Pour chaque mapping, ajouter les nouvelles permissions aux roles qui avaient les anciennes
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT DISTINCT rp.role_id, m.new_code
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN permission_mapping m ON p.id = m.old_code
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
    console.log('Associations migreees');

    // Step 5: Assigner toutes les nouvelles permissions au role admin
    console.log('Step 5: Attribution des permissions admin...');
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'admin'
        AND p.id LIKE 'gestion_comptable.%' OR p.id LIKE 'formation.%' OR p.id LIKE 'ressources_humaines.%'
        OR p.id LIKE 'mon_equipe.%' OR p.id LIKE 'mon_espace_rh.%' OR p.id LIKE 'commercialisation.%'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
    console.log('Permissions admin attribuees');

    await client.query('COMMIT');

    console.log('=== Migration 109 terminee avec succes ===');
    res.json({
      success: true,
      message: 'Migration 109: Refactorisation des permissions en francais terminee',
      permissions_created: newPermissions.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur migration 109:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  } finally {
    client.release();
    await pool.end();
  }
});

export default router;
