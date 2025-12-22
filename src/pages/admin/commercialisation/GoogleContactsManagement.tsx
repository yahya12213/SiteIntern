// @ts-nocheck
/**
 * Gestion Google Contacts
 * Configuration des tokens Google par ville pour la synchronisation automatique des prospects
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Play,
  Users,
  Phone,
  Search,
  Filter
} from 'lucide-react';

interface CityGoogleStats {
  id: string;
  name: string;
  code: string;
  segment_name: string;
  google_sync_enabled: boolean;
  total_prospects: number;
  synced: number;
  pending: number;
  failed: number;
}

interface GoogleConfig {
  city: {
    id: string;
    name: string;
    google_sync_enabled: boolean;
  };
  stats: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    skipped: number;
  };
  connectionStatus: {
    success: boolean;
    message: string;
    email?: string;
  } | null;
  hasToken: boolean;
}

export default function GoogleContactsManagement() {
  const queryClient = useQueryClient();
  const [selectedCity, setSelectedCity] = useState<CityGoogleStats | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Récupérer les stats Google de toutes les villes
  const { data: citiesStats, isLoading, refetch } = useQuery<CityGoogleStats[]>({
    queryKey: ['google-contacts-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/cities/google/stats');
      return response as CityGoogleStats[];
    }
  });

  // Récupérer la config détaillée d'une ville
  const { data: cityConfig, isLoading: isLoadingConfig } = useQuery<GoogleConfig>({
    queryKey: ['google-config', selectedCity?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/cities/${selectedCity?.id}/google-config`);
      return response as GoogleConfig;
    },
    enabled: !!selectedCity && configModalOpen
  });

  // Mutation pour mettre à jour la config
  const updateConfigMutation = useMutation({
    mutationFn: async ({ cityId, token, enabled }: { cityId: string; token?: string; enabled: boolean }) => {
      const body: any = { google_sync_enabled: enabled };
      if (token) {
        body.google_token = token;
      }
      return apiClient.put(`/cities/${cityId}/google-config`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-contacts-stats'] });
      queryClient.invalidateQueries({ queryKey: ['google-config', selectedCity?.id] });
      setConfigModalOpen(false);
      setTokenInput('');
    }
  });

  // Mutation pour tester la connexion
  const testConnectionMutation = useMutation({
    mutationFn: async (cityId: string) => {
      return apiClient.post(`/cities/${cityId}/google-test`);
    }
  });

  // Mutation pour synchroniser les prospects pending
  const syncMutation = useMutation({
    mutationFn: async (cityId: string) => {
      return apiClient.post(`/cities/${cityId}/google-sync`, { limit: 100 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-contacts-stats'] });
    }
  });

  // Ouvrir le modal de configuration
  const openConfigModal = (city: CityGoogleStats) => {
    setSelectedCity(city);
    setSyncEnabled(city.google_sync_enabled);
    setTokenInput('');
    setConfigModalOpen(true);
  };

  // Sauvegarder la configuration
  const handleSaveConfig = () => {
    if (!selectedCity) return;
    updateConfigMutation.mutate({
      cityId: selectedCity.id,
      token: tokenInput || undefined,
      enabled: syncEnabled
    });
  };

  // Filtrer les villes
  const filteredCities = citiesStats?.filter(city => {
    const matchesSearch = city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.segment_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSegment = filterSegment === 'all' || city.segment_name === filterSegment;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && city.google_sync_enabled) ||
      (filterStatus === 'inactive' && !city.google_sync_enabled);
    return matchesSearch && matchesSegment && matchesStatus;
  });

  // Obtenir les segments uniques
  const segments = [...new Set(citiesStats?.map(c => c.segment_name).filter(Boolean))];

  // Calculer les totaux
  const totals = citiesStats?.reduce((acc, city) => ({
    total: acc.total + Number(city.total_prospects || 0),
    synced: acc.synced + Number(city.synced || 0),
    pending: acc.pending + Number(city.pending || 0),
    failed: acc.failed + Number(city.failed || 0),
    enabled: acc.enabled + (city.google_sync_enabled ? 1 : 0)
  }), { total: 0, synced: 0, pending: 0, failed: 0, enabled: 0 });

  return (
    <AppLayout title="Gestion G-Contacte" subtitle="Configuration de la synchronisation Google Contacts par ville">
      <div className="space-y-6">
        {/* Stats globales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Prospects</p>
                <p className="text-xl font-semibold">{totals?.total?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Synchronisés</p>
                <p className="text-xl font-semibold text-green-600">{totals?.synced?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">En attente</p>
                <p className="text-xl font-semibold text-yellow-600">{totals?.pending?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Échoués</p>
                <p className="text-xl font-semibold text-red-600">{totals?.failed?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Cloud className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Villes Actives</p>
                <p className="text-xl font-semibold text-purple-600">{totals?.enabled || 0} / {citiesStats?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et actions */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <select
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">Tous les segments</option>
              {segments.map(seg => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              title="Filtrer par statut"
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </Button>
        </div>

        {/* Liste des villes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Ville</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Segment</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Statut</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Synced</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Pending</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Failed</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Chargement...
                    </td>
                  </tr>
                ) : filteredCities?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      Aucune ville trouvée
                    </td>
                  </tr>
                ) : (
                  filteredCities?.map((city) => (
                    <tr key={city.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{city.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{city.code || city.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{city.segment_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {city.google_sync_enabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                            <Cloud className="h-3 w-3" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            <CloudOff className="h-3 w-3" />
                            Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium">{Number(city.total_prospects || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-green-600">{Number(city.synced || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-yellow-600">{Number(city.pending || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-red-600">{Number(city.failed || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openConfigModal(city)}
                            className="flex items-center gap-1"
                          >
                            <Settings className="h-3 w-3" />
                            Config
                          </Button>
                          {city.google_sync_enabled && Number(city.pending) > 0 && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => syncMutation.mutate(city.id)}
                              disabled={syncMutation.isPending}
                              className="flex items-center gap-1"
                            >
                              {syncMutation.isPending ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                              Sync
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Légende */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h3 className="font-medium text-blue-900 mb-2">Comment configurer Google Contacts ?</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Cliquez sur <strong>Config</strong> pour une ville</li>
            <li>Collez le contenu du fichier <code className="bg-blue-100 px-1 rounded">token.json</code> correspondant</li>
            <li>Activez la synchronisation</li>
            <li>Testez la connexion pour vérifier que tout fonctionne</li>
            <li>Les nouveaux prospects seront automatiquement synchronisés</li>
          </ol>
        </div>
      </div>

      {/* Modal de configuration */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration Google - {selectedCity?.name} <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">({selectedCity?.code || selectedCity?.id})</span>
            </DialogTitle>
            <DialogDescription>
              Configurez le token Google OAuth pour synchroniser les prospects vers Google Contacts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Statut actuel */}
            {cityConfig && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Token configuré</span>
                  {cityConfig.hasToken ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Oui
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 text-sm">
                      <XCircle className="h-4 w-4" />
                      Non
                    </span>
                  )}
                </div>

                {cityConfig.connectionStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Connexion</span>
                    {cityConfig.connectionStatus.success ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        {cityConfig.connectionStatus.email || cityConfig.connectionStatus.message}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="h-4 w-4" />
                        {cityConfig.connectionStatus.message}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{cityConfig.stats?.total || 0}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600">{cityConfig.stats?.synced || 0}</p>
                    <p className="text-xs text-gray-500">Synced</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-yellow-600">{cityConfig.stats?.pending || 0}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-red-600">{cityConfig.stats?.failed || 0}</p>
                    <p className="text-xs text-gray-500">Failed</p>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle activation */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Synchronisation activée</p>
                <p className="text-sm text-gray-500">Les nouveaux prospects seront automatiquement synchronisés</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => setSyncEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Input token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Google OAuth (contenu de token.json)
              </label>
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder='{"token": "ya29...", "refresh_token": "1//...", "client_id": "...", "client_secret": "..."}'
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <p className="mt-1 text-xs text-gray-500">
                Collez le contenu JSON complet du fichier token.json. Le token doit contenir refresh_token et client_id.
              </p>
            </div>

            {/* Bouton test */}
            {cityConfig?.hasToken && (
              <Button
                variant="outline"
                onClick={() => testConnectionMutation.mutate(selectedCity!.id)}
                disabled={testConnectionMutation.isPending}
                className="w-full"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Tester la connexion
                  </>
                )}
              </Button>
            )}

            {/* Résultat du test */}
            {testConnectionMutation.data && (
              <div className={`p-3 rounded-lg ${testConnectionMutation.data.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testConnectionMutation.data.success ? (
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Connexion réussie: {testConnectionMutation.data.email || testConnectionMutation.data.message}
                  </p>
                ) : (
                  <p className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Erreur: {testConnectionMutation.data.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
            >
              {updateConfigMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
