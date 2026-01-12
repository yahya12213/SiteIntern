/**
 * Migration 115: Add ALL missing permissions identified by validation
 *
 * This migration adds 34 missing permissions across multiple modules:
 * - Sessions Formation (3): retirer_etudiant, supprimer_paiement, transfert_etudiant
 * - Templates Certificats (2): creer, modifier
 * - Certificats (5): voir, generer, modifier, supprimer (covered by migration 114)
 * - Forums (3): creer_sujet, modifier_sujet, gerer
 * - Centres (2): voir, creer
 * - Corps (4): voir, creer, modifier, supprimer
 * - Gestion Pointage (4): creer, modifier, approuver, rejeter
 * - Conges (4): voir, creer, approuver, modifier
 * - RH Dashboard (1): voir
 * - RH Parametres (2): voir, modifier
 * - RH Jours Feries (2): voir, gerer
 * - Declarations (2): voir_tous, edit_metadata
 */

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to get or create module
async function getOrCreateModule(client, code, name) {
  let result = await client.query('SELECT id FROM modules WHERE code = $1', [code]);
  if (result.rows.length === 0) {
    result = await client.query(
      'INSERT INTO modules (code, name, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM modules)) RETURNING id',
      [code, name]
    );
  }
  return result.rows[0].id;
}

// Helper to get or create submenu
async function getOrCreateSubmenu(client, moduleId, code, name, sortOrder = 1) {
  let result = await client.query(
    'SELECT id FROM submenus WHERE code = $1 AND module_id = $2',
    [code, moduleId]
  );
  if (result.rows.length === 0) {
    result = await client.query(
      'INSERT INTO submenus (module_id, code, name, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
      [moduleId, code, name, sortOrder]
    );
  }
  return result.rows[0].id;
}

// Helper to add permission if not exists
async function addPermissionIfNotExists(client, perm) {
  const existing = await client.query('SELECT id FROM permissions WHERE code = $1', [perm.code]);
  if (existing.rows.length === 0) {
    await client.query(`
      INSERT INTO permissions (code, name, description, module_id, submenu_id, action, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    `, [perm.code, perm.name, perm.description, perm.moduleId, perm.submenuId, perm.action, perm.sortOrder]);
    return true;
  }
  return false;
}

