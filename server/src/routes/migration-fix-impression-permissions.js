import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Migration pour corriger les permissions du rôle impression
// Le rôle impression a besoin de lire les segments et villes pour créer des déclarations

router.post('/run', async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔧 Début de la migration: Fix impression role permissions...');

    await client.query('BEGIN');

    // 1. Vérifier que le rôle impression existe
    const impressionRole = await client.query(
      "SELECT id FROM roles WHERE name = 'impression'"
    );

    if (impressionRole.rows.length === 0) {
      console.log('⚠️ Le rôle impression n\'existe pas');
      await client.query('ROLLBACK');
      return res.json({
        success: false,
        message: 'Le rôle impression n\'existe pas'
      });
    }

    const roleId = impressionRole.rows[0].id;
    console.log(`✓ Rôle impression trouvé avec ID: ${roleId}`);

    // 2. Ajouter les permissions manquantes pour segments et cities
    const permissionsToAdd = [
      'accounting.segments.view_page',
      'accounting.cities.view_page'
    ];

    for (const permission of permissionsToAdd) {
      // Vérifier que la permission existe
      const permExists = await client.query(
        'SELECT id FROM permissions WHERE name = $1',
        [permission]
      );

      if (permExists.rows.length === 0) {
        console.log(`⚠️ Permission ${permission} n'existe pas, création...`);

        // Extraire module et action
        const parts = permission.split('.');
        const module = parts.slice(0, 2).join('.');
        const action = parts[2];

        // Créer la permission
        await client.query(
          'INSERT INTO permissions (name, module, action, description) VALUES ($1, $2, $3, $4)',
          [permission, module, action, `Permet de ${action} pour ${module}`]
        );
        console.log(`✓ Permission ${permission} créée`);
      }

      // Vérifier si l'association existe déjà
      const assocExists = await client.query(
        `SELECT 1 FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1 AND p.name = $2`,
        [roleId, permission]
      );

      if (assocExists.rows.length === 0) {
        // Ajouter la permission au rôle
        const perm = await client.query(
          'SELECT id FROM permissions WHERE name = $1',
          [permission]
        );

        if (perm.rows.length > 0) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [roleId, perm.rows[0].id]
          );
          console.log(`✓ Permission ${permission} ajoutée au rôle impression`);
        }
      } else {
        console.log(`✓ Permission ${permission} déjà présente pour le rôle impression`);
      }
    }

    // 3. Vérifier les permissions finales
    const finalPerms = await client.query(
      `SELECT p.name
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.name`,
      [roleId]
    );

    console.log('\n📋 Permissions finales pour le rôle impression:');
    finalPerms.rows.forEach(row => {
      console.log(`  - ${row.name}`);
    });

    await client.query('COMMIT');

    console.log('\n✅ Migration terminée avec succès!');
    console.log('Le rôle impression peut maintenant:');
    console.log('  - Voir les segments (lecture seule)');
    console.log('  - Voir les villes (lecture seule)');
    console.log('  - Créer des déclarations pour les professeurs');

    res.json({
      success: true,
      message: 'Permissions du rôle impression corrigées avec succès',
      permissions: finalPerms.rows.map(r => r.name)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la migration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Endpoint pour vérifier les permissions actuelles du rôle impression
router.get('/check', async (req, res) => {
  const client = await pool.connect();

  try {
    // Récupérer les permissions actuelles du rôle impression
    const result = await client.query(
      `SELECT p.name, p.module, p.action, p.description
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       JOIN roles r ON r.id = rp.role_id
       WHERE r.name = 'impression'
       ORDER BY p.name`
    );

    res.json({
      role: 'impression',
      permissions: result.rows,
      hasSegmentsAccess: result.rows.some(p => p.name === 'accounting.segments.view_page'),
      hasCitiesAccess: result.rows.some(p => p.name === 'accounting.cities.view_page')
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;