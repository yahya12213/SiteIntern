/**
 * Portail Employe RH (EmployeePortal)
 * Interface employe pour le pointage, les demandes et la consultation des donnees personnelles
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
import {
  Clock,
  FileText,
  Plus,
  LogIn,
  LogOut,
  Download,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useEmployeeAttendance,
  useEmployeeRequests,
  useTodayClocking,
  useCreateRequest,
  useCheckIn,
  useCheckOut,
} from '@/hooks/useEmployeePortal';

// Tabs
type TabType = 'pointage' | 'demandes';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'pointage', label: 'Mon Pointage', icon: Clock },
  { id: 'demandes', label: 'Mes Demandes', icon: FileText },
];

const TYPES_DEMANDES = [
  { value: 'conge_annuel', label: 'Conge annuel' },
  { value: 'conge_sans_solde', label: 'Conge sans solde' },
  { value: 'conge_maladie', label: 'Conge maladie' },
  { value: 'correction_pointage', label: 'Correction de pointage' },
  { value: 'demande_administrative', label: 'Demande administrative' },
  { value: 'demande_formation', label: 'Demande de formation' },
];

const MOIS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

export default function EmployeePortal() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('pointage');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [showNewDemandeModal, setShowNewDemandeModal] = useState(false);
  const [newDemande, setNewDemande] = useState({
    type: '',
    date_debut: '',
    date_fin: '',
    description: '',
  });

  // Queries
  const { data: todayData, isLoading: loadingToday, isError: errorToday } = useTodayClocking();
  const { data: attendanceData, isLoading: loadingAttendance } = useEmployeeAttendance(
    parseInt(selectedYear),
    parseInt(selectedMonth)
  );
  const { data: requestsData, isLoading: loadingRequests } = useEmployeeRequests();

  // Mutations
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const createRequestMutation = useCreateRequest();

  const handleCheckIn = async () => {
    try {
      await checkInMutation.mutateAsync();
      toast({
        title: 'Entree enregistree',
        description: 'Votre pointage d\'entree a ete enregistre avec succes.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur lors du pointage',
        variant: 'destructive',
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      const result = await checkOutMutation.mutateAsync();
      const minutes = result.worked_minutes_today || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      toast({
        title: 'Sortie enregistree',
        description: `Votre pointage de sortie a ete enregistre. Temps travaille: ${hours}h${mins.toString().padStart(2, '0')}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur lors du pointage',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitDemande = async () => {
    if (!newDemande.type || !newDemande.description) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        type: newDemande.type,
        start_date: newDemande.date_debut || undefined,
        end_date: newDemande.date_fin || undefined,
        description: newDemande.description,
      });
      toast({
        title: 'Demande soumise',
        description: 'Votre demande a ete soumise avec succes.',
      });
      setShowNewDemandeModal(false);
      setNewDemande({ type: '', date_debut: '', date_fin: '', description: '' });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur lors de la soumission',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'en_attente':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'approved':
      case 'approuve':
        return <Badge className="bg-green-100 text-green-800">Approuve</Badge>;
      case 'rejected':
      case 'refuse':
        return <Badge className="bg-red-100 text-red-800">Refuse</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pointage':
        return (
          <div className="space-y-6">
            {/* Message d'erreur API */}
            {errorToday && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <p className="font-medium">Erreur de chargement du pointage</p>
                <p className="text-sm">Veuillez recharger la page ou contacter l'administrateur.</p>
              </div>
            )}

            {/* Actions rapides */}
            {todayData?.requires_clocking !== false && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-green-800">Pointer mon entree</h3>
                        <p className="text-sm text-green-600">Enregistrer votre arrivee</p>
                        {todayData?.today?.last_action?.status === 'check_in' && (
                          <p className="text-xs text-green-500 mt-1">
                            Derniere entree: {new Date(todayData.today.last_action.clock_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleCheckIn}
                        disabled={loadingToday || checkInMutation.isPending || (todayData?.today && !todayData.today.can_check_in)}
                      >
                        {loadingToday || checkInMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <LogIn className="h-4 w-4 mr-2" />
                            Entree
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-orange-800">Pointer ma sortie</h3>
                        <p className="text-sm text-orange-600">Enregistrer votre depart</p>
                        {todayData?.today?.worked_minutes != null && todayData.today.worked_minutes > 0 && (
                          <p className="text-xs text-orange-500 mt-1">
                            Temps: {Math.floor(todayData.today.worked_minutes / 60)}h{(todayData.today.worked_minutes % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                      </div>
                      <Button
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={handleCheckOut}
                        disabled={loadingToday || checkOutMutation.isPending || !todayData?.today?.can_check_out}
                        title={!todayData?.today?.can_check_out ? "Vous devez d'abord pointer l'entrée" : ""}
                      >
                        {loadingToday || checkOutMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <LogOut className="h-4 w-4 mr-2" />
                            Sortie
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Heures ce mois
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingAttendance ? '-' : `${attendanceData?.stats?.total_hours || 0}h`}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Jours travailles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingAttendance ? '-' : attendanceData?.stats?.present_days || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total retards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {loadingAttendance ? '-' : `${attendanceData?.stats?.late_minutes || 0} min`}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Conges pris
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {loadingAttendance ? '-' : attendanceData?.stats?.leave_days || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtres */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historique des pointages
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOIS.map((mois, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {mois}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAttendance ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entree</TableHead>
                        <TableHead>Sortie</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceData?.records?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            Aucun pointage pour cette periode
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendanceData?.records?.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {new Date(record.date).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell>{record.check_in}</TableCell>
                            <TableCell>{record.check_out}</TableCell>
                            <TableCell>
                              <Badge className={
                                record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'leave' ? 'bg-blue-100 text-blue-800' :
                                record.status === 'holiday' ? 'bg-purple-100 text-purple-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {record.status === 'present' ? 'Present' :
                                 record.status === 'leave' ? 'Conge' :
                                 record.status === 'holiday' ? 'Ferie' : 'Absent'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'demandes':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mes Demandes RH
              </CardTitle>
              <Button onClick={() => setShowNewDemandeModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date soumission</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsData?.requests?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Aucune demande
                        </TableCell>
                      </TableRow>
                    ) : (
                      requestsData?.requests?.map(demande => (
                        <TableRow key={`${demande.request_type}-${demande.id}`}>
                          <TableCell className="font-medium">
                            {demande.type_name}
                          </TableCell>
                          <TableCell>
                            {new Date(demande.date_soumission).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            {demande.start_date && demande.end_date && demande.start_date !== demande.end_date
                              ? `${new Date(demande.start_date).toLocaleDateString('fr-FR')} - ${new Date(demande.end_date).toLocaleDateString('fr-FR')}`
                              : demande.start_date
                              ? new Date(demande.start_date).toLocaleDateString('fr-FR')
                              : '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{demande.description}</TableCell>
                          <TableCell>{getStatusBadge(demande.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
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
            <Clock className="h-8 w-8 text-blue-600" />
            Portail Employe RH
          </h1>
          <p className="text-gray-500 mt-1">
            Gerez votre pointage et vos demandes RH
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

        {/* Modal nouvelle demande */}
        <Dialog open={showNewDemandeModal} onOpenChange={setShowNewDemandeModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle demande RH</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type de demande *</Label>
                <Select
                  value={newDemande.type}
                  onValueChange={v => setNewDemande({ ...newDemande, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez le type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_DEMANDES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {['conge_annuel', 'conge_sans_solde', 'conge_maladie'].includes(newDemande.type) && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date debut</Label>
                    <Input
                      type="date"
                      value={newDemande.date_debut}
                      onChange={e => setNewDemande({ ...newDemande, date_debut: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date fin</Label>
                    <Input
                      type="date"
                      value={newDemande.date_fin}
                      onChange={e => setNewDemande({ ...newDemande, date_fin: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={newDemande.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDemande({ ...newDemande, description: e.target.value })}
                  placeholder="Decrivez votre demande..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDemandeModal(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmitDemande}
                disabled={createRequestMutation.isPending}
              >
                {createRequestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Soumettre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
