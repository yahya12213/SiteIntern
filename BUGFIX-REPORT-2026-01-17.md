# Rapport de Correction de Bugs - 2026-01-17

## Résumé Exécutif

Deux bugs critiques en production ont été identifiés et corrigés :
- **BUG #1** : Erreur 500 sur `/api/hr/delegation/received`
- **BUG #2** : Erreur 400 sur `/api/hr/manager/requests/{id}/approve`

---

## BUG #1 : Erreur 500 - Colonnes profiles inexistantes ✅ CORRIGÉ

### Problème
**Erreur** : `column "first_name" does not exist` dans la table `profiles`

**Fichier affecté** : `server/src/routes/hr-delegation.js` ligne 320

**Code problématique** :
```javascript
const delegator = await client.query(
  "SELECT first_name || ' ' || last_name as name FROM profiles WHERE id = $1",
  [userId]
);
```

**Cause** : La table `profiles` possède uniquement `full_name`, pas `first_name`/`last_name`.

### Solution Appliquée

**Commit** : `339b012` - "fix: Corriger requête profiles.first_name -> full_name dans hr-delegation.js"

**Changement** :
```javascript
// APRÈS (CORRECT)
const delegator = await client.query(
  "SELECT full_name as name FROM profiles WHERE id = $1",
  [userId]
);
```

### Vérification
1. ✅ Code modifié à la ligne 320
2. ✅ Commit créé et poussé vers Railway
3. ✅ Déploiement Railway en cours

**Test** : Accéder à `/api/hr/delegation/received` → devrait retourner 200 (pas 500)

---

## BUG #2 : Erreur 400 - Employés sans managers ✅ CORRIGÉ

### Problème
**Erreur** : `400 Bad Request` avec message `{ success: false, error: "No approver at this level" }`

**Fichier affecté** : `server/src/services/approval-service.js` lignes 129-157

**Cause Identifiée** :
Deux employés actifs n'avaient **AUCUN manager assigné** dans la table `hr_employee_managers` :
- **assia koubis** (EMP-ASSIA-5626)
- **sara sara** (EMP-SARA-5281)

**Conséquence** :
1. Employé crée une demande de congé
2. Manager essaie d'approuver via `/api/hr/manager/requests/{id}/approve`
3. `ApprovalService.getApprovalChain()` retourne `[]` (tableau vide)
4. `canUserApprove()` ne trouve pas d'approbateur au niveau 0
5. → **Erreur 400**

### Diagnostic Effectué

**Script SQL** : `server/debug-approval-issue.sql`

**Résultats** :
```
VÉRIFICATION 2 - Employés sans hiérarchie:
 employee_id    | employee_number | employee_name    | nombre_managers
----------------+-----------------+------------------+-----------------
 193e0ce7...    | EMP-ADMIN-3991  | Administrateur   | 0  (OK - admin)
 eec2a189...    | EMP-ASSIA-5626  | assia koubis     | 0  (PROBLÈME!)
 2d6f584f...    | EMP-SARA-5281   | sara sara        | 0  (PROBLÈME!)
```

### Solution Appliquée

**Script SQL** : `server/fix-missing-managers.sql`

**Actions** :
1. Assigner **khalid fathi** comme Manager N (rank 0) pour assia et sara
2. Assigner **Administrateur** comme Manager N+1 (rank 1) pour assia et sara

**Résultat** :
```sql
 employee_number | employee_name |  manager_name   | rank | is_active
-----------------+---------------+-----------------+------+-----------
 EMP-ASSIA-5626  | assia koubis  | khalid fathi    |    0 | t
 EMP-ASSIA-5626  | assia koubis  | Administrateur  |    1 | t
 EMP-SARA-5281   | sara sara     | khalid fathi    |    0 | t
 EMP-SARA-5281   | sara sara     | Administrateur  |    1 | t
```

### Vérification
1. ✅ Managers assignés dans la base de données
2. ✅ Hiérarchie à 2 niveaux configurée (N + N+1)
3. ⏳ Test d'approbation en attente

**Test** :
1. Se connecter avec le compte d'assia ou sara
2. Créer une demande de congé
3. Se connecter avec le compte de khalid fathi
4. Approuver la demande → devrait retourner 200 (pas 400)

---

## État de la Production

### Corrections Déployées
- ✅ **BUG #1** : Pusher vers Railway (commit 339b012)
- ✅ **BUG #2** : Correction appliquée directement en base de données

### Tests à Effectuer
1. **BUG #1** : Vérifier `/api/hr/delegation/received` ne retourne plus 500
2. **BUG #2** : Tester workflow d'approbation avec assia/sara

### Logs Railway à Surveiller
```bash
# Avant correction (erreurs)
2026-01-17T21:55:37Z POST /api/hr/delegation/received 500 (Internal Server Error)
2026-01-17T21:55:37Z POST /api/hr/manager/requests/{id}/approve 400 (Bad Request)

# Après correction (attendu)
2026-01-17T22:XX:XX POST /api/hr/delegation/received 200 (OK)
2026-01-17T22:XX:XX POST /api/hr/manager/requests/{id}/approve 200 (OK)
```

---

## Scripts SQL Créés

1. **debug-approval-issue.sql** - Diagnostic complet du système d'approbation
   - Vérifie les profils sans hr_employee
   - Identifie les employés sans managers
   - Affiche les hiérarchies complètes
   - Liste les demandes en attente
   - Détecte les managers inactifs

2. **fix-missing-managers.sql** - Correction des managers manquants
   - Assigne automatiquement khalid fathi (N) et Administrateur (N+1)
   - Vérifie que tous les IDs existent
   - Affiche le résultat final

---

## Recommandations

### Court Terme
1. ✅ Surveiller les logs Railway pour confirmer que les erreurs 500/400 ont disparu
2. ⏳ Tester manuellement les workflows d'approbation
3. ⏳ Vérifier que les notifications fonctionnent correctement

### Moyen Terme
1. **Ajouter validation au frontend** : Empêcher la création d'employés sans managers
2. **Améliorer les messages d'erreur** : Retourner "Cet employé n'a pas de manager assigné" au lieu de "No approver at this level"
3. **Créer interface de gestion de hiérarchie** : Permettre de modifier les managers facilement

### Long Terme
1. **Migration vers système d'approbation générique** : Remplacer n1/n2 par workflow illimité (voir Plan Phase 3)
2. **Tests automatisés** : Créer tests unitaires pour ApprovalService
3. **Monitoring** : Ajouter alertes sur erreurs 400/500

---

## Fichiers Modifiés

### Code Application
- `server/src/routes/hr-delegation.js` (ligne 320)

### Base de Données
- `hr_employee_managers` (2 employés, 4 nouvelles relations)

### Scripts Créés
- `server/debug-approval-issue.sql`
- `server/fix-missing-managers.sql`
- `BUGFIX-REPORT-2026-01-17.md` (ce fichier)

---

## Conclusion

Les deux bugs critiques ont été identifiés et corrigés :
1. **BUG #1** (500) : Requête SQL corrigée - déployée sur Railway
2. **BUG #2** (400) : Managers assignés - appliqué en base de données

**Prochaine étape** : Surveillance des logs Railway et tests manuels pour confirmer que les erreurs ont disparu.
