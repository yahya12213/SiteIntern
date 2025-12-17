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
                <SelectItem value="nouveau">Nouveau</SelectItem>
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
                  <TableHead>Ajouté par</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Date d'insertion</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Durée d'appel</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : prospects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="text-sm">{prospect.created_by_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{prospect.id.substring(9, 15)}</TableCell>
                      <TableCell className="font-mono">{prospect.phone_international}</TableCell>
                      <TableCell>{prospect.ville_name || '-'}</TableCell>
                      <TableCell className="text-sm">{prospect.assigned_to_name || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {prospect.date_injection ? new Date(prospect.date_injection).toLocaleDateString('fr-FR') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{prospect.statut_contact}</Badge>
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
                        <div className="flex gap-2">
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
      </div>
    </AppLayout>
  );
}
