import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw, X, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface Migration {
  id: string;
  name: string;
  description: string;
  endpoint: string;
}

interface MigrationStatus {
  applied: boolean;
  needsRun: boolean;
  message?: string;
  details?: any;
}

const MIGRATIONS: Migration[] = [
  {
    id: 'migration-047',
    name: 'Migration 047',
    description: 'FIX HORAIRES: Ajoute colonnes jour-spécifiques (monday_start, tuesday_start, etc.) à hr_work_schedules + weekly_hours',
    endpoint: '/migration-047'
  },
  {
    id: 'migration-049',
    name: 'Migration 049',
    description: 'Ajouter colonne requires_clocking à hr_employees (requis pour le pointage)',
    endpoint: '/migration-049'
  },
  {
    id: 'migration-050',
    name: 'Migration 050',
    description: 'Table hr_public_holidays - Gestion jours fériés pour calculs pointage et congés',
    endpoint: '/migration-050'
  },
  {
    id: 'migration-055',
    name: 'Migration 055',
    description: 'Fix critical permissions (system.roles, corps.view_page, professor/student permissions)',
    endpoint: '/migration-055'
  },
  {
    id: 'migration-056',
    name: 'Migration 056',
    description: 'Repopulate all accounting permissions (calculation_sheets, declarations, etc.)',
    endpoint: '/migration-056'
  },
  {
    id: 'migration-058',
    name: 'Migration 058',
    description: 'Synchroniser permissions manquantes (declarations.submit, cities.bulk_delete, corps.duplicate)',
    endpoint: '/migration-058'
  },
  {
    id: 'migration-059',
    name: 'Migration 059',
    description: 'Corriger chevauchements permissions - 20 permissions (fill_data vs edit_metadata, folder vs template, protéger 16 boutons)',
    endpoint: '/migration-059'
  },
  {
    id: 'migration-060',
    name: 'Migration 060',
    description: 'Système de gestion des prospects - 4 tables, 180 pays, 11 permissions, normalisation téléphone internationale',
    endpoint: '/migration-060'
  },
  {
    id: 'migration-061',
    name: 'Migration 061',
    description: 'Boucles de validation RH - tables hr_validation_workflows, hr_validation_workflow_steps, hr_validation_instances, hr_validation_actions',
    endpoint: '/migration-061'
  },
  {
    id: 'migration-projects',
    name: 'Migration Projects',
    description: 'Tables projects et project_actions pour la gestion de projet (Plan d\'Action)',
    endpoint: '/migration-projects'
  },
  {
    id: 'migration-063',
    name: 'Migration 063',
    description: 'Permissions sessions étudiants - training.sessions.add_student et training.sessions.edit_student',
    endpoint: '/migration-063'
  },
  {
    id: 'migration-064',
    name: 'Migration 064',
    description: 'Labels et descriptions en français pour toutes les permissions (affichage dans le tooltip info)',
    endpoint: '/migration-064'
  },
  {
    id: 'migration-065',
    name: 'Migration 065',
    description: 'Permissions professeurs - view_page, create, edit, delete, assign_segments, assign_cities',
    endpoint: '/migration-065'
  },
  {
    id: 'migration-066',
    name: 'Migration 066',
    description: 'Permissions manquantes - hr.employee_portal.*, hr.leaves.approve, system.roles.*, commercialisation.clients.*',
    endpoint: '/migration-066'
  },
  {
    id: 'migration-067',
    name: 'Migration 067',
    description: 'Alignement HR/Sidebar - hr.validation_workflows.*, hr.schedules.*, hr.payroll.*, hr.requests_validation.*',
    endpoint: '/migration-067'
  },
  {
    id: 'migration-068',
    name: 'Migration 068',
    description: 'Auto-création fiches employés pour utilisateurs avec permission hr.employee_portal.clock_in_out',
    endpoint: '/migration-068'
  },
  {
    id: 'migration-069',
    name: 'Migration 069',
    description: 'FIX CRITIQUE: Ajoute colonne clock_time et CHECK constraints pour hr_attendance_records (pointage)',
    endpoint: '/migration-069'
  },
  {
    id: 'migration-070',
    name: 'Migration 070',
    description: 'Structure de permissions complète - Ajoute 45+ permissions manquantes avec labels/descriptions FR (RH, Formation, Comptabilité)',
    endpoint: '/migration-070'
  },
  {
    id: 'migration-071',
    name: 'Migration 071',
    description: 'FIX SÉCURITÉ: Ajoute permission training.sessions.remove_student et protège route DELETE étudiant',
    endpoint: '/migration-071'
  },
  {
    id: 'migration-072',
    name: 'Migration 072',
    description: 'FIX HORAIRES RH: Contrainte horaire actif unique + Calculs pointage avec pauses/tolérances + UI configuration complète',
    endpoint: '/migration-072'
  },
  {
    id: 'migration-073',
    name: 'Migration 073',
    description: 'AUDIT SÉCURITÉ: Ajoute 5 permissions (delete_payment, approve_overtime, reject_overtime, holidays.*) + Protège 10 routes vulnérables',
    endpoint: '/migration-073'
  },
  {
    id: 'migration-074',
    name: 'Migration 074',
    description: 'FIX CRITIQUE GERANT: Assigne TOUTES les permissions au rôle gerant (training.certificate_templates.*, etc.)',
    endpoint: '/migration-074'
  }
];

