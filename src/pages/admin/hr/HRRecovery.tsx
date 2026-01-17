import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePermission } from '@/hooks/usePermission';
import {
  CalendarClock,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  getRecoveryPeriods,
  getRecoveryDeclarations,
  deleteRecoveryPeriod,
  deleteRecoveryDeclaration,
  verifyRecoveryDeclaration,
  type RecoveryPeriod,
  type RecoveryDeclaration,
} from '@/lib/api/hr-recovery';
import RecoveryPeriodModal from '@/components/admin/hr/RecoveryPeriodModal';
import RecoveryDeclarationModal from '@/components/admin/hr/RecoveryDeclarationModal';

export default function HRRecovery() {
  const { hr } = usePermission();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'periods' | 'declarations' | 'employees'>('periods');

  // Modal states
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<RecoveryPeriod | undefined>(undefined);
  const [selectedDeclaration, setSelectedDeclaration] = useState<RecoveryDeclaration | undefined>(undefined);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(undefined);

  // Filters
  const [periodStatusFilter, setPeriodStatusFilter] = useState('');
  const [declarationPeriodFilter, setDeclarationPeriodFilter] = useState('');
  const [declarationTypeFilter, setDeclarationTypeFilter] = useState('');
  const [declarationStatusFilter, setDeclarationStatusFilter] = useState('');

  // Fetch periods
  const { data: periodsData, isLoading: periodsLoading } = useQuery({
    queryKey: ['recovery-periods', periodStatusFilter],
    queryFn: async () => {
      const params: any = {};
      if (periodStatusFilter) params.status = periodStatusFilter as any;
      return await getRecoveryPeriods(params);
    },
    enabled: activeTab === 'periods' || activeTab === 'declarations',
  });

  // Fetch declarations
  const { data: declarationsData, isLoading: declarationsLoading } = useQuery({
    queryKey: ['recovery-declarations', declarationPeriodFilter, declarationTypeFilter, declarationStatusFilter],
    queryFn: async () => {
      const params: any = {};
      if (declarationPeriodFilter) params.period_id = declarationPeriodFilter;
      if (declarationTypeFilter === 'off') params.is_day_off = true;
      if (declarationTypeFilter === 'recovery') params.is_day_off = false;
      if (declarationStatusFilter) params.status = declarationStatusFilter as any;
      return await getRecoveryDeclarations(params);
    },
    enabled: activeTab === 'declarations',
  });

  const periods = periodsData?.periods || [];
  const declarations = declarationsData?.declarations || [];

  // Delete period mutation
  const deletePeriodMutation = useMutation({
    mutationFn: deleteRecoveryPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-periods'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-declarations'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Erreur lors de la suppression');
    },
  });

  // Delete declaration mutation
  const deleteDeclarationMutation = useMutation({
    mutationFn: deleteRecoveryDeclaration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-periods'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Erreur lors de la suppression');
    },
  });

  // Verify declaration mutation
  const verifyDeclarationMutation = useMutation({
    mutationFn: verifyRecoveryDeclaration,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['recovery-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-periods'] });
      alert(
        `Vérification terminée:\n` +
        `Total: ${result.summary.total_employees} employés\n` +
        `Présents: ${result.summary.present}\n` +
        `Absents: ${result.summary.absent}\n` +
        `Déductions totales: ${result.summary.total_deductions} MAD`
      );
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Erreur lors de la vérification');
    },
  });

  const handleEditPeriod = (period: RecoveryPeriod) => {
    setSelectedPeriod(period);
    setShowPeriodModal(true);
  };

  const handleDeletePeriod = async (id: string, name: string) => {
    if (confirm(`Voulez-vous vraiment supprimer la période "${name}" ?\n\nCela supprimera aussi toutes les déclarations associées.`)) {
      await deletePeriodMutation.mutateAsync(id);
    }
  };

  const handleEditDeclaration = (declaration: RecoveryDeclaration) => {
    setSelectedDeclaration(declaration);
    setShowDeclarationModal(true);
  };

  const handleDeleteDeclaration = async (id: string, date: string) => {
    if (confirm(`Voulez-vous vraiment supprimer la déclaration du ${new Date(date).toLocaleDateString('fr-FR')} ?`)) {
      await deleteDeclarationMutation.mutateAsync(id);
    }
  };

  const handleVerifyDeclaration = async (id: string, date: string) => {
    if (confirm(`Vérifier les présences et appliquer les déductions pour le ${new Date(date).toLocaleDateString('fr-FR')} ?`)) {
      await verifyDeclarationMutation.mutateAsync(id);
    }
  };

  const handleNewDeclaration = (periodId?: string) => {
    setSelectedDeclaration(undefined);
    setSelectedPeriodId(periodId);
    setShowDeclarationModal(true);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      active: 'Active',
      completed: 'Complétée',
      cancelled: 'Annulée',
      scheduled: 'Programmé',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDeclarationTypeBadge = (isOffDay: boolean) => {
    if (isOffDay) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Jour off donné
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
        Récupération
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarClock className="h-7 w-7 text-blue-600" />
              Récupération d'Heures
            </h1>
            <p className="text-gray-600 mt-1">
              Gestion des périodes de récupération et des jours off/récupération
            </p>
          </div>
          {hr.canManageRecovery && activeTab === 'periods' && (
            <button
              onClick={() => {
                setSelectedPeriod(undefined);
                setShowPeriodModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Nouvelle Période
            </button>
          )}
          {hr.canManageRecovery && activeTab === 'declarations' && (
            <button
              onClick={() => handleNewDeclaration()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Déclarer Jour
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('periods')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'periods'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Périodes de Récupération
            </button>
            <button
              onClick={() => setActiveTab('declarations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'declarations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Jours de Récupération
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'employees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Suivi par Employé
            </button>
          </nav>
        </div>

        {/* Tab 1: Periods */}
        {activeTab === 'periods' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <select
                    value={periodStatusFilter}
                    onChange={(e) => setPeriodStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="active">Active</option>
                    <option value="completed">Complétée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Periods Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {periodsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Chargement...</p>
                </div>
              ) : periods.length === 0 ? (
                <div className="p-8 text-center">
                  <CalendarClock className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-2 text-gray-600">Aucune période de récupération trouvée</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Créez votre première période pour commencer à gérer les récupérations
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nom
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Heures à récupérer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Heures récupérées
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Restantes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {periods.map((period) => (
                        <tr key={period.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{period.name}</div>
                            {period.description && (
                              <div className="text-sm text-gray-500">{period.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              {new Date(period.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              {' → '}
                              {new Date(period.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {period.total_hours_to_recover}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {period.hours_recovered}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                            {period.hours_remaining}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(period.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleNewDeclaration(period.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Déclarer jour"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              {hr.canManageRecovery && (
                                <>
                                  <button
                                    onClick={() => handleEditPeriod(period)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Modifier"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePeriod(period.id, period.name)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 2: Declarations */}
        {activeTab === 'declarations' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <select
                    value={declarationPeriodFilter}
                    onChange={(e) => setDeclarationPeriodFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Toutes les périodes</option>
                    {periods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={declarationTypeFilter}
                    onChange={(e) => setDeclarationTypeFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tous les types</option>
                    <option value="off">Jour off donné</option>
                    <option value="recovery">Récupération</option>
                  </select>
                </div>
                <div>
                  <select
                    value={declarationStatusFilter}
                    onChange={(e) => setDeclarationStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="scheduled">Programmé</option>
                    <option value="completed">Complété</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Declarations Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {declarationsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Chargement...</p>
                </div>
              ) : declarations.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-2 text-gray-600">Aucune déclaration trouvée</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Déclarez des jours off ou de récupération pour une période
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Période
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Heures
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Département
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {declarations.map((declaration) => (
                        <tr key={declaration.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(declaration.recovery_date).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{declaration.period_name || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getDeclarationTypeBadge(declaration.is_day_off)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {declaration.hours_to_recover}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {declaration.department_id || 'Tous'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(declaration.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {!declaration.is_day_off && declaration.status === 'scheduled' && hr.canManageRecovery && (
                                <button
                                  onClick={() => handleVerifyDeclaration(declaration.id, declaration.recovery_date)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Vérifier présences"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {hr.canManageRecovery && (
                                <>
                                  <button
                                    onClick={() => handleEditDeclaration(declaration)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Modifier"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDeclaration(declaration.id, declaration.recovery_date)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 3: Employee Tracking */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Suivi par Employé</h3>
            <p className="mt-2 text-gray-600">
              Cette fonctionnalité affichera le détail des récupérations par employé.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Vous pourrez voir qui était présent, absent, et les déductions appliquées.
            </p>
          </div>
        )}

        {/* Modals */}
        {showPeriodModal && (
          <RecoveryPeriodModal
            period={selectedPeriod}
            onClose={() => {
              setShowPeriodModal(false);
              setSelectedPeriod(undefined);
            }}
          />
        )}

        {showDeclarationModal && (
          <RecoveryDeclarationModal
            declaration={selectedDeclaration}
            periodId={selectedPeriodId}
            onClose={() => {
              setShowDeclarationModal(false);
              setSelectedDeclaration(undefined);
              setSelectedPeriodId(undefined);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
