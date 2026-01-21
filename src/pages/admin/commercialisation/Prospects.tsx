// @ts-nocheck
/**
 * Page Gestion des Prospects
 * Liste, filtres, stats, actions (appel, suppression, import, export)
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  Phone,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  X,
  Calendar,
  Footprints,
  Cloud,
  CloudOff,
  AlertCircle,
  Key,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Checkbox } from '@/components/ui/checkbox';
import { useProspects, useDeleteProspect } from '@/hooks/useProspects';
import { useSegments } from '@/hooks/useSegments';
import { useCities } from '@/hooks/useCities';
import { usePermission } from '@/hooks/usePermission';
import type { ProspectFilters } from '@/lib/api/prospects';
import { QuickAddProspectModal } from '@/components/prospects/QuickAddProspectModal';
import { ImportProspectsModal } from '@/components/prospects/ImportProspectsModal';
import { CallProspectModal } from '@/components/prospects/CallProspectModal';
import { DeclareVisitModal } from '@/components/prospects/DeclareVisitModal';
import { EcartDetailsModal } from '@/components/prospects/EcartDetailsModal';
import { prospectsApi } from '@/lib/api/prospects';
import { useQuery } from '@tanstack/react-query';

// Fonction pour déterminer le style du RDV selon la date
const getRdvStyle = (dateRdv: string | null) => {
  if (!dateRdv) return null;

  const rdv = new Date(dateRdv);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rdvDay = new Date(rdv.getFullYear(), rdv.getMonth(), rdv.getDate());

  const diffMs = rdvDay.getTime() - today.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Jour J (aujourd'hui)
  if (diffDays === 0) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      label: "Aujourd'hui"
    };
  }

  // Demain (< 48h)
  if (diffDays > 0 && diffDays <= 2) {
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      label: diffDays === 1 ? 'Demain' : 'Dans 2 jours'
    };
  }

  // RDV futur (> 48h)
  if (diffDays > 2) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      label: `Dans ${Math.ceil(diffDays)} jours`
    };
  }

  // Expiré < 24h (hier)
  if (diffDays >= -1 && diffDays < 0) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      label: 'Expiré hier'
    };
  }

  // Expiré > 24h
  return {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    label: `Expiré (${Math.abs(Math.ceil(diffDays))}j)`
  };
};

export default function Prospects() {
  const { commercialisation } = usePermission();
  const queryClient = useQueryClient();

  // Filtres
  const [filters, setFilters] = useState<ProspectFilters>({
    page: 1,
    limit: 50,
  });

  const [search, setSearch] = useState('');

  // Données
  const { data, isLoading, error, refetch } = useProspects(filters);
  const { data: segments = [] } = useSegments();
  const { data: cities = [] } = useCities(filters.segment_id);
  const deleteProspect = useDeleteProspect();

  // Modals states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showVisitsModal, setShowVisitsModal] = useState(false);
  const [selectedProspectForVisits, setSelectedProspectForVisits] = useState<any>(null);
  const [showEcartModal, setShowEcartModal] = useState(false);

  // Query pour les détails de l'écart
  const { data: ecartDetails, isLoading: ecartLoading, error: ecartError } = useQuery({
    queryKey: ['prospects-ecart', filters.segment_id, filters.ville_id, filters.date_from, filters.date_to],
    queryFn: () => prospectsApi.getEcartDetails({
      segment_id: filters.segment_id,
      ville_id: filters.ville_id,
      date_from: filters.date_from,
      date_to: filters.date_to
    }),
    enabled: showEcartModal,
    retry: 1,
  });

  // Modal de réautorisation Google
  const [reauthorizeModalOpen, setReauthorizeModalOpen] = useState(false);
  const [reauthorizeUrl, setReauthorizeUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [selectedProspectForReauth, setSelectedProspectForReauth] = useState<any>(null);

  // Selection multiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Mutation pour obtenir l'URL de réautorisation
  const getReauthorizeUrlMutation = useMutation({
    mutationFn: async (cityId: string) => {
      const response = await apiClient.get(`/google-oauth/reauthorize-url/${cityId}`);
      return response as { authUrl: string; cityName: string; message: string };
    },
    onSuccess: (data) => {
      setReauthorizeUrl(data.authUrl);
      setReauthorizeModalOpen(true);
    },
    onError: (error: any) => {
      console.error('Erreur réautorisation:', error);
      alert(error.message || 'Erreur lors de la réautorisation');
    }
  });

  // Mutation pour échanger le code contre un nouveau token
  const exchangeCodeMutation = useMutation({
    mutationFn: async ({ cityId, code }: { cityId: string; code: string }) => {
      const response = await apiClient.post(`/google-oauth/exchange-code/${cityId}`, { code });
      return response as { success: boolean; message: string };
    },
    onSuccess: () => {
      setReauthorizeModalOpen(false);
      setAuthCode('');
      setReauthorizeUrl(null);
      setSelectedProspectForReauth(null);
      // Rafraîchir la liste des prospects
      refetch();
      alert('Token Google mis à jour ! Les prospects seront re-synchronisés automatiquement.');
    },
    onError: (error: any) => {
      console.error('Erreur échange code:', error);
      alert(error.message || 'Code invalide ou expiré');
    }
  });

  // Handlers pour la réautorisation
  const handleOpenReauthModal = (prospect: any) => {
    setSelectedProspectForReauth(prospect);
    getReauthorizeUrlMutation.mutate(prospect.ville_id);
  };

  const handleOpenAuthUrl = () => {
    if (reauthorizeUrl) {
      window.open(reauthorizeUrl, '_blank');
    }
  };

  const handleSubmitAuthCode = () => {
    if (selectedProspectForReauth && authCode.trim()) {
      exchangeCodeMutation.mutate({ cityId: selectedProspectForReauth.ville_id, code: authCode.trim() });
    }
  };

  const prospects = data?.prospects || [];
  const stats = data?.stats || {
    total: 0,
    non_contactes: 0,
    avec_rdv: 0,
    sans_rdv: 0,
    inscrits_prospect: 0,
    inscrits_session: 0,
  };
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0 };

  // Handlers
  const handleSearch = () => {
    setFilters({ ...filters, search, page: 1 });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prospect ?')) return;

    try {
      await deleteProspect.mutateAsync(id);
      alert('Prospect supprimé avec succès');
    } catch (error: any) {
      console.error('Error deleting prospect:', error);
      alert(`Erreur: ${error?.message || 'Impossible de supprimer le prospect'}`);
    }
  };

  const handleCallProspect = (id: string) => {
    setSelectedProspectId(id);
    setShowCallModal(true);
  };

  const handleDeclareVisit = (prospect: any) => {
    setSelectedProspectForVisits({
      id: prospect.id,
      phone_international: prospect.phone_international,
      nom: prospect.nom,
      prenom: prospect.prenom,
      segment_id: prospect.segment_id,
      segment_name: prospect.segment_name,
      ville_id: prospect.ville_id,
      ville_name: prospect.ville_name,
      date_rdv: prospect.date_rdv,
      statut_contact: prospect.statut_contact,
    });
    setShowVisitsModal(true);
  };

  const handleExport = () => {
    // TODO: Implement export
    alert('Export CSV en cours de développement');
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.size} prospect(s) ?`)) return;

    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await deleteProspect.mutateAsync(id);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    alert(`${successCount} prospect(s) supprimé(s), ${errorCount} erreur(s)`);
    setSelectedIds(new Set());
    refetch();
  };

  const isAllSelected = prospects.length > 0 && selectedIds.size === prospects.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < prospects.length;

  // Render stats cards
  const ecart = stats.inscrits_session - stats.inscrits_prospect;
  const ecartColor = ecart > 0 ? 'text-green-600' : ecart < 0 ? 'text-red-600' : 'text-gray-600';
  const ecartSign = ecart > 0 ? '+' : '';

  const renderStatsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Non contactés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.non_contactes}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avec RDV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.avec_rdv}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sans RDV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600">{stats.sans_rdv}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inscrit Prospect</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.inscrits_prospect}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inscrit Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats.inscrits_session}</div>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all"
        onClick={() => setShowEcartModal(true)}
        title="Cliquer pour voir les détails de l'écart"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Écart</CardTitle>
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            Détails
          </Badge>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${ecartColor}`}>{ecartSign}{ecart}</div>
          <p className="text-xs text-muted-foreground mt-1">Session - Prospect</p>
        </CardContent>
      </Card>
    </div>
  );

  // Render filters
  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Filtres</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-7">
          <div>
            <label className="text-sm font-medium mb-2 block">Segment</label>
            <Select
              value={filters.segment_id || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, segment_id: value === 'all' ? undefined : value, ville_id: undefined, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les segments</SelectItem>
                {segments.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Ville</label>
            <Select
              value={filters.ville_id || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, ville_id: value === 'all' ? undefined : value, page: 1 })
              }
              disabled={!filters.segment_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les villes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Statut</label>
            <Select
              value={filters.statut_contact || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, statut_contact: value === 'all' ? undefined : value, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="non contacté">Non contacté</SelectItem>
                <SelectItem value="contacté avec rdv">Contacté avec RDV</SelectItem>
                <SelectItem value="contacté sans rdv">Contacté sans RDV</SelectItem>
                <SelectItem value="contacté sans reponse">Contacté sans réponse</SelectItem>
                <SelectItem value="boîte vocale">Boîte vocale</SelectItem>
                <SelectItem value="non intéressé">Non intéressé</SelectItem>
                <SelectItem value="déjà inscrit">Déjà inscrit</SelectItem>
                <SelectItem value="à recontacter">À recontacter</SelectItem>
                <SelectItem value="inscrit">Inscrit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date de début</label>
            <Input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) =>
                setFilters({ ...filters, date_from: e.target.value || undefined, page: 1 })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date de fin</label>
            <Input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) =>
                setFilters({ ...filters, date_to: e.target.value || undefined, page: 1 })
              }
              className="w-full"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-2 block">Recherche</label>
            <div className="flex gap-2">
              <Input
                placeholder="Téléphone, nom, prénom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Get badge variant for decision
  const getDecisionBadge = (decision?: string) => {
    switch (decision) {
      case 'laisser':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Laisser</Badge>;
      case 'supprimer':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Supprimer</Badge>;
      case 'a_revoir_manuelle':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">À revoir</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            Erreur lors du chargement des prospects: {error instanceof Error ? error.message : 'Erreur inconnue'}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Prospects</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos prospects avec affectation automatique et qualification
            </p>
          </div>
          <div className="flex gap-2">
            {commercialisation.canImportProspects && (
              <Button onClick={() => setShowImportModal(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            )}
            {commercialisation.canExportProspects && (
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {commercialisation.canCreateProspect && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter prospect
              </Button>
            )}
            <Button onClick={() => refetch()} variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        {renderStatsCards()}

        {/* Filters */}
        {renderFilters()}

        {/* Selection Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                {selectedIds.size} prospect(s) sélectionné(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {commercialisation.canDeleteProspect && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer la sélection
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Ajouté par</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Date d'insertion</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>RDV</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Durée d'appel</TableHead>
                  <TableHead>Sync Google</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : prospects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      Aucun prospect trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  prospects.map((prospect) => (
                    <TableRow key={prospect.id} className={selectedIds.has(prospect.id) ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(prospect.id)}
                          onCheckedChange={() => handleSelectOne(prospect.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{prospect.segment_name || '-'}</TableCell>
                      <TableCell className="text-sm">{prospect.created_by_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{prospect.id}</TableCell>
                      <TableCell className="text-sm">{prospect.nom || '-'}</TableCell>
                      <TableCell className="text-sm">{prospect.prenom || '-'}</TableCell>
                      <TableCell className="font-mono">{prospect.phone_international}</TableCell>
                      <TableCell>
                        {prospect.ville_name || '-'}
                        {prospect.historique_villes && (
                          <span className="text-xs text-gray-500 block">
                            (ex: {prospect.historique_villes})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.assistantes_ville || (
                          <span className="text-orange-600 font-medium">À assigner</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.date_injection ? new Date(prospect.date_injection).toLocaleDateString('fr-FR') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{prospect.statut_contact}</Badge>
                      </TableCell>
                      <TableCell>
                        {prospect.date_rdv ? (
                          <div className="space-y-1">
                            {(() => {
                              const style = getRdvStyle(prospect.date_rdv);
                              const rdvDate = new Date(prospect.date_rdv);
                              return (
                                <div className={`px-2 py-1 rounded border ${style?.bg} ${style?.text} ${style?.border}`}>
                                  <div className="flex items-center gap-1 text-xs font-medium">
                                    <Calendar className="h-3 w-3" />
                                    {rdvDate.toLocaleDateString('fr-FR')}
                                  </div>
                                  <div className="text-xs">
                                    {rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="text-xs font-semibold">{style?.label}</div>
                                </div>
                              );
                            })()}
                            {prospect.historique_rdv && (
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Précédents:</span>
                                <span className="block">{prospect.historique_rdv}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{prospect.country}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.total_call_duration && prospect.total_call_duration > 0
                          ? `${Math.floor(prospect.total_call_duration / 60)}m ${prospect.total_call_duration % 60}s`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {prospect.google_sync_status === 'synced' ? (
                          <div className="flex items-center gap-1 text-green-600" title="Synchronisé avec Google Contacts">
                            <Cloud className="h-4 w-4" />
                            <span className="text-xs">Sync</span>
                          </div>
                        ) : prospect.google_sync_status === 'failed' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReauthModal(prospect)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            title={`${prospect.google_sync_error || 'Échec de synchronisation'} - Cliquez pour réautoriser`}
                          >
                            <Key className="h-4 w-4" />
                            <span className="text-xs font-medium">Obtenir le code</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400" title="En attente de synchronisation">
                            <CloudOff className="h-4 w-4" />
                            <span className="text-xs">En attente</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {commercialisation.canCallProspect &&
                            prospect.statut_contact !== 'inscrit' && (
                              <Button
                                size="sm"
                                onClick={() => handleCallProspect(prospect.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                Appeler
                              </Button>
                            )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclareVisit(prospect)}
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            title="Déclarer une visite"
                          >
                            <Footprints className="h-3 w-3" />
                          </Button>
                          {commercialisation.canDeleteProspect && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(prospect.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Affichage de {prospects.length} sur {pagination.total} prospects
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
            >
              Précédent
            </Button>
            <div className="flex items-center px-3 text-sm">
              Page {pagination.page} sur {Math.ceil(pagination.total / pagination.limit) || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
            >
              Suivant
            </Button>
          </div>
        </div>

        {/* Modals */}
        <QuickAddProspectModal open={showAddModal} onClose={() => setShowAddModal(false)} />
        <ImportProspectsModal open={showImportModal} onClose={() => setShowImportModal(false)} />
        <CallProspectModal open={showCallModal} onClose={() => setShowCallModal(false)} prospectId={selectedProspectId} />
        <DeclareVisitModal
          open={showVisitsModal}
          onClose={() => {
            setShowVisitsModal(false);
            setSelectedProspectForVisits(null);
            refetch(); // Refresh prospects list
          }}
          prospect={selectedProspectForVisits}
        />

        {/* Modal de réautorisation Google */}
        <Dialog open={reauthorizeModalOpen} onOpenChange={setReauthorizeModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-orange-600" />
                Réautoriser Google Contacts
              </DialogTitle>
              <DialogDescription>
                {selectedProspectForReauth?.ville_name} - Suivez les étapes ci-dessous pour renouveler le token Google.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Étape 1: Ouvrir l'URL */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">1</span>
                  <span className="font-medium">Ouvrir la page d'autorisation Google</span>
                </div>
                <p className="text-sm text-gray-500 ml-8">
                  Cliquez sur le bouton ci-dessous pour ouvrir Google dans un nouvel onglet et autoriser l'accès.
                </p>
                <div className="ml-8">
                  <Button
                    onClick={handleOpenAuthUrl}
                    disabled={!reauthorizeUrl}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ouvrir Google (nouvel onglet)
                  </Button>
                </div>
              </div>

              {/* Étape 2: Copier le code */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">2</span>
                  <span className="font-medium">Copier le code affiché</span>
                </div>
                <p className="text-sm text-gray-500 ml-8">
                  Après avoir autorisé l'accès, Google affichera un code. Copiez-le et collez-le ci-dessous.
                </p>
              </div>

              {/* Étape 3: Coller le code */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">3</span>
                  <span className="font-medium">Coller le code d'autorisation</span>
                </div>
                <div className="ml-8">
                  <input
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="4/0A... (code de Google)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Message d'erreur */}
              {exchangeCodeMutation.isError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {(exchangeCodeMutation.error as any)?.message || 'Erreur lors de l\'échange du code'}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReauthorizeModalOpen(false);
                  setAuthCode('');
                  setReauthorizeUrl(null);
                  setSelectedProspectForReauth(null);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmitAuthCode}
                disabled={!authCode.trim() || exchangeCodeMutation.isPending}
              >
                {exchangeCodeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Validation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Valider le code
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Détails de l'Écart */}
        <EcartDetailsModal
          open={showEcartModal}
          onClose={() => setShowEcartModal(false)}
          data={ecartDetails || null}
          isLoading={ecartLoading}
          error={ecartError ? (ecartError as Error).message : null}
        />
      </div>
    </AppLayout>
  );
}
