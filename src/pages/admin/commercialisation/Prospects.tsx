// @ts-nocheck
/**
 * Page Gestion des Prospects
 * Liste, filtres, stats, actions (appel, suppression, import, export)
 */

import { useState } from 'react';
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
} from 'lucide-react';
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

  // Selection multiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const prospects = data?.prospects || [];
  const stats = data?.stats || {
    total: 0,
    non_contactes: 0,
    avec_rdv: 0,
    sans_rdv: 0,
    inscrits: 0,
    a_supprimer: 0,
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
  const renderStatsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
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
          <CardTitle className="text-sm font-medium">Inscrits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.inscrits}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">À supprimer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.a_supprimer}</div>
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
        <div className="grid gap-4 md:grid-cols-6">
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
            <label className="text-sm font-medium mb-2 block">Décision</label>
            <Select
              value={filters.decision_nettoyage || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, decision_nettoyage: value === 'all' ? undefined : value, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes décisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes décisions</SelectItem>
                <SelectItem value="laisser">Laisser</SelectItem>
                <SelectItem value="supprimer">Supprimer</SelectItem>
                <SelectItem value="a_revoir_manuelle">À revoir</SelectItem>
              </SelectContent>
            </Select>
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
                      <TableCell className="font-mono text-sm">{prospect.id.substring(9, 15)}</TableCell>
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
                          <div className="flex items-center gap-1 text-red-600" title={prospect.google_sync_error || 'Échec de synchronisation'}>
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">Échec</span>
                          </div>
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
      </div>
    </AppLayout>
  );
}
