// @ts-nocheck
/**
 * Gestion des Horaires (ScheduleManagement)
 * Gestion complète des modèles d'horaires, jours fériés, congés validés et heures supplémentaires
 * Connecté à l'API backend
 */

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  CalendarDays,
  Timer,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Hooks
import {
  useWorkSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  usePublicHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  useApprovedLeaves,
  useOvertimeDeclarations,
  useApproveOvertime,
  useRejectOvertime,
} from '@/hooks/useScheduleManagement';

// Types
import type { WorkSchedule, PublicHoliday } from '@/lib/api/schedule-management';

// Tabs
type TabType = 'modeles' | 'feries' | 'conges' | 'heures-sup';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'modeles', label: 'Modèles d\'Horaires', icon: Clock },
  { id: 'feries', label: 'Jours Fériés', icon: CalendarDays },
  { id: 'conges', label: 'Congés Validés', icon: Calendar },
  { id: 'heures-sup', label: 'Heures Supplémentaires', icon: Timer },
];

const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Default empty schedule for form
const DEFAULT_HORAIRES = JOURS_SEMAINE.reduce((acc, jour) => ({
  ...acc,
  [jour]: { actif: jour !== 'Samedi' && jour !== 'Dimanche', heureDebut: '08:00', heureFin: '17:00', pauses: [] }
}), {});

