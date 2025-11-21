import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw } from 'lucide-react';
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

  const getStatusIcon = (status: MigrationStatus | undefined) => {
    if (!status) return <AlertCircle className="h-5 w-5 text-gray-400" />;
    if (status.applied) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Database Migrations & Diagnostics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={checkAllStatuses} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check All Status
            </Button>
            <Button onClick={runDebugPermissions} variant="outline" size="sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              Debug Permissions
            </Button>
          </div>

          {/* Migrations List */}
          <div className="grid gap-3">
            {MIGRATIONS.map(migration => {
              const status = statuses[migration.id];
              const isLoading = loading[migration.id];

              return (
                <Card key={migration.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(status)}
                      <div className="flex-1">
                        <h3 className="font-semibold">{migration.name}</h3>
                        <p className="text-sm text-muted-foreground">
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
                      <Button
                        onClick={() => checkMigrationStatus(migration)}
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        onClick={() => runMigration(migration)}
                        variant={status?.needsRun ? 'default' : 'outline'}
                        size="sm"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Run
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <Card className="p-4 bg-slate-50">
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
            </Card>
          )}

          {/* Logs */}
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Logs</h3>
            <ScrollArea className="h-64 w-full rounded border bg-slate-50 p-3">
              <div className="font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">No logs yet. Click "Check All Status" to begin.</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap break-words">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
