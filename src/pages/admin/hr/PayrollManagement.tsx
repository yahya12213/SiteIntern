/**
 * Gestion de Paie (PayrollManagement)
 * Système complet de gestion de paie conforme au Code du Travail marocain (CNSS, AMO, IGR)
 */

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProtectedButton } from '@/components/ui/ProtectedButton';
import { PERMISSIONS } from '@/config/permissions';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  Calendar,
  Calculator,
  FileText,
  TestTube,
  Cog,
  Settings,
  Plus,
  Play,
  Download,
  Check,
  Lock,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  FileDown,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  X,
} from 'lucide-react';
import {
  usePayrollPeriods,
  useCreatePeriod,
  useDeletePeriod,
  useOpenPeriod,
  useClosePeriod,
  useCalculatePayroll,
  useResetPayrollCalculations,
  usePayslips,
  useValidatePayslip,
  useValidateAllPayslips,
  useDownloadPayslipPdf,
  usePayrollConfig,
  usePayrollLogs,
  useExportCNSS,
  useExportBankTransfers,
  useDownloadPayslipsZip,
  usePayrollStats,
} from '@/hooks/usePayroll';
import type { PayrollPeriod, PayslipSummary, PayrollAuditLog } from '@/lib/api/payroll';
import { EmployeeSelectionModal } from '@/components/admin/hr/EmployeeSelectionModal';

// Tabs
type TabType = 'periodes' | 'calculs' | 'bulletins' | 'tests' | 'automatisation' | 'configuration';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'periodes', label: 'Périodes de Paie', icon: Calendar },
  { id: 'calculs', label: 'Calculs de Paie', icon: Calculator },
  { id: 'bulletins', label: 'Bulletins de Paie', icon: FileText },
  { id: 'tests', label: 'Tests & Logs', icon: TestTube },
  { id: 'automatisation', label: 'Automatisation', icon: Cog },
  { id: 'configuration', label: 'Configuration', icon: Settings },
];

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
  open: { label: 'Ouverte', className: 'bg-blue-100 text-blue-800' },
  calculating: { label: 'En calcul', className: 'bg-yellow-100 text-yellow-800' },
  calculated: { label: 'Calculée', className: 'bg-purple-100 text-purple-800' },
  validated: { label: 'Validée', className: 'bg-green-100 text-green-800' },
  closed: { label: 'Clôturée', className: 'bg-gray-100 text-gray-800' },
};

const PAYSLIP_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
  calculated: { label: 'Calculé', className: 'bg-yellow-100 text-yellow-800' },
  validated: { label: 'Validé', className: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Payé', className: 'bg-green-100 text-green-800' },
};