router.post('/run', authenticateToken, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🚀 Migration 115: Adding all missing permissions...');

    let created = 0;
    let skipped = 0;

    // === FORMATION MODULE ===
    const formationModuleId = await getOrCreateModule(client, 'formation', 'Formation');

    // Sessions Formation - add missing actions
    const sessionsSubmenuId = await getOrCreateSubmenu(client, formationModuleId, 'sessions_formation', 'Sessions de Formation', 2);
    const sessionsPerms = [
      { code: 'formation.sessions_formation.retirer_etudiant', name: 'Retirer un etudiant', description: 'Permet de retirer un etudiant d\'une session', action: 'retirer_etudiant', sortOrder: 7 },
      { code: 'formation.sessions_formation.supprimer_paiement', name: 'Supprimer un paiement', description: 'Permet de supprimer un paiement d\'un etudiant', action: 'supprimer_paiement', sortOrder: 8 },
      { code: 'formation.sessions_formation.transfert_etudiant', name: 'Transferer un etudiant', description: 'Permet de transferer un etudiant vers une autre session', action: 'transfert_etudiant', sortOrder: 9 },
    ];
    for (const p of sessionsPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: formationModuleId, submenuId: sessionsSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // Templates Certificats - add missing actions
    const templatesSubmenuId = await getOrCreateSubmenu(client, formationModuleId, 'templates_certificats', 'Templates de Certificats', 7);
    const templatesPerms = [
      { code: 'formation.templates_certificats.creer', name: 'Creer un template', description: 'Permet de creer un nouveau template', action: 'creer', sortOrder: 2 },
      { code: 'formation.templates_certificats.modifier', name: 'Modifier un template', description: 'Permet de modifier un template existant', action: 'modifier', sortOrder: 3 },
    ];
    for (const p of templatesPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: formationModuleId, submenuId: templatesSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // Certificats - ensure all exist (migration 114 should have these, but check anyway)
    const certificatsSubmenuId = await getOrCreateSubmenu(client, formationModuleId, 'certificats', 'Certificats', 8);
    const certificatsPerms = [
      { code: 'formation.certificats.voir', name: 'Voir les certificats', description: 'Permet de voir les certificats', action: 'voir', sortOrder: 1 },
      { code: 'formation.certificats.generer', name: 'Generer un certificat', description: 'Permet de generer un certificat', action: 'generer', sortOrder: 2 },
      { code: 'formation.certificats.modifier', name: 'Modifier un certificat', description: 'Permet de modifier un certificat', action: 'modifier', sortOrder: 3 },
      { code: 'formation.certificats.supprimer', name: 'Supprimer un certificat', description: 'Permet de supprimer un certificat', action: 'supprimer', sortOrder: 4 },
    ];
    for (const p of certificatsPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: formationModuleId, submenuId: certificatsSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // Forums - add missing actions
    const forumsSubmenuId = await getOrCreateSubmenu(client, formationModuleId, 'forums', 'Forums', 9);
    const forumsPerms = [
      { code: 'formation.forums.creer_sujet', name: 'Creer un sujet', description: 'Permet de creer un nouveau sujet de discussion', action: 'creer_sujet', sortOrder: 2 },
      { code: 'formation.forums.modifier_sujet', name: 'Modifier un sujet', description: 'Permet de modifier un sujet existant', action: 'modifier_sujet', sortOrder: 3 },
      { code: 'formation.forums.gerer', name: 'Gerer les forums', description: 'Permet de gerer les forums (moderation)', action: 'gerer', sortOrder: 8 },
    ];
    for (const p of forumsPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: formationModuleId, submenuId: forumsSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // Centres - new submenu
    const centresSubmenuId = await getOrCreateSubmenu(client, formationModuleId, 'centres', 'Centres de Formation', 10);
    const centresPerms = [
      { code: 'formation.centres.voir', name: 'Voir les centres', description: 'Permet de voir la liste des centres de formation', action: 'voir', sortOrder: 1 },
      { code: 'formation.centres.creer', name: 'Creer un centre', description: 'Permet de creer un nouveau centre de formation', action: 'creer', sortOrder: 2 },
    ];
    for (const p of centresPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: formationModuleId, submenuId: centresSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // Corps - new submenu
    const corpsSubmenuId = await getOrCreateSubmenu(client, formationModuleId, 'corps', 'Corps de Formation', 11);
    const corpsPerms = [
      { code: 'formation.corps.voir', name: 'Voir les corps', description: 'Permet de voir la liste des corps de formation', action: 'voir', sortOrder: 1 },
      { code: 'formation.corps.creer', name: 'Creer un corps', description: 'Permet de creer un nouveau corps', action: 'creer', sortOrder: 2 },
      { code: 'formation.corps.modifier', name: 'Modifier un corps', description: 'Permet de modifier un corps existant', action: 'modifier', sortOrder: 3 },
      { code: 'formation.corps.supprimer', name: 'Supprimer un corps', description: 'Permet de supprimer un corps', action: 'supprimer', sortOrder: 4 },
    ];
    for (const p of corpsPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: formationModuleId, submenuId: corpsSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // === RESSOURCES HUMAINES MODULE ===
    const rhModuleId = await getOrCreateModule(client, 'ressources_humaines', 'Ressources Humaines');

    // Gestion Pointage - add missing actions
    const pointageSubmenuId = await getOrCreateSubmenu(client, rhModuleId, 'gestion_pointage', 'Gestion Pointage', 3);
    const pointagePerms = [
      { code: 'ressources_humaines.gestion_pointage.creer', name: 'Creer un pointage', description: 'Permet de creer un nouveau pointage', action: 'creer', sortOrder: 2 },
      { code: 'ressources_humaines.gestion_pointage.modifier', name: 'Modifier un pointage', description: 'Permet de modifier un pointage existant', action: 'modifier', sortOrder: 3 },
      { code: 'ressources_humaines.gestion_pointage.approuver', name: 'Approuver les heures sup', description: 'Permet d\'approuver les heures supplementaires', action: 'approuver', sortOrder: 4 },
      { code: 'ressources_humaines.gestion_pointage.rejeter', name: 'Rejeter les heures sup', description: 'Permet de rejeter les heures supplementaires', action: 'rejeter', sortOrder: 5 },
    ];
    for (const p of pointagePerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: rhModuleId, submenuId: pointageSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // Conges - new submenu
    const congesSubmenuId = await getOrCreateSubmenu(client, rhModuleId, 'conges', 'Conges', 6);
    const congesPerms = [
      { code: 'ressources_humaines.conges.voir', name: 'Voir les conges', description: 'Permet de voir les demandes de conges', action: 'voir', sortOrder: 1 },
      { code: 'ressources_humaines.conges.creer', name: 'Creer une demande', description: 'Permet de creer une demande de conge', action: 'creer', sortOrder: 2 },
      { code: 'ressources_humaines.conges.approuver', name: 'Approuver un conge', description: 'Permet d\'approuver une demande de conge', action: 'approuver', sortOrder: 3 },
      { code: 'ressources_humaines.conges.modifier', name: 'Modifier un conge', description: 'Permet de modifier une demande de conge', action: 'modifier', sortOrder: 4 },
    ];
    for (const p of congesPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: rhModuleId, submenuId: congesSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // RH Tableau de Bord
    const rhDashboardSubmenuId = await getOrCreateSubmenu(client, rhModuleId, 'tableau_de_bord', 'Tableau de Bord RH', 0);
    const rhDashboardPerms = [
      { code: 'ressources_humaines.tableau_de_bord.voir', name: 'Voir le tableau de bord RH', description: 'Permet d\'acceder au tableau de bord RH', action: 'voir', sortOrder: 1 },
    ];
    for (const p of rhDashboardPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: rhModuleId, submenuId: rhDashboardSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // RH Parametres
    const rhParametresSubmenuId = await getOrCreateSubmenu(client, rhModuleId, 'parametres', 'Parametres RH', 10);
    const rhParametresPerms = [
      { code: 'ressources_humaines.parametres.voir', name: 'Voir les parametres RH', description: 'Permet de voir les parametres RH', action: 'voir', sortOrder: 1 },
      { code: 'ressources_humaines.parametres.modifier', name: 'Modifier les parametres RH', description: 'Permet de modifier les parametres RH', action: 'modifier', sortOrder: 2 },
    ];
    for (const p of rhParametresPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: rhModuleId, submenuId: rhParametresSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // Gestion Horaires > Jours Feries (nested structure)
    const horairesSubmenuId = await getOrCreateSubmenu(client, rhModuleId, 'gestion_horaires', 'Gestion des Horaires', 2);
    // For nested jours_feries, we create permissions with the nested code structure
    const joursFeriesPerms = [
      { code: 'ressources_humaines.gestion_horaires.jours_feries.voir', name: 'Voir les jours feries', description: 'Permet de voir les jours feries', action: 'voir', sortOrder: 10 },
      { code: 'ressources_humaines.gestion_horaires.jours_feries.gerer', name: 'Gerer les jours feries', description: 'Permet de gerer les jours feries', action: 'gerer', sortOrder: 11 },
    ];
    for (const p of joursFeriesPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: rhModuleId, submenuId: horairesSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    // === GESTION COMPTABLE MODULE ===
    const comptaModuleId = await getOrCreateModule(client, 'gestion_comptable', 'Gestion Comptable');

    // Declarations - add missing actions
    const declarationsSubmenuId = await getOrCreateSubmenu(client, comptaModuleId, 'declarations', 'Declarations', 6);
    const declarationsPerms = [
      { code: 'gestion_comptable.declarations.voir_tous', name: 'Voir toutes les declarations', description: 'Permet de voir toutes les declarations (admin)', action: 'voir_tous', sortOrder: 2 },
      { code: 'gestion_comptable.declarations.edit_metadata', name: 'Modifier les metadonnees', description: 'Permet de modifier les metadonnees d\'une declaration', action: 'edit_metadata', sortOrder: 6 },
    ];
    for (const p of declarationsPerms) {
      if (await addPermissionIfNotExists(client, { ...p, moduleId: comptaModuleId, submenuId: declarationsSubmenuId })) {
        created++;
        console.log(`  ✓ ${p.code}`);
      } else {
        skipped++;
      }
    }

    await client.query('COMMIT');

    console.log('✅ Migration 115 completed!');
    console.log(`   - Created: ${created} permissions`);
    console.log(`   - Skipped: ${skipped} (already exist)`);

    res.json({
      success: true,
      message: 'Migration 115 completed successfully',
      details: { created, skipped }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 115 failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Status check
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Check a sample of permissions from each category
    const sampleCodes = [
      'formation.sessions_formation.retirer_etudiant',
      'formation.certificats.voir',
      'formation.centres.voir',
      'ressources_humaines.conges.voir',
      'ressources_humaines.gestion_horaires.jours_feries.voir',
      'gestion_comptable.declarations.voir_tous'
    ];

    const result = await pool.query(`
      SELECT code FROM permissions WHERE code = ANY($1)
    `, [sampleCodes]);

    const foundCount = result.rows.length;
    const migrationApplied = foundCount >= 4; // At least 4 of 6 sample codes exist

    res.json({
      success: true,
      migrationApplied,
      foundPermissions: result.rows.map(r => r.code),
      expectedSamples: sampleCodes.length,
      foundSamples: foundCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