export default function ScheduleManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('modeles');
  const currentYear = new Date().getFullYear();

  // State for modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    nom: '',
    description: '',
    horaires: DEFAULT_HORAIRES,
    heures_hebdo: 44,
    is_default: false,
    actif: true,
  });

  const [holidayForm, setHolidayForm] = useState({
    nom: '',
    date_debut: '',
    recurrent: false,
    description: '',
  });

  // Queries
  const { data: schedulesData, isLoading: schedulesLoading, error: schedulesError } = useWorkSchedules();
  const { data: holidaysData, isLoading: holidaysLoading, error: holidaysError } = usePublicHolidays(currentYear);
  const { data: leavesData, isLoading: leavesLoading, error: leavesError } = useApprovedLeaves(currentYear);
  const { data: overtimeData, isLoading: overtimeLoading, error: overtimeError } = useOvertimeDeclarations();

  // Mutations
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const approveOvertime = useApproveOvertime();
  const rejectOvertime = useRejectOvertime();

  // Data
  const modeles = schedulesData?.schedules || [];
  const joursFeries = holidaysData?.holidays || [];
  const congesValides = leavesData?.leaves || [];
  const declarationsHS = overtimeData?.overtime || [];

  // Handlers - Schedules
  const handleOpenScheduleModal = (schedule?: WorkSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleForm({
        nom: schedule.nom,
        description: schedule.description || '',
        horaires: schedule.horaires,
        heures_hebdo: schedule.heures_hebdo,
        is_default: schedule.is_default || false,
        actif: schedule.actif,
      });
    } else {
      setEditingSchedule(null);
      setScheduleForm({
        nom: '',
        description: '',
        horaires: DEFAULT_HORAIRES,
        heures_hebdo: 44,
        is_default: false,
        actif: true,
      });
    }
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.nom) {
      toast.error('Le nom du modèle est requis');
      return;
    }

    try {
      if (editingSchedule) {
        await updateSchedule.mutateAsync({ id: editingSchedule.id, data: scheduleForm });
        toast.success('Modèle mis à jour');
      } else {
        await createSchedule.mutateAsync(scheduleForm);
        toast.success('Modèle créé');
      }
      setShowScheduleModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Supprimer ce modèle d\'horaires ?')) return;
    try {
      await deleteSchedule.mutateAsync(id);
      toast.success('Modèle supprimé');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Handlers - Holidays
  const handleOpenHolidayModal = (holiday?: PublicHoliday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setHolidayForm({
        nom: holiday.nom,
        date_debut: holiday.date_debut,
        recurrent: holiday.recurrent,
        description: holiday.description || '',
      });
    } else {
      setEditingHoliday(null);
      setHolidayForm({
        nom: '',
        date_debut: '',
        recurrent: false,
        description: '',
      });
    }
    setShowHolidayModal(true);
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.nom || !holidayForm.date_debut) {
      toast.error('Le nom et la date sont requis');
      return;
    }

    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({ id: editingHoliday.id, data: holidayForm });
        toast.success('Jour férié mis à jour');
      } else {
        await createHoliday.mutateAsync(holidayForm);
        toast.success('Jour férié ajouté');
      }
      setShowHolidayModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Supprimer ce jour férié ?')) return;
    try {
      await deleteHoliday.mutateAsync(id);
      toast.success('Jour férié supprimé');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Handlers - Overtime
  const handleApproveOvertime = async (id: number, hours: number) => {
    try {
      await approveOvertime.mutateAsync({ id, data: { hours_approved: hours } });
      toast.success('Heures supplémentaires approuvées');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'approbation');
    }
  };

  const handleRejectOvertime = async (id: number) => {
    const comment = prompt('Motif du refus (optionnel):');
    try {
      await rejectOvertime.mutateAsync({ id, comment: comment || undefined });
      toast.success('Heures supplémentaires refusées');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du refus');
    }
  };

  // Render loading/error states
  const renderLoadingOrError = (loading: boolean, error: any, tabName: string) => {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Chargement...</span>
          </CardContent>
        </Card>
      );
    }
    if (error) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="ml-2 text-red-500">Erreur de chargement</span>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'modeles':
        const scheduleState = renderLoadingOrError(schedulesLoading, schedulesError, 'modèles');
        if (scheduleState) return scheduleState;

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Modèles d'Horaires
              </CardTitle>
              <Button size="sm" onClick={() => handleOpenScheduleModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau modèle
              </Button>
            </CardHeader>
            <CardContent>
              {modeles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun modèle d'horaires. Cliquez sur "Nouveau modèle" pour en créer un.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Heures/Semaine</TableHead>
                      <TableHead>Jours travaillés</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modeles.map(modele => (
                      <TableRow key={modele.id}>
                        <TableCell className="font-medium">
                          {modele.nom}
                          {modele.is_default && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800" variant="outline">Par défaut</Badge>
                          )}
                        </TableCell>
                        <TableCell>{modele.description}</TableCell>
                        <TableCell>{modele.heures_hebdo}h</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {JOURS_SEMAINE.map(jour => (
                              <span
                                key={jour}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                  modele.horaires?.[jour]?.actif
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                {jour[0]}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {modele.actif ? (
                            <Badge className="bg-green-100 text-green-800">Actif</Badge>
                          ) : (
                            <Badge variant="outline">Inactif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenScheduleModal(modele)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSchedule(modele.id)}
                            disabled={deleteSchedule.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'feries':
        const holidayState = renderLoadingOrError(holidaysLoading, holidaysError, 'jours fériés');
        if (holidayState) return holidayState;

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Jours Fériés & Congés Collectifs ({currentYear})
              </CardTitle>
              <Button size="sm" onClick={() => handleOpenHolidayModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {joursFeries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun jour férié pour {currentYear}. Cliquez sur "Ajouter" pour en créer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Récurrent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {joursFeries.map(jour => (
                      <TableRow key={jour.id}>
                        <TableCell className="font-medium">{jour.nom}</TableCell>
                        <TableCell>
                          {new Date(jour.date_debut).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            Férié
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {jour.recurrent ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenHolidayModal(jour)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteHoliday(jour.id)}
                            disabled={deleteHoliday.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'conges':
        const leavesState = renderLoadingOrError(leavesLoading, leavesError, 'congés');
        if (leavesState) return leavesState;

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Congés Validés ({currentYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {congesValides.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun congé validé pour {currentYear}.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {congesValides.map(conge => (
                      <TableRow key={conge.id}>
                        <TableCell className="font-medium">{conge.employe_nom}</TableCell>
                        <TableCell>{conge.type_conge}</TableCell>
                        <TableCell>
                          {new Date(conge.date_debut).toLocaleDateString('fr-FR')} → {new Date(conge.date_fin).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>{conge.jours} jours</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">Approuvé</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'heures-sup':
        const overtimeState = renderLoadingOrError(overtimeLoading, overtimeError, 'heures sup');
        if (overtimeState) return overtimeState;

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Déclarations d'Heures Supplémentaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              {declarationsHS.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune déclaration d'heures supplémentaires.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Heures demandées</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declarationsHS.map(decl => (
                      <TableRow key={decl.id}>
                        <TableCell className="font-medium">{decl.employe_nom}</TableCell>
                        <TableCell>{new Date(decl.request_date).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{decl.heures_demandees}h</TableCell>
                        <TableCell className="max-w-xs truncate">{decl.motif || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            decl.statut === 'approved' ? 'bg-green-100 text-green-800' :
                            decl.statut === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {decl.statut === 'approved' ? 'Approuvé' :
                             decl.statut === 'pending' ? 'En attente' : 'Refusé'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {decl.statut === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleApproveOvertime(decl.id, decl.heures_demandees)}
                                disabled={approveOvertime.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => handleRejectOvertime(decl.id)}
                                disabled={rejectOvertime.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            Gestion des Horaires
          </h1>
          <p className="text-gray-500 mt-1">
            Modèles d'horaires, jours fériés, congés et heures supplémentaires
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4" aria-label="Tabs">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Modifier le modèle' : 'Nouveau modèle d\'horaires'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du modèle *</Label>
                <Input
                  value={scheduleForm.nom}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, nom: e.target.value })}
                  placeholder="Ex: Horaire Standard"
                />
              </div>
              <div>
                <Label>Heures/Semaine</Label>
                <Input
                  type="number"
                  value={scheduleForm.heures_hebdo}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, heures_hebdo: parseInt(e.target.value) || 44 })}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                placeholder="Description du modèle..."
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={scheduleForm.is_default}
                  onCheckedChange={(checked) => setScheduleForm({ ...scheduleForm, is_default: !!checked })}
                />
                <Label>Modèle par défaut</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={scheduleForm.actif}
                  onCheckedChange={(checked) => setScheduleForm({ ...scheduleForm, actif: !!checked })}
                />
                <Label>Actif</Label>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Jours travaillés</Label>
              <div className="grid grid-cols-7 gap-2">
                {JOURS_SEMAINE.map(jour => (
                  <div
                    key={jour}
                    className={`p-2 rounded border text-center cursor-pointer ${
                      scheduleForm.horaires[jour]?.actif
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => setScheduleForm({
                      ...scheduleForm,
                      horaires: {
                        ...scheduleForm.horaires,
                        [jour]: {
                          ...scheduleForm.horaires[jour],
                          actif: !scheduleForm.horaires[jour]?.actif
                        }
                      }
                    })}
                  >
                    <div className="font-medium text-sm">{jour.slice(0, 3)}</div>
                    {scheduleForm.horaires[jour]?.actif && (
                      <div className="text-xs text-gray-500 mt-1">
                        {scheduleForm.horaires[jour].heureDebut} - {scheduleForm.horaires[jour].heureFin}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={createSchedule.isPending || updateSchedule.isPending}
            >
              {(createSchedule.isPending || updateSchedule.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingSchedule ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holiday Modal */}
      <Dialog open={showHolidayModal} onOpenChange={setShowHolidayModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Modifier le jour férié' : 'Nouveau jour férié'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={holidayForm.nom}
                onChange={(e) => setHolidayForm({ ...holidayForm, nom: e.target.value })}
                placeholder="Ex: Fête du Travail"
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={holidayForm.date_debut}
                onChange={(e) => setHolidayForm({ ...holidayForm, date_debut: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={holidayForm.description}
                onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                placeholder="Description optionnelle..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={holidayForm.recurrent}
                onCheckedChange={(checked) => setHolidayForm({ ...holidayForm, recurrent: !!checked })}
              />
              <Label>Récurrent chaque année</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHolidayModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveHoliday}
              disabled={createHoliday.isPending || updateHoliday.isPending}
            >
              {(createHoliday.isPending || updateHoliday.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingHoliday ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