export default function PayrollManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('periodes');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Modal states
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);
  const [periodToClose, setPeriodToClose] = useState<string | null>(null);
  const [periodToReset, setPeriodToReset] = useState<string | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Form state for new period
  const [newPeriod, setNewPeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    start_date: '',
    end_date: '',
    pay_date: '',
  });

  // Queries
  const { data: periodsData, isLoading: periodsLoading, error: periodsError, refetch: refetchPeriods } = usePayrollPeriods({ year: selectedYear });
  const { data: payslipsData, isLoading: payslipsLoading } = usePayslips({ period_id: selectedPeriodId || undefined });
  const { data: configData, isLoading: configLoading } = usePayrollConfig();
  const { data: logsData, isLoading: logsLoading } = usePayrollLogs({ limit: 50 });
  const { data: statsData } = usePayrollStats(selectedYear);

  // Mutations
  const createPeriodMutation = useCreatePeriod();
  const deletePeriodMutation = useDeletePeriod();
  const openPeriodMutation = useOpenPeriod();
  const closePeriodMutation = useClosePeriod();
  const calculatePayrollMutation = useCalculatePayroll();
  const resetPayrollCalculationsMutation = useResetPayrollCalculations();
  const validatePayslipMutation = useValidatePayslip();
  const validateAllPayslipsMutation = useValidateAllPayslips();
  const downloadPayslipPdfMutation = useDownloadPayslipPdf();
  const exportCNSSMutation = useExportCNSS();
  const exportBankTransfersMutation = useExportBankTransfers();
  const downloadPayslipsZipMutation = useDownloadPayslipsZip();

  const periods = periodsData?.periods || [];
  const payslips = payslipsData?.payslips || [];
  const config = configData?.config;
  const logs = logsData?.logs || [];
  const stats = statsData?.stats;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-MA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleCreatePeriod = async () => {
    if (!newPeriod.start_date || !newPeriod.end_date || !newPeriod.pay_date) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir toutes les dates',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createPeriodMutation.mutateAsync(newPeriod);
      toast({
        title: 'Succès',
        description: 'Période de paie créée avec succès',
      });
      setShowCreatePeriodModal(false);
      setNewPeriod({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        start_date: '',
        end_date: '',
        pay_date: '',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de créer la période',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePeriod = async () => {
    if (!periodToDelete) return;

    try {
      await deletePeriodMutation.mutateAsync(periodToDelete);
      toast({
        title: 'Succès',
        description: 'Période supprimée avec succès',
      });
      setPeriodToDelete(null);
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer la période',
        variant: 'destructive',
      });
    }
  };

  const handleOpenPeriod = async (id: string) => {
    try {
      await openPeriodMutation.mutateAsync(id);
      toast({
        title: 'Succès',
        description: 'Période ouverte avec succès',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d\'ouvrir la période',
        variant: 'destructive',
      });
    }
  };

  const handleClosePeriod = async () => {
    if (!periodToClose) return;

    try {
      await closePeriodMutation.mutateAsync(periodToClose);
      toast({
        title: 'Succès',
        description: 'Période clôturée avec succès',
      });
      setPeriodToClose(null);
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de clôturer la période',
        variant: 'destructive',
      });
    }
  };

  const handleCalculatePayroll = async (periodId: string) => {
    try {
      const result = await calculatePayrollMutation.mutateAsync({
        periodId,
        options: {
          employee_ids: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined
        }
      });
      const employeesProcessed = result.employees_processed || result.payslips_created || 0;
      toast({
        title: 'Calcul terminé',
        description: `${employeesProcessed} bulletin(s) généré(s). Total net: ${formatMoney(result.total_net)}`,
      });
      // Reset selection after calculation
      setSelectedEmployeeIds([]);
    } catch (error: unknown) {
      toast({
        title: 'Erreur de calcul',
        description: error instanceof Error ? error.message : 'Impossible de calculer la paie',
        variant: 'destructive',
      });
    }
  };

  const handleResetPayrollCalculations = async () => {
    if (!periodToReset) return;

    try {
      const result = await resetPayrollCalculationsMutation.mutateAsync(periodToReset);
      toast({
        title: 'Calculs supprimés',
        description: result.message || `${result.deleted_payslips} bulletin(s) supprimé(s)`,
      });
      setPeriodToReset(null);
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer les calculs',
        variant: 'destructive',
      });
    }
  };

  const handleEmployeeSelectionConfirm = (ids: string[]) => {
    setSelectedEmployeeIds(ids);
  };

  const handleValidatePayslip = async (id: string) => {
    try {
      await validatePayslipMutation.mutateAsync(id);
      toast({
        title: 'Succès',
        description: 'Bulletin validé avec succès',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de valider le bulletin',
        variant: 'destructive',
      });
    }
  };

  const handleValidateAllPayslips = async (periodId: string) => {
    try {
      const result = await validateAllPayslipsMutation.mutateAsync(periodId);
      toast({
        title: 'Succès',
        description: `${result.validated_count} bulletins validés`,
      });
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de valider les bulletins',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPayslip = async (id: string) => {
    try {
      await downloadPayslipPdfMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de télécharger le bulletin',
        variant: 'destructive',
      });
    }
  };

  const handleExportCNSS = async (periodId: string) => {
    try {
      const result = await exportCNSSMutation.mutateAsync(periodId);
      // Create and download CSV
      const csvContent = generateCNSSCsv(result.data);
      downloadCsv(csvContent, `declaration-cnss-${periodId}.csv`);
      toast({
        title: 'Export réussi',
        description: 'Déclaration CNSS exportée',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d\'exporter la déclaration CNSS',
        variant: 'destructive',
      });
    }
  };

  const handleExportBankTransfers = async (periodId: string) => {
    try {
      const result = await exportBankTransfersMutation.mutateAsync(periodId);
      const csvContent = generateBankTransfersCsv(result.data);
      downloadCsv(csvContent, `virements-${periodId}.csv`);
      toast({
        title: 'Export réussi',
        description: 'Fichier de virements exporté',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d\'exporter les virements',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAllPayslips = async (periodId: string) => {
    try {
      await downloadPayslipsZipMutation.mutateAsync(periodId);
      toast({
        title: 'Téléchargement réussi',
        description: 'Tous les bulletins ont été téléchargés',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de télécharger les bulletins',
        variant: 'destructive',
      });
    }
  };

  const generateCNSSCsv = (data: { employees: Array<{ cnss_number: string; full_name: string; gross_salary: number; worked_days: number; cnss_amount: number }> }) => {
    const headers = ['Numéro CNSS', 'Nom Complet', 'Salaire Brut', 'Jours Travaillés', 'Cotisation CNSS'];
    const rows = data.employees.map(e => [e.cnss_number, e.full_name, e.gross_salary, e.worked_days, e.cnss_amount].join(';'));
    return [headers.join(';'), ...rows].join('\n');
  };

  const generateBankTransfersCsv = (data: { transfers: Array<{ employee_name: string; bank_name?: string; rib?: string; amount: number }> }) => {
    const headers = ['Nom', 'Banque', 'RIB', 'Montant'];
    const rows = data.transfers.map(t => [t.employee_name, t.bank_name || '', t.rib || '', t.amount].join(';'));
    return [headers.join(';'), ...rows].join('\n');
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderLoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="ml-2 text-gray-600">Chargement...</span>
    </div>
  );

  const renderErrorState = (message: string, onRetry: () => void) => (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <p className="text-gray-600 mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Réessayer
      </Button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'periodes':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Périodes de Paie
                </CardTitle>
                <CardDescription>
                  Gérez les périodes de paie mensuelles
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ProtectedButton
                  permission={PERMISSIONS.ressources_humaines.gestion_paie.periodes.creer}
                  size="sm"
                  onClick={() => setShowCreatePeriodModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle période
                </ProtectedButton>
              </div>
            </CardHeader>
            <CardContent>
              {periodsLoading ? renderLoadingState() : periodsError ? (
                renderErrorState('Impossible de charger les périodes', () => refetchPeriods())
              ) : periods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune période de paie pour {selectedYear}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>Fenêtre de pointage</TableHead>
                      <TableHead>Date de paie</TableHead>
                      <TableHead>Employés</TableHead>
                      <TableHead>Total net</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((periode: PayrollPeriod) => {
                      const statusConfig = STATUS_CONFIG[periode.status] || STATUS_CONFIG.draft;
                      return (
                        <TableRow key={periode.id}>
                          <TableCell className="font-medium">
                            {MOIS[periode.month - 1]} {periode.year}
                          </TableCell>
                          <TableCell>
                            {formatDate(periode.start_date)} → {formatDate(periode.end_date)}
                          </TableCell>
                          <TableCell>{formatDate(periode.pay_date)}</TableCell>
                          <TableCell>{periode.total_employees || 0}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            {periode.total_net ? formatMoney(periode.total_net) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {periode.status === 'draft' && (
                                <>
                                  <ProtectedButton
                                    permission={PERMISSIONS.ressources_humaines.gestion_paie.periodes.ouvrir}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenPeriod(periode.id)}
                                    disabled={openPeriodMutation.isPending}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Ouvrir
                                  </ProtectedButton>
                                  <ProtectedButton
                                    permission={PERMISSIONS.ressources_humaines.gestion_paie.periodes.supprimer}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPeriodToDelete(periode.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </ProtectedButton>
                                </>
                              )}
                              {periode.status === 'open' && (
                                <ProtectedButton
                                  permission={PERMISSIONS.ressources_humaines.gestion_paie.calculs.calculer}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCalculatePayroll(periode.id)}
                                  disabled={calculatePayrollMutation.isPending}
                                >
                                  {calculatePayrollMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Calculator className="h-4 w-4 mr-1" />
                                  )}
                                  Calculer
                                </ProtectedButton>
                              )}
                              {(periode.status === 'calculated' || periode.status === 'validated') && (
                                <>
                                  <ProtectedButton
                                    permission={PERMISSIONS.ressources_humaines.gestion_paie.bulletins.voir}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPeriodId(periode.id);
                                      setActiveTab('bulletins');
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Bulletins
                                  </ProtectedButton>
                                  <ProtectedButton
                                    permission={PERMISSIONS.ressources_humaines.gestion_paie.calculs.calculer}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPeriodToReset(periode.id)}
                                    title="Supprimer les calculs et recommencer"
                                  >
                                    <Trash2 className="h-4 w-4 text-orange-500" />
                                  </ProtectedButton>
                                  <ProtectedButton
                                    permission={PERMISSIONS.ressources_humaines.gestion_paie.periodes.fermer}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPeriodToClose(periode.id)}
                                  >
                                    <Lock className="h-4 w-4 mr-1" />
                                    Clôturer
                                  </ProtectedButton>
                                </>
                              )}
                              {periode.status === 'closed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPeriodId(periode.id);
                                    setActiveTab('bulletins');
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'calculs':
        const openPeriods = periods.filter((p: PayrollPeriod) => p.status === 'open' || p.status === 'draft');
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculs de Paie
              </CardTitle>
              <CardDescription>
                Lancez le calcul de paie pour une période ouverte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {periodsLoading ? renderLoadingState() : openPeriods.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune période ouverte pour le calcul.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Créez une nouvelle période et ouvrez-la pour pouvoir lancer un calcul.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Période à calculer</Label>
                      <Select
                        value={selectedPeriodId || ''}
                        onValueChange={setSelectedPeriodId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner la période" />
                        </SelectTrigger>
                        <SelectContent>
                          {openPeriods.map((p: PayrollPeriod) => (
                            <SelectItem key={p.id} value={p.id}>
                              {MOIS[p.month - 1]} {p.year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Employee Selection */}
                  <div className="space-y-2">
                    <Label>Employés à traiter</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowEmployeeModal(true)}
                        className="flex-1 justify-start"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {selectedEmployeeIds.length > 0
                          ? `${selectedEmployeeIds.length} employé(s) sélectionné(s)`
                          : 'Sélectionner les employés'}
                      </Button>
                      {selectedEmployeeIds.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedEmployeeIds([])}
                          title="Tout désélectionner"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {selectedEmployeeIds.length === 0 && (
                      <p className="text-sm text-gray-500">
                        Par défaut, tous les employés actifs seront traités
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Calculs automatiques inclus:</h4>
                    <ul className="text-sm text-blue-700 grid grid-cols-2 gap-2">
                      <li>• Collecte des pointages</li>
                      <li>• Heures normales et supplémentaires</li>
                      <li>• Cotisations CNSS (barèmes 2025)</li>
                      <li>• AMO (2,26%)</li>
                      <li>• IGR avec déductions</li>
                      <li>• Prime d'ancienneté</li>
                    </ul>
                  </div>

                  <ProtectedButton
                    permission={PERMISSIONS.ressources_humaines.gestion_paie.calculs.calculer}
                    className="w-full"
                    disabled={!selectedPeriodId || calculatePayrollMutation.isPending}
                    onClick={() => selectedPeriodId && handleCalculatePayroll(selectedPeriodId)}
                  >
                    {calculatePayrollMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Lancer le calcul de paie
                      </>
                    )}
                  </ProtectedButton>

                  {/* Employee Selection Modal */}
                  <EmployeeSelectionModal
                    open={showEmployeeModal}
                    onClose={() => setShowEmployeeModal(false)}
                    onConfirm={handleEmployeeSelectionConfirm}
                    initialSelected={selectedEmployeeIds}
                  />
                </>
              )}
            </CardContent>
          </Card>
        );

      case 'bulletins':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Bulletins de Paie
                </CardTitle>
                <CardDescription>
                  Consultez et validez les bulletins de paie
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedPeriodId || ''}
                  onValueChange={setSelectedPeriodId}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sélectionner période" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p: PayrollPeriod) => (
                      <SelectItem key={p.id} value={p.id}>
                        {MOIS[p.month - 1]} {p.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPeriodId && (
                  <>
                    <ProtectedButton
                      permission={PERMISSIONS.ressources_humaines.gestion_paie.bulletins.valider_tous}
                      variant="outline"
                      size="sm"
                      onClick={() => handleValidateAllPayslips(selectedPeriodId)}
                      disabled={validateAllPayslipsMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Valider tous
                    </ProtectedButton>
                    <ProtectedButton
                      permission={PERMISSIONS.ressources_humaines.gestion_paie.bulletins.telecharger}
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadAllPayslips(selectedPeriodId)}
                      disabled={downloadPayslipsZipMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger tout
                    </ProtectedButton>
                    <ProtectedButton
                      permission={PERMISSIONS.ressources_humaines.gestion_paie.bulletins.exporter_cnss}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCNSS(selectedPeriodId)}
                      disabled={exportCNSSMutation.isPending}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export CNSS
                    </ProtectedButton>
                    <ProtectedButton
                      permission={PERMISSIONS.ressources_humaines.gestion_paie.bulletins.exporter_virements}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportBankTransfers(selectedPeriodId)}
                      disabled={exportBankTransfersMutation.isPending}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Virements
                    </ProtectedButton>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedPeriodId ? (
                <div className="text-center py-8 text-gray-500">
                  Sélectionnez une période pour voir les bulletins
                </div>
              ) : payslipsLoading ? (
                renderLoadingState()
              ) : payslips.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun bulletin pour cette période
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Département</TableHead>
                      <TableHead className="text-right">Salaire brut</TableHead>
                      <TableHead className="text-right">Net à payer</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((payslip: PayslipSummary) => {
                      const statusConfig = PAYSLIP_STATUS_CONFIG[payslip.status] || PAYSLIP_STATUS_CONFIG.draft;
                      return (
                        <TableRow key={payslip.id}>
                          <TableCell className="font-medium">{payslip.employee_name}</TableCell>
                          <TableCell>{payslip.employee_number || '-'}</TableCell>
                          <TableCell>{payslip.department || '-'}</TableCell>
                          <TableCell className="text-right">{formatMoney(payslip.gross_salary)}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatMoney(payslip.net_salary)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {payslip.status === 'calculated' && (
                                <ProtectedButton
                                  permission={PERMISSIONS.ressources_humaines.gestion_paie.bulletins.valider}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleValidatePayslip(payslip.id)}
                                  disabled={validatePayslipMutation.isPending}
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </ProtectedButton>
                              )}
                              <ProtectedButton
                                permission={PERMISSIONS.ressources_humaines.gestion_paie.bulletins.telecharger}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPayslip(payslip.id)}
                                disabled={downloadPayslipPdfMutation.isPending}
                              >
                                <Download className="h-4 w-4" />
                              </ProtectedButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'tests':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Tests & Logs d'Audit
              </CardTitle>
              <CardDescription>
                Historique des opérations de paie
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? renderLoadingState() : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun log d'audit disponible
                </div>
              ) : (
                <div className="border rounded-lg divide-y max-h-96 overflow-auto">
                  {logs.map((log: PayrollAuditLog) => (
                    <div key={log.id} className="p-3 text-sm hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {log.action.includes('create') && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {log.action.includes('delete') && <XCircle className="h-4 w-4 text-red-500" />}
                          {log.action.includes('calculate') && <Calculator className="h-4 w-4 text-blue-500" />}
                          {log.action.includes('validate') && <Check className="h-4 w-4 text-purple-500" />}
                          {log.action.includes('close') && <Lock className="h-4 w-4 text-gray-500" />}
                          {!['create', 'delete', 'calculate', 'validate', 'close'].some(a => log.action.includes(a)) && (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          {new Date(log.created_at).toLocaleString('fr-MA')}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">
                        Par: {log.created_by_name}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'automatisation':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                Automatisation
              </CardTitle>
              <CardDescription>
                Configuration des tâches automatiques (à venir)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Calcul automatique mensuel</h4>
                    <p className="text-sm text-gray-500">Exécution le 25 de chaque mois à 00:00</p>
                  </div>
                  <Badge variant="outline">Bientôt disponible</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Génération automatique des bulletins PDF</h4>
                    <p className="text-sm text-gray-500">Après validation de la période</p>
                  </div>
                  <Badge variant="outline">Bientôt disponible</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Notification par email aux employés</h4>
                    <p className="text-sm text-gray-500">Envoi du bulletin par email</p>
                  </div>
                  <Badge variant="outline">Bientôt disponible</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'configuration':
        return (
          <div className="space-y-6">
            {configLoading ? renderLoadingState() : !config ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    Configuration non disponible
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Barème IGR */}
                <Card>
                  <CardHeader>
                    <CardTitle>Barème IGR 2025</CardTitle>
                    <CardDescription>Impôt sur le revenu - Barème progressif annuel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tranche (MAD/an)</TableHead>
                          <TableHead>Taux</TableHead>
                          <TableHead>Somme à déduire</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.igr?.brackets?.map((bracket, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {formatMoney(bracket.min)} - {bracket.max === 999999999 ? '∞' : formatMoney(bracket.max)}
                            </TableCell>
                            <TableCell>{bracket.rate}%</TableCell>
                            <TableCell>{formatMoney(bracket.deduction)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Configuration CNSS */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration CNSS</CardTitle>
                    <CardDescription>Caisse Nationale de Sécurité Sociale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Taux salarié</Label>
                        <Input value={`${config.cnss?.employee_rate || 4.48}%`} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Taux employeur</Label>
                        <Input value={`${config.cnss?.employer_rate || 8.98}%`} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Plafond mensuel</Label>
                        <Input value={formatMoney(config.cnss?.ceiling || 6000)} disabled />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration AMO */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration AMO</CardTitle>
                    <CardDescription>Assurance Maladie Obligatoire</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Taux salarié</Label>
                        <Input value={`${config.amo?.employee_rate || 2.26}%`} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Taux employeur</Label>
                        <Input value={`${config.amo?.employer_rate || 4.11}%`} disabled />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Heures supplémentaires */}
                <Card>
                  <CardHeader>
                    <CardTitle>Majorations Heures Supplémentaires</CardTitle>
                    <CardDescription>Taux de majoration selon le Code du Travail marocain</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Majoration 25%</Label>
                        <p className="text-sm text-gray-500">Heures sup jour (6h-21h)</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Majoration 50%</Label>
                        <p className="text-sm text-gray-500">Heures sup nuit (21h-6h)</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Majoration 100%</Label>
                        <p className="text-sm text-gray-500">Jours fériés et repos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lignes de paie */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lignes de paie</CardTitle>
                    <CardDescription>Éléments de rémunération et retenues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-medium text-green-700 mb-2">Gains</h4>
                        <ul className="text-sm space-y-1">
                          <li>• Salaire de base</li>
                          <li>• Heures supplémentaires (25%, 50%, 100%)</li>
                          <li>• Prime d'ancienneté</li>
                          <li>• Primes diverses</li>
                          <li>• Indemnités</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-red-700 mb-2">Retenues</h4>
                        <ul className="text-sm space-y-1">
                          <li>• CNSS (4,48% plafonné à 6000 MAD)</li>
                          <li>• AMO (2,26%)</li>
                          <li>• IGR (barème progressif)</li>
                          <li>• Avances sur salaire</li>
                          <li>• Autres retenues</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="h-8 w-8 text-blue-600" />
              Gestion de Paie
            </h1>
            <p className="text-gray-500 mt-1">
              Système de paie conforme au Code du Travail marocain
            </p>
          </div>
          {stats && (
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total_periods}</p>
                <p className="text-xs text-gray-500">Périodes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.total_employees_paid}</p>
                <p className="text-xs text-gray-500">Employés payés</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{formatMoney(stats.total_mass_salary || 0)}</p>
                <p className="text-xs text-gray-500">Masse salariale</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-2" aria-label="Tabs">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

      {/* Create Period Modal */}
      <Dialog open={showCreatePeriodModal} onOpenChange={setShowCreatePeriodModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle période de paie</DialogTitle>
            <DialogDescription>
              Créez une nouvelle période pour le calcul de paie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Année</Label>
                <Select
                  value={newPeriod.year.toString()}
                  onValueChange={(v) => setNewPeriod({ ...newPeriod, year: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mois</Label>
                <Select
                  value={newPeriod.month.toString()}
                  onValueChange={(v) => setNewPeriod({ ...newPeriod, month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOIS.map((mois, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>{mois}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date début pointage</Label>
              <Input
                type="date"
                value={newPeriod.start_date}
                onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date fin pointage</Label>
              <Input
                type="date"
                value={newPeriod.end_date}
                onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de paie</Label>
              <Input
                type="date"
                value={newPeriod.pay_date}
                onChange={(e) => setNewPeriod({ ...newPeriod, pay_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePeriodModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreatePeriod} disabled={createPeriodMutation.isPending}>
              {createPeriodMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Period Confirmation */}
      <AlertDialog open={!!periodToDelete} onOpenChange={() => setPeriodToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la période ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La période et toutes ses données seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePeriod}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Calculations Confirmation */}
      <AlertDialog open={!!periodToReset} onOpenChange={() => setPeriodToReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les calculs de paie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera tous les bulletins de paie de cette période. La période reviendra au statut "Ouverte" et vous pourrez recalculer la paie.
              <br /><br />
              <strong className="text-orange-600">Attention :</strong> Les bulletins déjà téléchargés ne seront pas supprimés du système de fichiers, mais les données de calcul seront effacées de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPayrollCalculations}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Supprimer les calculs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Period Confirmation */}
      <AlertDialog open={!!periodToClose} onOpenChange={() => setPeriodToClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer la période ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une fois clôturée, la période ne pourra plus être modifiée. Assurez-vous que tous les bulletins sont validés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleClosePeriod}>
              Clôturer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
