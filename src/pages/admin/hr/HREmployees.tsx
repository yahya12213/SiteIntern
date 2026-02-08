import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  FileText,
  Briefcase,
  AlertTriangle,
  Download,
  Loader2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import EmployeeFormModal from '@/components/admin/hr/EmployeeFormModal';
import { DocumentUploadModal } from '@/components/admin/hr/DocumentUploadModal';
import { ContractFormModal } from '@/components/admin/hr/ContractFormModal';
import { DisciplinaryFormModal } from '@/components/admin/hr/DisciplinaryFormModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  cin: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  employment_status: string;
  hire_date: string;
  segment_name: string;
  requires_clocking: boolean;
}

interface Contract {
  id: string;
  employee_id: string;
  employee_name: string;
  contract_type: 'cdi' | 'cdd' | 'stage' | 'interim';
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  base_salary: number;
  position: string;
  department: string;
  status: 'active' | 'expired' | 'terminated';
  created_at: string;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  employee_name: string;
  document_type: 'cin' | 'diploma' | 'certificate' | 'medical' | 'rib' | 'other';
  document_name: string;
  file_path: string;
  expiry_date?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  uploaded_at: string;
}

interface DisciplinaryAction {
  id: string;
  employee_id: string;
  employee_name: string;
  action_type: 'warning_verbal' | 'warning_written' | 'blame' | 'suspension' | 'demotion' | 'termination';
  incident_date: string;
  description: string;
  decision: string;
  decision_date: string;
  appeal_deadline?: string;
  appeal_status?: 'none' | 'pending' | 'accepted' | 'rejected';
  attachments?: string[];
  created_by_name: string;
  created_at: string;
}

const CONTRACT_TYPES = {
  cdi: { label: 'CDI', className: 'bg-green-100 text-green-800' },
  cdd: { label: 'CDD', className: 'bg-blue-100 text-blue-800' },
  stage: { label: 'Stage', className: 'bg-purple-100 text-purple-800' },
  interim: { label: 'Intérim', className: 'bg-orange-100 text-orange-800' },
};

const DOCUMENT_TYPES = {
  cin: 'Carte d\'Identité Nationale',
  diploma: 'Diplôme',
  certificate: 'Certificat',
  medical: 'Certificat Médical',
  rib: 'RIB Bancaire',
  other: 'Autre',
};

const DISCIPLINARY_TYPES = {
  warning_verbal: { label: 'Avertissement verbal', severity: 1, className: 'bg-yellow-100 text-yellow-800' },
  warning_written: { label: 'Avertissement écrit', severity: 2, className: 'bg-orange-100 text-orange-800' },
  blame: { label: 'Blâme', severity: 3, className: 'bg-orange-200 text-orange-900' },
  suspension: { label: 'Mise à pied', severity: 4, className: 'bg-red-100 text-red-800' },
  demotion: { label: 'Rétrogradation', severity: 5, className: 'bg-red-200 text-red-900' },
  termination: { label: 'Licenciement', severity: 6, className: 'bg-red-600 text-white' },
};

