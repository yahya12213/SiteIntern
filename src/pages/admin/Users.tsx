import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, MapPin, Calculator, Shield, User, Users as UsersIcon, Eye, EyeOff, Briefcase, FileCheck, ClipboardList, Clock, Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useAssignSegments,
  useAssignCities,
  useUserSegments,
  useUserCities,
  useAllSegments,
  useAllCities,
  type User as UserType,
} from '@/hooks/useUsers';
import { rolesApi, type Role } from '@/lib/api/roles';

const Users: React.FC = () => {
  const { user: currentUser, refreshUser } = useAuth();
  const { accounting } = usePermission();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignSegmentsModalOpen, setIsAssignSegmentsModalOpen] = useState(false);
  const [isAssignCitiesModalOpen, setIsAssignCitiesModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  const { data: users, isLoading } = useUsers(roleFilter as any);

  // Filtrer les utilisateurs par recherche
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm.trim()) return users;

    const search = searchTerm.toLowerCase().trim();
    return users.filter(user =>
      user.full_name?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search)
    );
  }, [users, searchTerm]);

  // Réinitialiser les filtres
  const resetFilters = () => {
    setRoleFilter('all');
    setSearchTerm('');
  };

  // Compter les filtres actifs
  const hasActiveFilters = roleFilter !== 'all' || searchTerm.trim() !== '';
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // Fetch available roles from database
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await rolesApi.getAllRoles();
        if (response.success) {
          setAvailableRoles(response.roles);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };
    fetchRoles();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await deleteUser.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; color: string; icon: any }> = {
      admin: { label: 'Administrateur', color: 'bg-red-100 text-red-800', icon: Shield },
      professor: { label: 'Professeur', color: 'bg-blue-100 text-blue-800', icon: User },
      gerant: { label: 'Gérant', color: 'bg-green-100 text-green-800', icon: UsersIcon },
      assistante: { label: 'Assistante', color: 'bg-purple-100 text-purple-800', icon: Briefcase },
      comptable: { label: 'Comptable', color: 'bg-yellow-100 text-yellow-800', icon: FileCheck },
      superviseur: { label: 'Superviseur', color: 'bg-orange-100 text-orange-800', icon: ClipboardList },
    };

    const cfg = config[role];
    if (!cfg) {
      // Fallback for unknown roles - use the role name directly
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <User className="w-3.5 h-3.5" />
          {role}
        </span>
      );
    }

    const Icon = cfg.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    );
  };

  const stats = {
    total: users?.length || 0,
    admin: users?.filter(u => u.role === 'admin').length || 0,
    professor: users?.filter(u => u.role === 'professor').length || 0,
    gerant: users?.filter(u => u.role === 'gerant').length || 0,
  };

  return (
    <AppLayout
      title="Gestion des Utilisateurs"
      subtitle="Créer et gérer les comptes utilisateurs (admin, professeur, gérant)"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        {accounting.canCreateUser && (
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.admin}</p>
                <p className="text-sm text-gray-600">Administrateurs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.professor}</p>
                <p className="text-sm text-gray-600">Professeurs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.gerant}</p>
                <p className="text-sm text-gray-600">Gérants</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barre de recherche */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[250px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom ou username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-500 hover:text-gray-700">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Réinitialiser
                </Button>
              )}
            </div>

            {/* Filtres par rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Par rôle</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                >
                  Tous ({stats.total})
                </Button>
                <Button
                  variant={roleFilter === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('admin')}
                >
                  Administrateurs ({stats.admin})
                </Button>
                <Button
                  variant={roleFilter === 'professor' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('professor')}
                >
                  Professeurs ({stats.professor})
                </Button>
                <Button
                  variant={roleFilter === 'gerant' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('gerant')}
                >
                  Gérants ({stats.gerant})
                </Button>
              </div>
            </div>

            {/* Indicateur de résultats */}
            {hasActiveFilters && (
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{filteredUsers.length}</span> utilisateur(s) trouvé(s)
                  {users && filteredUsers.length !== users.length && (
                    <span> sur {users.length} au total</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des utilisateurs */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Chargement...</p>
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun utilisateur trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom complet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom d'utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date création
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {/* Assigner segments (pour tous les rôles sauf admin) */}
                            {accounting.canAssignSegments && user.role !== 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsAssignSegmentsModalOpen(true);
                                }}
                                title="Assigner segments"
                              >
                                <Calculator className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Assigner villes (pour tous les rôles sauf admin) */}
                            {accounting.canAssignCities && user.role !== 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsAssignCitiesModalOpen(true);
                                }}
                                title="Assigner villes"
                              >
                                <MapPin className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Modifier */}
                            {accounting.canUpdateUser && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Supprimer */}
                            {accounting.canDeleteUser && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(user.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateUserModal
          onClose={() => setIsCreateModalOpen(false)}
          createUser={createUser}
          availableRoles={availableRoles}
        />
      )}

      {isEditModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          updateUser={updateUser}
          availableRoles={availableRoles}
          currentUser={currentUser}
          refreshUser={refreshUser}
        />
      )}

      {isAssignSegmentsModalOpen && selectedUser && (
        <AssignSegmentsModal
          user={selectedUser}
          onClose={() => {
            setIsAssignSegmentsModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}

      {isAssignCitiesModalOpen && selectedUser && (
        <AssignCitiesModal
          user={selectedUser}
          onClose={() => {
            setIsAssignCitiesModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}
      </div>
    </AppLayout>
  );
};

// Modal de création
const CreateUserModal: React.FC<{
  onClose: () => void;
  createUser: ReturnType<typeof useCreateUser>;
  availableRoles: Role[];
}> = ({ onClose, createUser, availableRoles }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'professor',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Nouveaux états pour création d'employé
  const [createEmployee, setCreateEmployee] = useState(false);
  const [employeeData, setEmployeeData] = useState({
    cin: '',
    hire_date: new Date().toISOString().split('T')[0],
    position: '',
    department: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password || !formData.full_name) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      // Combiner les données utilisateur et employé si nécessaire
      const submitData = {
        ...formData,
        ...(createEmployee ? {
          create_employee: true,
          cin: employeeData.cin || undefined,
          hire_date: employeeData.hire_date || undefined,
          position: employeeData.position || undefined,
          department: employeeData.department || undefined,
        } : {})
      };

      await createUser.mutateAsync(submitData);
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Nouvel utilisateur</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Jean Dupont"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'utilisateur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="jeandupont"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {availableRoles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Séparateur et checkbox employé */}
          <div className="border-t pt-4 mt-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={createEmployee}
                onChange={(e) => setCreateEmployee(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <span className="font-medium text-gray-900">Créer comme employé avec pointage</span>
                <p className="text-xs text-gray-500">L'utilisateur pourra pointer ses entrées/sorties</p>
              </div>
            </label>
          </div>

          {/* Champs employé (visibles si checkbox coché) */}
          {createEmployee && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Informations Employé
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CIN
                  </label>
                  <input
                    type="text"
                    value={employeeData.cin}
                    onChange={(e) => setEmployeeData({ ...employeeData, cin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="AB123456"
                  />
                </div>

                <div>
                  <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'embauche
                  </label>
                  <input
                    id="hire_date"
                    type="date"
                    value={employeeData.hire_date}
                    onChange={(e) => setEmployeeData({ ...employeeData, hire_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    title="Date d'embauche de l'employé"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poste
                </label>
                <input
                  type="text"
                  value={employeeData.position}
                  onChange={(e) => setEmployeeData({ ...employeeData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ex: Assistante Administrative"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Département
                </label>
                <input
                  type="text"
                  value={employeeData.department}
                  onChange={(e) => setEmployeeData({ ...employeeData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ex: Administration"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal d'édition
const EditUserModal: React.FC<{
  user: UserType;
  onClose: () => void;
  updateUser: ReturnType<typeof useUpdateUser>;
  availableRoles: Role[];
  currentUser: any;
  refreshUser: () => Promise<void>;
}> = ({ user, onClose, updateUser, availableRoles, currentUser, refreshUser }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    password: '',
    full_name: user.full_name,
    role: user.role,
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updates: any = {
        id: user.id,
        username: formData.username,
        full_name: formData.full_name,
        role: formData.role,
      };

      if (formData.password) {
        updates.password = formData.password;
      }

      await updateUser.mutateAsync(updates);

      // Si l'utilisateur modifié est l'utilisateur actuel, rafraîchir les permissions
      if (currentUser && user.id === currentUser.id) {
        await refreshUser();
        alert('✅ Vos permissions ont été mises à jour avec succès !');
      } else {
        alert('✅ Utilisateur mis à jour avec succès !');
      }

      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('❌ Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Modifier l'utilisateur</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe (laisser vide pour ne pas modifier)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableRoles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal d'assignation de segments
const AssignSegmentsModal: React.FC<{
  user: UserType;
  onClose: () => void;
}> = ({ user, onClose }) => {
  const { data: allSegments } = useAllSegments();
  const { data: userSegments } = useUserSegments(user.id);
  const assignSegments = useAssignSegments();

  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (userSegments) {
      setSelectedSegmentIds(userSegments.map(s => s.id));
    }
  }, [userSegments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await assignSegments.mutateAsync({
        user_id: user.id,
        segment_ids: selectedSegmentIds,
        role: user.role as 'professor' | 'gerant',
      });
      onClose();
    } catch (error) {
      console.error('Error assigning segments:', error);
      alert('Erreur lors de l\'assignation');
    }
  };

  const toggleSegment = (segmentId: string) => {
    setSelectedSegmentIds(prev =>
      prev.includes(segmentId)
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Assigner des segments à {user.full_name}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {allSegments?.map((segment) => (
              <label
                key={segment.id}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSegmentIds.includes(segment.id)}
                  onChange={() => toggleSegment(segment.id)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{segment.name}</span>
                </div>
                <div
                  className="w-4 h-4 rounded-full ml-2"
                  style={{ backgroundColor: segment.color || '#3B82F6' }}
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={assignSegments.isPending}>
              {assignSegments.isPending ? 'Assignation...' : 'Assigner'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal d'assignation de villes
const AssignCitiesModal: React.FC<{
  user: UserType;
  onClose: () => void;
}> = ({ user, onClose }) => {
  const { data: allCities } = useAllCities();
  const { data: allSegments } = useAllSegments();
  const { data: userCities } = useUserCities(user.id);
  const assignCities = useAssignCities();

  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (userCities) {
      setSelectedCityIds(userCities.map(c => c.id));
    }
  }, [userCities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await assignCities.mutateAsync({
        user_id: user.id,
        city_ids: selectedCityIds,
        role: user.role as 'professor' | 'gerant',
      });
      onClose();
    } catch (error) {
      console.error('Error assigning cities:', error);
      alert('Erreur lors de l\'assignation');
    }
  };

  const toggleCity = (cityId: string) => {
    setSelectedCityIds(prev =>
      prev.includes(cityId)
        ? prev.filter(id => id !== cityId)
        : [...prev, cityId]
    );
  };

  const getSegmentName = (segmentId: string) => {
    return allSegments?.find(s => s.id === segmentId)?.name || '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Assigner des villes à {user.full_name}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {allCities?.map((city) => {
              const segmentName = getSegmentName(city.segment_id);
              return (
                <label
                  key={city.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCityIds.includes(city.id)}
                    onChange={() => toggleCity(city.id)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{city.name}</span>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 ml-2 px-1.5 py-0.5 rounded">
                        {city.code}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {segmentName}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={assignCities.isPending}>
              {assignCities.isPending ? 'Assignation...' : 'Assigner'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Users;
