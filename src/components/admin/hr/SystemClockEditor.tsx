/**
 * SystemClockEditor Component
 * Allows admin to configure a custom system clock for attendance
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clock, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

interface SystemClockConfig {
  enabled: boolean;
  custom_datetime: string | null;
  server_ref_datetime: string | null;
  current_server_time: string;
  current_system_time?: Date;
  offset_minutes?: number;
  updated_at: string | null;
  updated_by: string | null;
}

export default function SystemClockEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  // Fetch current system clock config
  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ['system-clock-config'],
    queryFn: async () => {
      const response = await apiClient.get('/hr/settings/system-clock');
      return (response as any).data as SystemClockConfig;
    },
    refetchInterval: 5000, // Refresh every 5 seconds to show live time
  });

  // Initialize form values when config is loaded
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      if (config.current_system_time) {
        const dt = new Date(config.current_system_time);
        setCustomDate(dt.toISOString().split('T')[0]);
        setCustomTime(dt.toTimeString().slice(0, 5));
      } else if (config.custom_datetime) {
        const dt = new Date(config.custom_datetime);
        setCustomDate(dt.toISOString().split('T')[0]);
        setCustomTime(dt.toTimeString().slice(0, 5));
      } else {
        // Default to current server time
        const serverTime = new Date(config.current_server_time);
        setCustomDate(serverTime.toISOString().split('T')[0]);
        setCustomTime(serverTime.toTimeString().slice(0, 5));
      }
    }
  }, [config]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { enabled: boolean; custom_datetime: string | null }) => {
      const response = await apiClient.put('/hr/settings/system-clock', data);
      return response;
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['system-clock-config'] });
      toast({
        title: 'Configuration mise a jour',
        description: response.message || 'L\'horloge systeme a ete mise a jour.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur lors de la mise a jour',
        variant: 'destructive',
      });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/hr/settings/system-clock/reset');
      return response;
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['system-clock-config'] });
      setEnabled(false);
      toast({
        title: 'Horloge reinitialisee',
        description: response.message || 'L\'horloge utilise maintenant l\'heure serveur.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur lors de la reinitialisation',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (enabled && (!customDate || !customTime)) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir la date et l\'heure',
        variant: 'destructive',
      });
      return;
    }

    const customDatetime = enabled ? `${customDate}T${customTime}:00` : null;
    updateMutation.mutate({ enabled, custom_datetime: customDatetime });
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  const formatTime = (dateString: string | Date | undefined) => {
    if (!dateString) return '--:--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '--/--/----';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatOffset = (minutes: number | undefined) => {
    if (minutes === undefined) return '';
    const sign = minutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `${sign}${hours}h${mins.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <CardTitle>Horloge Systeme</CardTitle>
          </div>
          {config?.enabled && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Horloge personnalisee active
            </Badge>
          )}
          {!config?.enabled && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Heure serveur
            </Badge>
          )}
        </div>
        <CardDescription>
          Configurer une horloge independante du serveur pour le pointage
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Time Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="text-sm text-gray-500 mb-1">Heure serveur</div>
            <div className="text-2xl font-mono font-bold text-gray-700">
              {formatTime(config?.current_server_time)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatDate(config?.current_server_time)}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${config?.enabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-500 mb-1">
              Heure systeme (pointage)
              {config?.offset_minutes !== undefined && config.enabled && (
                <span className="ml-2 text-blue-600 font-medium">
                  {formatOffset(config.offset_minutes)}
                </span>
              )}
            </div>
            <div className={`text-2xl font-mono font-bold ${config?.enabled ? 'text-blue-700' : 'text-gray-700'}`}>
              {config?.enabled && config?.current_system_time
                ? formatTime(config.current_system_time)
                : formatTime(config?.current_server_time)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {config?.enabled && config?.current_system_time
                ? formatDate(config.current_system_time)
                : formatDate(config?.current_server_time)}
            </div>
          </div>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">Activer l'horloge personnalisee</div>
            <div className="text-sm text-gray-500">
              Les pointages utiliseront cette heure au lieu de l'heure serveur
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Custom DateTime Inputs */}
        {enabled && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-medium text-blue-800">
              Definir la date et l'heure du systeme
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-date" className="text-blue-700">Date</Label>
                <Input
                  id="custom-date"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-time" className="text-blue-700">Heure</Label>
                <Input
                  id="custom-time"
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            <p className="text-xs text-blue-600">
              L'horloge avancera a partir de cette date/heure en temps reel
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1"
          >
            {updateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Appliquer
          </Button>
          {config?.enabled && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reinitialiser
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Info */}
        {config?.updated_at && (
          <div className="text-xs text-gray-500 text-center">
            Derniere modification: {new Date(config.updated_at).toLocaleString('fr-FR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
