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