interface MigrationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrationPanel({ open, onOpenChange }: MigrationPanelProps) {
  const [statuses, setStatuses] = useState<Record<string, MigrationStatus>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkMigrationStatus = async (migration: Migration) => {
    try {
      addLog(`Checking status of ${migration.name}...`);
      const response = await apiClient.get<any>(`${migration.endpoint}/status`);

      setStatuses(prev => ({
        ...prev,
        [migration.id]: {
          applied: !response.status.migrationNeeded,
          needsRun: response.status.migrationNeeded,
          message: response.message,
          details: response.status
        }
      }));

      addLog(`✓ ${migration.name}: ${response.message}`);
    } catch (error: any) {
      addLog(`✗ Error checking ${migration.name}: ${error.message}`);
      setStatuses(prev => ({
        ...prev,
        [migration.id]: {
          applied: false,
          needsRun: true,
          message: `Error: ${error.message}`
        }
      }));
    }
  };

  const runMigration = async (migration: Migration) => {
    setLoading(prev => ({ ...prev, [migration.id]: true }));

    try {
      addLog(`Running ${migration.name}...`);
      const response = await apiClient.post<any>(`${migration.endpoint}/run`);

      addLog(`✓ ${migration.name} completed successfully!`);
      addLog(`Details: ${JSON.stringify(response.details, null, 2)}`);

      // Refresh status
      await checkMigrationStatus(migration);
    } catch (error: any) {
      addLog(`✗ ${migration.name} failed: ${error.message}`);
      if (error.stack) {
        addLog(`Stack: ${error.stack}`);
      }
    } finally {
      setLoading(prev => ({ ...prev, [migration.id]: false }));
    }
  };

  const checkAllStatuses = async () => {
    setLogs([]);
    addLog('Checking all migration statuses...');

    for (const migration of MIGRATIONS) {
      await checkMigrationStatus(migration);
    }

    addLog('Status check complete!');
  };

  const runDebugPermissions = async () => {
    try {
      addLog('Running permission diagnostics...');
      const response = await apiClient.get<any>('/auth/debug-permissions');

      setDebugInfo(response.debug);
      addLog('✓ Debug complete!');
      addLog(`User: ${response.debug.user?.username} (${response.debug.user?.role})`);
      addLog(`Permissions loaded: ${response.debug.permissionsCount}`);
      addLog(`Has calculation_sheets permission: ${response.debug.summary?.hasCalculationSheetsPermission}`);
      addLog(`Recommendation: ${response.debug.summary?.recommendation}`);
    } catch (error: any) {
      addLog(`✗ Debug failed: ${error.message}`);
    }
  };

