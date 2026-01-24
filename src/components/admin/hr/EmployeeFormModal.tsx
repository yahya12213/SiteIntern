import { useState, useEffect } from 'react';
import { X, UserPlus, User, Mail, Phone, Calendar, MapPin, Briefcase, Hash, AlertCircle, Plus, Trash2, Users } from 'lucide-react';
import { ProtectedButton } from '@/components/ui/ProtectedButton';
import { apiClient } from '@/lib/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSegments } from '@/hooks/useSegments';

interface ManagerEntry {
  manager_id: string;
  rank: number;
  manager_name?: string;
}

interface EmployeeFormModalProps {
  employeeId: string | null;
  onClose: () => void;
}

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  cin?: string;
  birth_date?: string;
  birth_place?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  hire_date: string;
  termination_date?: string;
  employment_status: 'active' | 'terminated' | 'suspended' | 'on_leave';
  employment_type?: 'full_time' | 'part_time' | 'intern' | 'freelance' | 'temporary';
  position?: string;
  segment_id?: string;
  manager_id?: string;
  notes?: string;
  requires_clocking?: boolean;
}

export default function EmployeeFormModal({ employeeId, onClose }: EmployeeFormModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    employee_number: '',
    first_name: '',
    last_name: '',
    cin: '',
    birth_date: '',
    birth_place: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    hire_date: '',
    termination_date: '',
    employment_status: 'active',
    employment_type: 'full_time',
    position: '',
    segment_id: '',
    notes: '',
    requires_clocking: false,
    profile_id: '',
  });

  // State pour les managers multiples avec rangs
  const [employeeManagers, setEmployeeManagers] = useState<ManagerEntry[]>([]);

  const isEdit = !!employeeId;

  // Fetch employee data if editing
  const { data: employeeData } = useQuery({
    queryKey: ['hr-employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const response = await apiClient.get(`/hr/employees/${employeeId}`);
      return (response as any).data as Employee;
    },
    enabled: !!employeeId,
  });

  // Fetch segments for dropdown
  const { data: segments = [] } = useSegments();

  // Fetch potential managers (active employees)
  const { data: managersData } = useQuery({
    queryKey: ['hr-potential-managers'],
    queryFn: async () => {
      const response = await apiClient.get('/hr/employees?status=active');
      return (response as any).data as Employee[];
    },
  });
  const managers = managersData || [];

  // Fetch available profiles for linking (not already linked to other employees)
  const { data: profilesData } = useQuery({
    queryKey: ['available-profiles', employeeId],
    queryFn: async () => {
      const params = employeeId ? `?current_employee_id=${employeeId}` : '';
      const response = await apiClient.get(`/profiles/available-for-employee${params}`);
      return (response as any).data as Array<{ id: string; username: string; full_name: string }>;
    },
  });
  const availableProfiles = profilesData || [];

  // Fetch existing managers for this employee (when editing)
  const { data: existingManagersData } = useQuery({
    queryKey: ['hr-employee-managers', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const response = await apiClient.get(`/hr/employees/${employeeId}/managers`);
      return (response as any).data as Array<{ manager_id: string; rank: number; manager_name: string }>;
    },
    enabled: !!employeeId,
  });

  // Helper to format date for input type="date" (YYYY-MM-DD)
  const formatDateForInput = (dateValue: string | null | undefined): string => {
    if (!dateValue) return '';
    // Handle ISO date strings like "2024-01-15T00:00:00.000Z"
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // Load employee data when editing
  useEffect(() => {
    if (employeeData) {
      setFormData({
        employee_number: employeeData.employee_number || '',
        first_name: employeeData.first_name || '',
        last_name: employeeData.last_name || '',
        cin: employeeData.cin || '',
        birth_date: formatDateForInput(employeeData.birth_date),
        birth_place: employeeData.birth_place || '',
        email: employeeData.email || '',
        phone: employeeData.phone || '',
        address: employeeData.address || '',
        postal_code: employeeData.postal_code || '',
        city: employeeData.city || '',
        emergency_contact_name: employeeData.emergency_contact_name || '',
        emergency_contact_phone: employeeData.emergency_contact_phone || '',
        hire_date: formatDateForInput(employeeData.hire_date),
        termination_date: formatDateForInput(employeeData.termination_date),
        employment_status: employeeData.employment_status || 'active',
        employment_type: employeeData.employment_type || 'full_time',
        position: employeeData.position || '',
        segment_id: employeeData.segment_id || '',
        notes: employeeData.notes || '',
        requires_clocking: employeeData.requires_clocking || false,
        profile_id: (employeeData as any).profile_id || '',
      });
    }
  }, [employeeData]);

  // Load existing managers when editing
  useEffect(() => {
    if (existingManagersData && existingManagersData.length > 0) {
      setEmployeeManagers(
        existingManagersData.map(m => ({
          manager_id: m.manager_id,
          rank: m.rank,
          manager_name: m.manager_name
        }))
      );
    }
  }, [existingManagersData]);

  // Mutation pour sauvegarder les managers d'un employé
  const saveManagers = async (empId: string) => {
    if (employeeManagers.length > 0) {
      await apiClient.put(`/hr/employees/${empId}/managers`, {
        managers: employeeManagers.map(m => ({
          manager_id: m.manager_id,
          rank: m.rank
        }))
      });
    }
  };

  // Create mutation
  const createEmployee = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.post('/hr/employees', data);
      return (response as any).data as Employee;
    },
    onSuccess: async (newEmployee) => {
      // Sauvegarder les managers après création
      if (employeeManagers.length > 0) {
        try {
          await saveManagers(newEmployee.id);
        } catch (error) {
          console.error('Erreur lors de la sauvegarde des managers:', error);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr-potential-managers'] });
      onClose();
    },
  });

  // Update mutation
  const updateEmployee = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.put(`/hr/employees/${employeeId}`, data);
      return (response as any).data as Employee;
    },
    onSuccess: async () => {
      // Sauvegarder les managers après mise à jour
      try {
        await saveManagers(employeeId!);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des managers:', error);
      }
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr-employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['hr-employee-managers', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['hr-potential-managers'] });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.employee_number.trim() || !formData.hire_date) {
      alert('Veuillez remplir tous les champs obligatoires (Matricule, Prénom, Nom, Date d\'embauche)');
      return;
    }

    // Validation des managers: si des managers sont définis, le rang 0 (N) est obligatoire
    if (employeeManagers.length > 0 && !employeeManagers.some(m => m.rank === 0)) {
      alert('Un manager direct (rang N) est obligatoire');
      return;
    }

    try {
      if (isEdit) {
        await updateEmployee.mutateAsync(formData);
      } else {
        await createEmployee.mutateAsync(formData);
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(error.response?.data?.error || 'Erreur lors de la sauvegarde de l\'employé');
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEdit
                  ? `${employeeData?.first_name || ''} ${employeeData?.last_name || ''}`.trim() || 'Modifier l\'employé'
                  : 'Nouvel employé'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEdit ? 'Modifier les informations de l\'employé' : 'Ajoutez un nouvel employé au système RH'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations de base */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Informations de base
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Matricule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matricule *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={formData.employee_number}
                    onChange={(e) => handleChange('employee_number', e.target.value)}
                    placeholder="Ex: EMP001"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Prénom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="Ex: Ahmed"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Ex: Benali"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* CIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CIN
                </label>
                <input
                  type="text"
                  value={formData.cin}
                  onChange={(e) => handleChange('cin', e.target.value.toUpperCase())}
                  placeholder="Ex: AB123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                />
              </div>

              {/* Date de naissance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de naissance
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Lieu de naissance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu de naissance
                </label>
                <input
                  type="text"
                  value={formData.birth_place}
                  onChange={(e) => handleChange('birth_place', e.target.value)}
                  placeholder="Ex: Casablanca"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="0612345678"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Adresse complète"
                    rows={2}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Code postal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  placeholder="Ex: 20000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Ville */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ex: Casablanca"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Contact d'urgence */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Contact d'urgence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom contact urgence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du contact
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                  placeholder="Nom complet"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Téléphone contact urgence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone du contact
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                    placeholder="0612345678"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informations professionnelles */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Informations professionnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date d'embauche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'embauche *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) => handleChange('hire_date', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Statut d'emploi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut d'emploi
                </label>
                <select
                  value={formData.employment_status}
                  onChange={(e) => handleChange('employment_status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Actif</option>
                  <option value="on_leave">En congé</option>
                  <option value="suspended">Suspendu</option>
                  <option value="terminated">Terminé</option>
                </select>
              </div>

              {/* Type d'emploi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'emploi
                </label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => handleChange('employment_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="full_time">Temps plein</option>
                  <option value="part_time">Temps partiel</option>
                  <option value="intern">Stagiaire</option>
                  <option value="freelance">Freelance</option>
                  <option value="temporary">Temporaire</option>
                </select>
              </div>

              {/* Poste */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poste
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                  placeholder="Ex: Développeur"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Segment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Segment
                </label>
                <select
                  value={formData.segment_id}
                  onChange={(e) => handleChange('segment_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Aucun segment</option>
                  {segments.map((segment: { id: string; name: string }) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Managers multiples avec rangs */}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Users className="w-4 h-4 text-blue-600" />
                    Chaîne hiérarchique
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      // Trouver le prochain rang disponible
                      const existingRanks = employeeManagers.map(m => m.rank);
                      let nextRank = 0;
                      while (existingRanks.includes(nextRank)) {
                        nextRank++;
                      }
                      setEmployeeManagers([...employeeManagers, { manager_id: '', rank: nextRank }]);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un niveau
                  </button>
                </div>

                {employeeManagers.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Aucun manager configuré</p>
                    <p className="text-xs text-gray-400 mt-1">Cliquez sur "Ajouter un niveau" pour configurer la chaîne hiérarchique</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {employeeManagers
                      .sort((a, b) => a.rank - b.rank)
                      .map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          {/* Badge du rang */}
                          <div className="flex-shrink-0 w-16 text-center">
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              entry.rank === 0
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              N{entry.rank === 0 ? '' : `+${entry.rank}`}
                            </span>
                          </div>

                          {/* Select du manager */}
                          <select
                            value={entry.manager_id}
                            onChange={(e) => {
                              const newManagers = [...employeeManagers];
                              newManagers[index] = { ...entry, manager_id: e.target.value };
                              setEmployeeManagers(newManagers);
                            }}
                            title={`Manager niveau N${entry.rank === 0 ? '' : `+${entry.rank}`}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="">Sélectionner un manager</option>
                            {managers
                              .filter((m: Employee) =>
                                m.id !== employeeId && // Ne pas se sélectionner soi-même
                                !employeeManagers.some(em => em.manager_id === m.id && em !== entry) // Ne pas avoir le même manager 2 fois
                              )
                              .map((manager: Employee) => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.first_name} {manager.last_name} - {manager.position || 'N/A'}
                                </option>
                              ))}
                          </select>

                          {/* Bouton supprimer */}
                          <button
                            type="button"
                            onClick={() => {
                              setEmployeeManagers(employeeManagers.filter((_, i) => i !== index));
                            }}
                            className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer ce niveau"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                    <p className="text-xs text-gray-500 mt-2">
                      <strong>N</strong> = Manager direct (obligatoire), <strong>N+1</strong> = Supérieur du manager, <strong>N+2, N+3...</strong> = Niveaux supérieurs.
                      Les demandes suivent cette chaîne séquentiellement.
                    </p>
                  </div>
                )}
              </div>

              {/* Date de fin (si terminé) */}
              {formData.employment_status === 'terminated' && (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin de contrat
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={formData.termination_date}
                      onChange={(e) => handleChange('termination_date', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compte utilisateur */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              Compte utilisateur
            </h3>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <label htmlFor="profile_id" className="block text-sm font-medium text-gray-700 mb-2">
                Lier a un compte utilisateur
              </label>
              <select
                id="profile_id"
                value={formData.profile_id}
                onChange={(e) => handleChange('profile_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Aucun compte lie</option>
                {availableProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.username} {profile.full_name ? `(${profile.full_name})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                Necessaire pour que l'employe puisse pointer via son compte.
                Seuls les comptes non lies a d'autres employes sont affiches.
              </p>
            </div>
          </div>

          {/* Requires Clocking Checkbox */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <input
              type="checkbox"
              id="requires_clocking"
              checked={formData.requires_clocking}
              onChange={(e) => handleChange('requires_clocking', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <label htmlFor="requires_clocking" className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                Cet employé doit pointer
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Si coché, l'employé devra enregistrer ses heures d'arrivée et de départ.
                Les vacataires et partenaires ne doivent pas pointer.
              </div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notes internes sur l'employé..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <ProtectedButton
              permission={isEdit ? 'hr.employees.update' : 'hr.employees.create'}
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending
                ? 'Enregistrement...'
                : isEdit
                ? 'Mettre à jour'
                : 'Créer l\'employé'}
            </ProtectedButton>
          </div>
        </form>
      </div>
    </div>
  );
}
