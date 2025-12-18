/**
 * Prospect Reinject - Réinjection des prospects anciens
 * Permet de retravailler les prospects obsolètes sans créer de doublons
 */

import pool from '../config/database.js';

/**
 * Réinjecte un prospect existant (remise à zéro pour retraitement)
 * @param {string} prospectId - ID du prospect
 * @param {string} userId - ID de l'utilisateur effectuant la réinjection
 * @returns {Promise<Object>} Prospect réinjecté
 */
export async function reinjectProspect(prospectId, userId) {
  const query = `
    UPDATE prospects
    SET
      date_injection = NOW(),
      date_rdv = NULL,
      statut_contact = 'non contacté',
      decision_nettoyage = 'laisser',
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const { rows } = await pool.query(query, [prospectId]);

  if (rows.length === 0) {
    throw new Error('Prospect non trouvé');
  }

  // Logger dans l'historique
  const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await pool.query(`
    INSERT INTO prospect_call_history
    (id, prospect_id, user_id, call_start, call_end, status_before, status_after, commentaire)
    VALUES ($1, $2, $3, NOW(), NOW(), 'réinjection', 'non contacté', 'Prospect réinjecté')
  `, [callId, prospectId, userId]);

  console.log(`🔄 Prospect ${prospectId} réinjecté par user ${userId}`);

  return rows[0];
}

/**
 * Détermine si un prospect doit être réinjecté (au lieu de créer un doublon)
 * Un prospect peut être réinjecté s'il est dans un état "usé"
 * @param {Object} existingProspect - Prospect existant
 * @returns {boolean} true si le prospect doit être réinjecté
 */
export function shouldReinject(existingProspect) {
  if (!existingProspect) return false;

  // Statuts négatifs (prospect abandonné)
  const statuts_negatifs = [
    'contacté sans rdv',
    'contacté sans reponse',
    'contacté sans réponse',
    'boîte vocale',
    'boite vocale',
    'à recontacter',
    'a recontacter'
  ];

  const isNegativeStatus = statuts_negatifs.includes(
    existingProspect.statut_contact?.toLowerCase()
  );

  // RDV ancien (dépassé de plus de 7 jours)
  const rdvAncien = existingProspect.date_rdv &&
    new Date(existingProspect.date_rdv) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Injection ancienne (plus de 3 jours sans activité)
  const injectionAncienne = existingProspect.date_injection &&
    new Date(existingProspect.date_injection) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Le prospect peut être réinjecté si au moins une condition est vraie
  return isNegativeStatus || rdvAncien || injectionAncienne;
}

/**
 * Gère la logique complète de doublon vs réinjection
 * RÈGLE: Un même numéro peut exister dans différents segments
 * Le doublon est vérifié par combinaison phone_international + segment_id
 * @param {string} phoneInternational - Numéro au format international
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} prospectData - Données du nouveau prospect (doit contenir segment_id)
 * @returns {Promise<Object>} { action: 'created'|'reinjected'|'duplicate', prospect, message }
 */
export async function handleDuplicateOrReinject(phoneInternational, userId, prospectData) {
  // Vérifier si le prospect existe DANS LE MÊME SEGMENT
  // Un même numéro peut exister dans différents segments
  const existingQuery = `
    SELECT * FROM prospects
    WHERE phone_international = $1
      AND segment_id = $2
  `;
  const { rows: existing } = await pool.query(existingQuery, [phoneInternational, prospectData.segment_id]);

  if (existing.length === 0) {
    // Aucun doublon dans ce segment → Créer un nouveau prospect
    return {
      action: 'created',
      prospect: null,
      message: 'Nouveau prospect à créer'
    };
  }

  const existingProspect = existing[0];

  // Vérifier si le prospect doit être réinjecté
  if (shouldReinject(existingProspect)) {
    // Réinjecter le prospect
    const reinjected = await reinjectProspect(existingProspect.id, userId);

    // Mettre à jour les données si fournies
    if (prospectData.segment_id || prospectData.ville_id || prospectData.nom || prospectData.prenom) {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (prospectData.segment_id) {
        updateFields.push(`segment_id = $${paramIndex++}`);
        updateValues.push(prospectData.segment_id);
      }
      if (prospectData.ville_id) {
        updateFields.push(`ville_id = $${paramIndex++}`);
        updateValues.push(prospectData.ville_id);
      }
      if (prospectData.nom) {
        updateFields.push(`nom = $${paramIndex++}`);
        updateValues.push(prospectData.nom);
      }
      if (prospectData.prenom) {
        updateFields.push(`prenom = $${paramIndex++}`);
        updateValues.push(prospectData.prenom);
      }

      if (updateFields.length > 0) {
        updateValues.push(existingProspect.id);
        await pool.query(`
          UPDATE prospects
          SET ${updateFields.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
        `, updateValues);
      }
    }

    return {
      action: 'reinjected',
      prospect: reinjected,
      message: 'Prospect réinjecté avec succès'
    };
  }

  // Le prospect existe dans ce segment et ne peut pas être réinjecté → Doublon strict
  return {
    action: 'duplicate',
    prospect: existingProspect,
    message: 'Ce numéro existe déjà dans ce segment'
  };
}
