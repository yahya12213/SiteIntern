import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePermission } from '@/hooks/usePermission';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  FileText,
  Briefcase,
  AlertTriangle,
  Filter,
  Download,
} from 'lucide-react';
import api from '@/lib/api';

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
}

export default function HREmployees() {
  const { hr } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'contracts' | 'documents' | 'disciplinary'>('list');

  // Fetch employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['hr-employees', searchTerm, statusFilter, departmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const response = await api.get(`/hr/employees?${params.toString()}`);
      return response.data;
    },
  });

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const response = await api.get('/hr/employees/meta/departments');
      return response.data;
    },
  });

  const employees = employeesData?.data || [];
  const departments = departmentsData?.data || [];

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
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-5 w-5" />
              Nouvel Employé
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
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
                onClick={() => setActiveTab('contracts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'contracts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Briefcase className="h-4 w-4 inline mr-2" />
                Contrats
              </button>
            )}
            {hr.canManageDocuments && (
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Documents
              </button>
            )}
            {hr.canViewDisciplinary && (
              <button
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
              <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                <Filter className="h-4 w-4" />
                Filtres avancés
              </button>
              <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                <Download className="h-4 w-4" />
                Exporter
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Chargement des employés...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-600">Aucun employé trouvé</p>
                {hr.canCreateEmployee && (
                  <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
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
                          {new Date(employee.hire_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {hr.canUpdateEmployee && (
                              <button className="text-blue-600 hover:text-blue-900">
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            {hr.canDeleteEmployee && (
                              <button className="text-red-600 hover:text-red-900">
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

        {activeTab === 'contracts' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Gestion des Contrats</h3>
            <p className="mt-2 text-gray-600">
              Cette fonctionnalité sera disponible prochainement.
            </p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Documents Administratifs</h3>
            <p className="mt-2 text-gray-600">
              Cette fonctionnalité sera disponible prochainement.
            </p>
          </div>
        )}

        {activeTab === 'disciplinary' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Actions Disciplinaires</h3>
            <p className="mt-2 text-gray-600">
              Cette fonctionnalité sera disponible prochainement.
            </p>
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
      </div>
    </AppLayout>
  );
}