  const runCleanupOrphans = async () => {
    setLoading(prev => ({ ...prev, 'cleanup-orphans': true }));

    try {
      addLog('🧹 Starting automatic cleanup of duplicate corps...');
      const response = await apiClient.post<any>('/corps-formation/cleanup-all-orphans');

      if (response.success) {
        addLog('✓ Cleanup completed successfully!');
        addLog(`📊 Summary:`);
        addLog(`  - Duplicates found: ${response.report.total_duplicates_found}`);
        addLog(`  - Corps cleaned: ${response.report.corps_cleaned.length}`);
        addLog(`  - Corps deleted: ${response.report.corps_deleted.length}`);
        addLog(`  - Errors: ${response.report.errors.length}`);

        if (response.report.corps_deleted.length > 0) {
          addLog(`\n🗑️ Deleted corps:`);
          response.report.corps_deleted.forEach((corps: any) => {
            addLog(`  - ${corps.corps_name} (${corps.formations_detached} formations detached)`);
          });
        }

        if (response.report.errors.length > 0) {
          addLog(`\n⚠️ Errors:`);
          response.report.errors.forEach((error: any) => {
            addLog(`  - ${error.corps_name}: ${error.error}`);
          });
        }
      } else {
        addLog(`✗ Cleanup failed: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      addLog(`✗ Cleanup failed: ${error.message}`);
      if (error.stack) {
        addLog(`Stack: ${error.stack}`);
      }
    } finally {
      setLoading(prev => ({ ...prev, 'cleanup-orphans': false }));
    }
  };

  const getStatusIcon = (status: MigrationStatus | undefined) => {
    if (!status) return <AlertCircle className="h-5 w-5 text-gray-400" />;
    if (status.applied) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Database Migrations & Diagnostics
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={checkAllStatuses}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Check All Status
            </button>
            <button
              onClick={runDebugPermissions}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            >
              <AlertCircle className="h-4 w-4" />
              Debug Permissions
            </button>
            <button
              onClick={runCleanupOrphans}
              disabled={loading['cleanup-orphans']}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading['cleanup-orphans'] ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Cleanup Duplicate Corps
            </button>
          </div>

          {/* Migrations List */}
          <div className="grid gap-3">
            {MIGRATIONS.map(migration => {
              const status = statuses[migration.id];
              const isLoading = loading[migration.id];

              return (
                <div key={migration.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(status)}
                      <div className="flex-1">
                        <h3 className="font-semibold">{migration.name}</h3>
                        <p className="text-sm text-gray-600">
                          {migration.description}
                        </p>
                        {status && (
                          <p className="text-sm mt-1">
                            <span className={status.applied ? 'text-green-600' : 'text-orange-600'}>
                              {status.message}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => checkMigrationStatus(migration)}
                        disabled={isLoading}
                        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => runMigration(migration)}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                          status?.needsRun
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'border border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50`}
                      >
                        {isLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Run
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="border rounded-lg p-4 bg-slate-50">
              <h3 className="font-semibold mb-2">Debug Summary</h3>
              <div className="text-sm space-y-1">
                <p><strong>User:</strong> {debugInfo.user?.username} ({debugInfo.user?.role})</p>
                <p><strong>Role ID:</strong> {debugInfo.user?.role_id || 'NULL ⚠️'}</p>
                <p><strong>Permissions Count:</strong> {debugInfo.permissionsCount}</p>
                <p><strong>Has calculation_sheets permission:</strong> {debugInfo.summary?.hasCalculationSheetsPermission ? '✓ Yes' : '✗ No'}</p>
                <p><strong>Is Admin:</strong> {debugInfo.summary?.isAdmin ? '✓ Yes' : '✗ No'}</p>
                <p><strong>Should Bypass Check:</strong> {debugInfo.summary?.shouldBypassPermissionCheck ? '✓ Yes' : '✗ No'}</p>
                {debugInfo.summary?.recommendation && (
                  <p className="text-orange-600 mt-2"><strong>Recommendation:</strong> {debugInfo.summary.recommendation}</p>
                )}
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Logs</h3>
            <div className="h-64 w-full rounded border bg-slate-50 p-3 overflow-auto">
              <div className="font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <p className="text-gray-500">No logs yet. Click "Check All Status" to begin.</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap break-words">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