export default function HREmployees() {
  const { hr } = usePermission();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'contracts' | 'documents' | 'disciplinary'>('list');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Delete confirmation
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Contract modal (controlled by selectedContract)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Document modal (controlled by selectedDocument) - reserved for future document details modal
  const [_selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);

  // Disciplinary modal (controlled by selectedDisciplinary)
  const [selectedDisciplinary, setSelectedDisciplinary] = useState<DisciplinaryAction | null>(null);

  // Upload modals - for adding new documents/contracts/disciplinary
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [showContractFormModal, setShowContractFormModal] = useState(false);
  const [showDisciplinaryFormModal, setShowDisciplinaryFormModal] = useState(false);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState<{ id: string; name: string } | null>(null);

  // Fetch employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['hr-employees', searchTerm, statusFilter, departmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const response = await apiClient.get<{ success: boolean; data: Employee[] }>(`/hr/employees?${params.toString()}`);
      return (response as { data: Employee[] }).data;
    },
  });

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: string[] }>('/hr/employees/meta/departments');
      return (response as { data: string[] }).data;
    },
  });

  // Fetch contracts
  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['hr-all-contracts'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Contract[] }>('/hr/employees/all-contracts');
      return (response as { data: Contract[] }).data;
    },
    enabled: activeTab === 'contracts',
  });

  // Fetch documents
  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ['hr-all-documents'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: EmployeeDocument[] }>('/hr/employees/all-documents');
      return (response as { data: EmployeeDocument[] }).data;
    },
    enabled: activeTab === 'documents',
  });

  // Fetch disciplinary actions
  const { data: disciplinaryData, isLoading: disciplinaryLoading } = useQuery({
    queryKey: ['hr-all-disciplinary'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: DisciplinaryAction[] }>('/hr/employees/all-disciplinary');
      return (response as { data: DisciplinaryAction[] }).data;
    },
    enabled: activeTab === 'disciplinary',
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/hr/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      toast({
        title: 'Succès',
        description: 'Employé supprimé avec succès',
      });
      setEmployeeToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'employé',
        variant: 'destructive',
      });
    },
  });

  const employees = employeesData || [];
  const departments = departmentsData || [];
  const contracts = contractsData || [];
  const documents = documentsData || [];
  const disciplinaryActions = disciplinaryData || [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      terminated: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      on_leave: 'bg-blue-100 text-blue-800',
    };
    const labels: Record<string, string> = {
      active: 'Actif',
      terminated: 'Terminé',
      suspended: 'Suspendu',
      on_leave: 'En congé',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
  };

  const isContractExpiringSoon = (contract: Contract) => {
    if (!contract.end_date) return false;
    const endDate = new Date(contract.end_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isDocumentExpiringSoon = (doc: EmployeeDocument) => {
    if (!doc.expiry_date) return false;
    const expiryDate = new Date(doc.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    await deleteEmployeeMutation.mutateAsync(employeeToDelete.id);
  };

  const handleExportEmployees = () => {
    // Export to CSV
    const headers = ['Matricule', 'Nom', 'Prénom', 'Email', 'Poste', 'Département', 'Statut', 'Date embauche'];
    const rows = employees.map((e: Employee) => [
      e.employee_number,
      e.last_name,
      e.first_name,
      e.email,
      e.position || '',
      e.department || '',
      e.employment_status,
      e.hire_date,
    ].join(';'));

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export réussi',
      description: `${employees.length} employés exportés`,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-7 w-7 text-blue-600" />
              Dossiers du Personnel
            </h1>
            <p className="text-gray-600 mt-1">
              Gestion des employés, contrats et documents administratifs
            </p>
          </div>
          {hr.canCreateEmployee && (
            <button
              type="button"
              onClick={() => {
                setSelectedEmployeeId(null);
                setShowEmployeeModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Nouvel Employé
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Liste des Employés
            </button>
            {hr.canViewContracts && (
              <button
                type="button"
                onClick={() => setActiveTab('contracts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'contracts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Briefcase className="h-4 w-4 inline mr-2" />
                Contrats
                {contracts.filter(c => isContractExpiringSoon(c)).length > 0 && (
                  <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {contracts.filter(c => isContractExpiringSoon(c)).length}
                  </span>
                )}
              </button>
            )}
            {hr.canManageDocuments && (
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Documents
                {documents.filter(d => !d.is_verified).length > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {documents.filter(d => !d.is_verified).length}
                  </span>
                )}
              </button>
            )}
            {hr.canViewDisciplinary && (
              <button
                type="button"
                onClick={() => setActiveTab('disciplinary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'disciplinary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Disciplinaire
              </button>
            )}
          </nav>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="on_leave">En congé</option>
                <option value="suspended">Suspendu</option>
                <option value="terminated">Terminé</option>
              </select>
            </div>
            <div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les départements</option>
                {departments.map((dept: string) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportEmployees}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Exporter
              </button>
            </div>
          </div>
        </div>

        {/* Content - Employees List */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                <p className="mt-2 text-gray-600">Chargement des employés...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-600">Aucun employé trouvé</p>
                {hr.canCreateEmployee && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployeeId(null);
                      setShowEmployeeModal(true);
                    }}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Ajouter un employé
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Matricule
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Poste
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Département
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d'embauche
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pointage
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee: Employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.employee_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.position || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(employee.employment_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(employee.hire_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {employee.requires_clocking ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Pointeur
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Non
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {hr.canUpdateEmployee && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmployeeId(employee.id);
                                  setShowEmployeeModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Modifier l'employé"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            {hr.canDeleteEmployee && (
                              <button
                                type="button"
                                onClick={() => setEmployeeToDelete(employee)}
                                className="text-red-600 hover:text-red-900"
                                title="Supprimer l'employé"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
        )}

        {/* Content - Contracts Tab */}
        {activeTab === 'contracts' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Add Contract Button */}
            {hr.canViewContracts && employees.length > 0 && (
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Gérez les contrats de travail des employés
                </p>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Sélectionner un employé pour le contrat"
                    className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const emp = employees.find((emp: Employee) => emp.id === e.target.value);
                      if (emp) {
                        setSelectedEmployeeForModal({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` });
                      }
                    }}
                    value={selectedEmployeeForModal?.id || ''}
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map((emp: Employee) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEmployeeForModal) {
                        setShowContractFormModal(true);
                      }
                    }}
                    disabled={!selectedEmployeeForModal}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un contrat
                  </button>
                </div>
              </div>
            )}
            {contractsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                <p className="mt-2 text-gray-600">Chargement des contrats...</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="p-8 text-center">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-600">Aucun contrat trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Poste
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Période
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salaire de base
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
                    {contracts.map((contract: Contract) => {
                      const typeConfig = CONTRACT_TYPES[contract.contract_type] || { label: contract.contract_type, className: 'bg-gray-100 text-gray-800' };
                      const expiringSoon = isContractExpiringSoon(contract);
                      return (
                        <tr key={contract.id} className={`hover:bg-gray-50 ${expiringSoon ? 'bg-orange-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{contract.employee_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeConfig.className}`}>
                              {typeConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {contract.position}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-1">
                              {formatDate(contract.start_date)}
                              {contract.end_date && (
                                <>
                                  <span className="text-gray-400">→</span>
                                  <span className={expiringSoon ? 'text-orange-600 font-medium' : ''}>
                                    {formatDate(contract.end_date)}
                                  </span>
                                  {expiringSoon && (
                                    <AlertCircle className="h-4 w-4 text-orange-500 ml-1" />
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {formatMoney(contract.base_salary)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={
                              contract.status === 'active' ? 'bg-green-100 text-green-800' :
                              contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {contract.status === 'active' ? 'Actif' :
                               contract.status === 'expired' ? 'Expiré' : 'Terminé'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedContract(contract)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Contract alerts */}
            {contracts.filter(c => isContractExpiringSoon(c)).length > 0 && (
              <div className="p-4 bg-orange-50 border-t border-orange-100">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">
                    {contracts.filter(c => isContractExpiringSoon(c)).length} contrat(s) expirent dans les 30 prochains jours
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content - Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Add Document Button */}
            {hr.canManageDocuments && employees.length > 0 && (
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Gérez les documents administratifs des employés (CV, diplômes, CIN, RIB, etc.)
                </p>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Sélectionner un employé pour le document"
                    className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const emp = employees.find((emp: Employee) => emp.id === e.target.value);
                      if (emp) {
                        setSelectedEmployeeForModal({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` });
                      }
                    }}
                    value={selectedEmployeeForModal?.id || ''}
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map((emp: Employee) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEmployeeForModal) {
                        setShowDocumentUploadModal(true);
                      }
                    }}
                    disabled={!selectedEmployeeForModal}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un document
                  </button>
                </div>
              </div>
            )}
            {documentsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                <p className="mt-2 text-gray-600">Chargement des documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-600">Aucun document trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom du document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d'expiration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vérification
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((doc: EmployeeDocument) => {
                      const expiringSoon = isDocumentExpiringSoon(doc);
                      return (
                        <tr key={doc.id} className={`hover:bg-gray-50 ${expiringSoon ? 'bg-orange-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{doc.employee_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {DOCUMENT_TYPES[doc.document_type] || doc.document_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {doc.document_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {doc.expiry_date ? (
                              <span className={expiringSoon ? 'text-orange-600 font-medium flex items-center gap-1' : 'text-gray-900'}>
                                {formatDate(doc.expiry_date)}
                                {expiringSoon && <AlertCircle className="h-4 w-4" />}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {doc.is_verified ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Vérifié
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-yellow-600">
                                <Clock className="h-4 w-4" />
                                En attente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => window.open(doc.file_path, '_blank')}
                                className="text-blue-600 hover:text-blue-900"
                                title="Voir le document"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {!doc.is_verified && hr.canManageDocuments && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocument(doc)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Vérifier le document"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Document alerts */}
            {documents.filter(d => !d.is_verified).length > 0 && (
              <div className="p-4 bg-yellow-50 border-t border-yellow-100">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">
                    {documents.filter(d => !d.is_verified).length} document(s) en attente de vérification
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content - Disciplinary Tab */}
        {activeTab === 'disciplinary' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Add Disciplinary Action Button */}
            {hr.canViewDisciplinary && employees.length > 0 && (
              <div className="p-4 border-b bg-red-50 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Gérez les actions disciplinaires (avertissements, blâmes, mises à pied, etc.)
                </p>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Sélectionner un employé pour l'action disciplinaire"
                    className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-red-500"
                    onChange={(e) => {
                      const emp = employees.find((emp: Employee) => emp.id === e.target.value);
                      if (emp) {
                        setSelectedEmployeeForModal({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` });
                      }
                    }}
                    value={selectedEmployeeForModal?.id || ''}
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map((emp: Employee) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEmployeeForModal) {
                        setShowDisciplinaryFormModal(true);
                      }
                    }}
                    disabled={!selectedEmployeeForModal}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    Nouvelle action
                  </button>
                </div>
              </div>
            )}
            {disciplinaryLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                <p className="mt-2 text-gray-600">Chargement des actions disciplinaires...</p>
              </div>
            ) : disciplinaryActions.length === 0 ? (
              <div className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-600">Aucune action disciplinaire</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date incident
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recours
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {disciplinaryActions.map((action: DisciplinaryAction) => {
                      const typeConfig = DISCIPLINARY_TYPES[action.action_type] || { label: action.action_type, className: 'bg-gray-100 text-gray-800' };
                      return (
                        <tr key={action.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{action.employee_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeConfig.className}`}>
                              {typeConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(action.incident_date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {action.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {action.appeal_status === 'pending' ? (
                              <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>
                            ) : action.appeal_status === 'accepted' ? (
                              <Badge className="bg-green-100 text-green-800">Accepté</Badge>
                            ) : action.appeal_status === 'rejected' ? (
                              <Badge className="bg-red-100 text-red-800">Rejeté</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedDisciplinary(action)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Employés</div>
            <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Actifs</div>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter((e: Employee) => e.employment_status === 'active').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">En congé</div>
            <div className="text-2xl font-bold text-blue-600">
              {employees.filter((e: Employee) => e.employment_status === 'on_leave').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Suspendus</div>
            <div className="text-2xl font-bold text-yellow-600">
              {employees.filter((e: Employee) => e.employment_status === 'suspended').length}
            </div>
          </div>
        </div>

        {/* Employee Form Modal */}
        {showEmployeeModal && (
          <EmployeeFormModal
            employeeId={selectedEmployeeId}
            onClose={() => {
              setShowEmployeeModal(false);
              setSelectedEmployeeId(null);
            }}
          />
        )}

        {/* Delete Employee Confirmation */}
        <AlertDialog open={!!employeeToDelete} onOpenChange={() => setEmployeeToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'employé ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer {employeeToDelete?.first_name} {employeeToDelete?.last_name} ?
                Cette action est irréversible et supprimera toutes les données associées (contrats, documents, etc.).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEmployee}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteEmployeeMutation.isPending}
              >
                {deleteEmployeeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Contract Details Modal */}
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détails du contrat</DialogTitle>
            </DialogHeader>
            {selectedContract && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Employé</Label>
                    <p className="font-medium">{selectedContract.employee_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Type de contrat</Label>
                    <p className="font-medium">
                      {CONTRACT_TYPES[selectedContract.contract_type]?.label || selectedContract.contract_type}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Poste</Label>
                    <p className="font-medium">{selectedContract.position}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Département</Label>
                    <p className="font-medium">{selectedContract.department}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Date de début</Label>
                    <p className="font-medium">{formatDate(selectedContract.start_date)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Date de fin</Label>
                    <p className="font-medium">
                      {selectedContract.end_date ? formatDate(selectedContract.end_date) : 'Indéterminée'}
                    </p>
                  </div>
                  {selectedContract.trial_end_date && (
                    <div>
                      <Label className="text-gray-500">Fin période d'essai</Label>
                      <p className="font-medium">{formatDate(selectedContract.trial_end_date)}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-500">Salaire de base</Label>
                    <p className="font-medium text-green-600">{formatMoney(selectedContract.base_salary)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedContract(null)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Disciplinary Details Modal */}
        <Dialog open={!!selectedDisciplinary} onOpenChange={() => setSelectedDisciplinary(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Action disciplinaire</DialogTitle>
            </DialogHeader>
            {selectedDisciplinary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Employé</Label>
                    <p className="font-medium">{selectedDisciplinary.employee_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Type</Label>
                    <p className="font-medium">
                      {DISCIPLINARY_TYPES[selectedDisciplinary.action_type]?.label || selectedDisciplinary.action_type}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Date de l'incident</Label>
                    <p className="font-medium">{formatDate(selectedDisciplinary.incident_date)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Date de décision</Label>
                    <p className="font-medium">{formatDate(selectedDisciplinary.decision_date)}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Description</Label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDisciplinary.description}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Décision</Label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDisciplinary.decision}</p>
                </div>
                {selectedDisciplinary.appeal_deadline && (
                  <div>
                    <Label className="text-gray-500">Date limite de recours</Label>
                    <p className="font-medium">{formatDate(selectedDisciplinary.appeal_deadline)}</p>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Créé par {selectedDisciplinary.created_by_name} le {formatDate(selectedDisciplinary.created_at)}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDisciplinary(null)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Upload Modal */}
        {showDocumentUploadModal && selectedEmployeeForModal && (
          <DocumentUploadModal
            employeeId={selectedEmployeeForModal.id}
            employeeName={selectedEmployeeForModal.name}
            onClose={() => {
              setShowDocumentUploadModal(false);
              setSelectedEmployeeForModal(null);
            }}
          />
        )}

        {/* Contract Form Modal */}
        {showContractFormModal && selectedEmployeeForModal && (
          <ContractFormModal
            employeeId={selectedEmployeeForModal.id}
            employeeName={selectedEmployeeForModal.name}
            onClose={() => {
              setShowContractFormModal(false);
              setSelectedEmployeeForModal(null);
            }}
          />
        )}

        {/* Disciplinary Form Modal */}
        {showDisciplinaryFormModal && selectedEmployeeForModal && (
          <DisciplinaryFormModal
            employeeId={selectedEmployeeForModal.id}
            employeeName={selectedEmployeeForModal.name}
            onClose={() => {
              setShowDisciplinaryFormModal(false);
              setSelectedEmployeeForModal(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
