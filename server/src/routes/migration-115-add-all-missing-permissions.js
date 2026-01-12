/**
 * Migration 115: Add ALL missing permissions identified by validation
 *
 * This migration adds 34 missing permissions across multiple modules.
 *
 * FIXED: Uses simple permissions table structure (no modules/submenus tables)
 */

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/run', authenticateToken, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🚀 Migration 115: Adding all missing permissions...');

    // All 34 missing permissions with simple structure: code, name, module, description
    const allPermissions = [
      // === FORMATION - Sessions Formation ===
      {
        code: 'formation.sessions_formation.retirer_etudiant',
        name: 'Retirer un etudiant',
        module: 'formation',
        description: 'Permet de retirer un etudiant d\'une session'
      },
      {
        code: 'formation.sessions_formation.supprimer_paiement',
        name: 'Supprimer un paiement',
        module: 'formation',
        description: 'Permet de supprimer un paiement d\'un etudiant'
      },
      {
        code: 'formation.sessions_formation.transfert_etudiant',
        name: 'Transferer un etudiant',
        module: 'formation',
        description: 'Permet de transferer un etudiant vers une autre session'
      },

      // === FORMATION - Templates Certificats ===
      {
        code: 'formation.templates_certificats.creer',
        name: 'Creer un template',
        module: 'formation',
        description: 'Permet de creer un nouveau template de certificat'
      },
      {
        code: 'formation.templates_certificats.modifier',
        name: 'Modifier un template',
        module: 'formation',
        description: 'Permet de modifier un template de certificat existant'
      },

      // === FORMATION - Certificats (backup - migration 114 should have these) ===
      {
        code: 'formation.certificats.voir',
        name: 'Voir les certificats',
        module: 'formation',
        description: 'Permet de voir les certificats generes'
      },
      {
        code: 'formation.certificats.generer',
        name: 'Generer un certificat',
        module: 'formation',
        description: 'Permet de generer un nouveau certificat'
      },
      {
        code: 'formation.certificats.modifier',
        name: 'Modifier un certificat',
        module: 'formation',
        description: 'Permet de modifier un certificat existant'
      },
      {
        code: 'formation.certificats.supprimer',
        name: 'Supprimer un certificat',
        module: 'formation',
        description: 'Permet de supprimer un certificat'
      },
      {
        code: 'formation.certificats.telecharger',
        name: 'Telecharger un certificat',
        module: 'formation',
        description: 'Permet de telecharger un certificat en PDF'
      },

      // === FORMATION - Forums ===
      {
        code: 'formation.forums.creer_sujet',
        name: 'Creer un sujet',
        module: 'formation',
        description: 'Permet de creer un nouveau sujet de discussion'
      },
      {
        code: 'formation.forums.modifier_sujet',
        name: 'Modifier un sujet',
        module: 'formation',
        description: 'Permet de modifier un sujet existant'
      },
      {
        code: 'formation.forums.gerer',
        name: 'Gerer les forums',
        module: 'formation',
        description: 'Permet de gerer les forums (moderation)'
      },

      // === FORMATION - Centres ===
      {
        code: 'formation.centres.voir',
        name: 'Voir les centres',
        module: 'formation',
        description: 'Permet de voir la liste des centres de formation'
      },
      {
        code: 'formation.centres.creer',
        name: 'Creer un centre',
        module: 'formation',
        description: 'Permet de creer un nouveau centre de formation'
      },

      // === FORMATION - Corps ===
      {
        code: 'formation.corps.voir',
        name: 'Voir les corps',
        module: 'formation',
        description: 'Permet de voir la liste des corps de formation'
      },
      {
        code: 'formation.corps.creer',
        name: 'Creer un corps',
        module: 'formation',
        description: 'Permet de creer un nouveau corps'
      },
      {
        code: 'formation.corps.modifier',
        name: 'Modifier un corps',
        module: 'formation',
        description: 'Permet de modifier un corps existant'
      },
      {
        code: 'formation.corps.supprimer',
        name: 'Supprimer un corps',
        module: 'formation',
        description: 'Permet de supprimer un corps'
      },

      // === RESSOURCES HUMAINES - Gestion Pointage ===
      {
        code: 'ressources_humaines.gestion_pointage.creer',
        name: 'Creer un pointage',
        module: 'ressources_humaines',
        description: 'Permet de creer un nouveau pointage'
      },
      {
        code: 'ressources_humaines.gestion_pointage.modifier',
        name: 'Modifier un pointage',
        module: 'ressources_humaines',
        description: 'Permet de modifier un pointage existant'
      },
      {
        code: 'ressources_humaines.gestion_pointage.approuver',
        name: 'Approuver les heures sup',
        module: 'ressources_humaines',
        description: 'Permet d\'approuver les heures supplementaires'
      },
      {
        code: 'ressources_humaines.gestion_pointage.rejeter',
        name: 'Rejeter les heures sup',
        module: 'ressources_humaines',
        description: 'Permet de rejeter les heures supplementaires'
      },

      // === RESSOURCES HUMAINES - Conges ===
      {
        code: 'ressources_humaines.conges.voir',
        name: 'Voir les conges',
        module: 'ressources_humaines',
        description: 'Permet de voir les demandes de conges'
      },
      {
        code: 'ressources_humaines.conges.creer',
        name: 'Creer une demande de conge',
        module: 'ressources_humaines',
        description: 'Permet de creer une demande de conge'
      },
      {
        code: 'ressources_humaines.conges.approuver',
        name: 'Approuver un conge',
        module: 'ressources_humaines',
        description: 'Permet d\'approuver une demande de conge'
      },
      {
        code: 'ressources_humaines.conges.modifier',
        name: 'Modifier un conge',
        module: 'ressources_humaines',
        description: 'Permet de modifier une demande de conge'
      },

      // === RESSOURCES HUMAINES - Tableau de Bord ===
      {
        code: 'ressources_humaines.tableau_de_bord.voir',
        name: 'Voir le tableau de bord RH',
        module: 'ressources_humaines',
        description: 'Permet d\'acceder au tableau de bord RH'
      },

      // === RESSOURCES HUMAINES - Parametres ===
      {
        code: 'ressources_humaines.parametres.voir',
        name: 'Voir les parametres RH',
        module: 'ressources_humaines',
        description: 'Permet de voir les parametres RH'
      },
      {
        code: 'ressources_humaines.parametres.modifier',
        name: 'Modifier les parametres RH',
        module: 'ressources_humaines',
        description: 'Permet de modifier les parametres RH'
      },

      // === RESSOURCES HUMAINES - Jours Feries ===
      {
        code: 'ressources_humaines.gestion_horaires.jours_feries.voir',
        name: 'Voir les jours feries',
        module: 'ressources_humaines',
        description: 'Permet de voir les jours feries'
      },
      {
        code: 'ressources_humaines.gestion_horaires.jours_feries.gerer',
        name: 'Gerer les jours feries',
        module: 'ressources_humaines',
        description: 'Permet de gerer les jours feries'
      },

      // === GESTION COMPTABLE - Declarations ===
      {
        code: 'gestion_comptable.declarations.voir_tous',
        name: 'Voir toutes les declarations',
        module: 'gestion_comptable',
        description: 'Permet de voir toutes les declarations (admin)'
      },
      {
        code: 'gestion_comptable.declarations.edit_metadata',
        name: 'Modifier les metadonnees',
        module: 'gestion_comptable',
        description: 'Permet de modifier les metadonnees d\'une declaration'
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const perm of allPermissions) {
      // Check if permission already exists
      const existing = await client.query(`
        SELECT id FROM permissions WHERE code = $1
      `, [perm.code]);

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO permissions (code, name, module, description)
          VALUES ($1, $2, $3, $4)
        `, [perm.code, perm.name, perm.module, perm.description]);
        console.log(`  ✓ Created: ${perm.code}`);
        created++;
      } else {
        console.log(`  - Skipped (exists): ${perm.code}`);
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
      details: { created, skipped, total: allPermissions.length }
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

// Status check endpoint
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
    const migrationApplied = foundCount >= 4;

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
