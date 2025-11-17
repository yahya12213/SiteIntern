import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { rolesApi, type Role, type Permission, type GroupedPermissions } from '@/lib/api/roles';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Key,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  CheckSquare,
  Square,
} from 'lucide-react';

export const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rolesApi.getAllRoles(),
        rolesApi.getAllPermissions(),
      ]);

      if (rolesRes.success) setRoles(rolesRes.roles);
      if (permsRes.success) {
        setPermissions(permsRes.permissions);
        setGroupedPermissions(permsRes.grouped);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoleDetails = async (role: Role) => {
    try {
      const res = await rolesApi.getRole(role.id);
      if (res.success) {
        setSelectedRole(role);
        setRolePermissions(res.permissions.map(p => p.id));
        setRoleUsers(res.users);
      }
    } catch (error: any) {
      console.error('Error loading role details:', error);
    }
  };

  const handleCreateRole = async () => {
    if (!formName.trim()) {
      alert('Le nom du rôle est requis');
      return;
    }

    setIsSaving(true);
    try {
      const res = await rolesApi.createRole({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        permission_ids: Array.from(formPermissions),
      });

      if (res.success) {
        alert('Rôle créé avec succès');
        setShowCreateModal(false);
        resetForm();
        loadData();
      }
    } catch (error: any) {
      alert('Erreur: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    try {
      const res = await rolesApi.updateRole(selectedRole.id, {
        name: formName.trim() || undefined,
        description: formDescription.trim(),
        permission_ids: Array.from(formPermissions),
      });

      if (res.success) {
        alert('Rôle mis à jour avec succès');
        setShowEditModal(false);
        resetForm();
        loadData();
        setSelectedRole(null);
      }
    } catch (error: any) {
      alert('Erreur: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system_role) {
      alert('Impossible de supprimer un rôle système');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?`)) {
      return;
    }

    try {
      const res = await rolesApi.deleteRole(role.id);
      if (res.success) {
        alert('Rôle supprimé');
        loadData();
        if (selectedRole?.id === role.id) {
          setSelectedRole(null);
        }
      }
    } catch (error: any) {
      alert('Erreur: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPermissions(new Set());
  };

  const openEditModal = (role: Role) => {
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions(new Set(rolePermissions));
    setShowEditModal(true);
  };

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  const togglePermission = (permId: string) => {
    setFormPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permId)) {
        newSet.delete(permId);
      } else {
        newSet.add(permId);
      }
      return newSet;
    });
  };

  const toggleAllInModule = (module: string) => {
    const modulePerms = groupedPermissions[module] || [];
    const allSelected = modulePerms.every(p => formPermissions.has(p.id));

    setFormPermissions(prev => {
      const newSet = new Set(prev);
      modulePerms.forEach(p => {
        if (allSelected) {
          newSet.delete(p.id);
        } else {
          newSet.add(p.id);
        }
      });
      return newSet;
    });
  };

  const moduleLabels: Record<string, string> = {
    users: 'Utilisateurs',
    students: 'Étudiants',
    sessions: 'Sessions',
    documents: 'Documents',
    finances: 'Finances',
    formations: 'Formations',
    settings: 'Paramètres',
    reports: 'Rapports',
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Rôles</h1>
              <p className="text-sm text-gray-600">
                Créez et gérez les rôles et permissions des utilisateurs
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouveau Rôle
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Rôles ({roles.length})</h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedRole?.id === role.id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                    }`}
                    onClick={() => loadRoleDetails(role)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {role.is_system_role ? (
                          <Lock className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Unlock className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-medium text-gray-900">{role.name}</span>
                      </div>
                      {!role.is_system_role && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{role.description || 'Pas de description'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        {role.permission_count || 0} permissions
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {role.user_count || 0} utilisateurs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Role Details */}
          <div className="lg:col-span-2">
            {selectedRole ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedRole.name}
                      {selectedRole.is_system_role && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          Système
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-600">{selectedRole.description}</p>
                  </div>
                  <button
                    onClick={() => openEditModal(selectedRole)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4" />
                    Modifier
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Permissions ({rolePermissions.length})
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {Object.entries(groupedPermissions).map(([module, perms]) => {
                      const hasAny = perms.some(p => rolePermissions.includes(p.id));
                      if (!hasAny) return null;
                      return (
                        <div key={module} className="bg-gray-50 rounded-lg p-3">
                          <div className="font-medium text-gray-700 mb-2">
                            {moduleLabels[module] || module}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {perms
                              .filter(p => rolePermissions.includes(p.id))
                              .map(perm => (
                                <span
                                  key={perm.id}
                                  className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
                                >
                                  {perm.name}
                                </span>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Utilisateurs avec ce rôle ({roleUsers.length})
                  </h3>
                  {roleUsers.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {roleUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                        >
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{user.full_name}</span>
                          <span className="text-sm text-gray-500">({user.username})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Aucun utilisateur</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez un rôle pour voir ses détails</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Créer un nouveau rôle</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du rôle *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="ex: assistante, comptable, superviseur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    placeholder="Décrivez les responsabilités de ce rôle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions ({formPermissions.size} sélectionnées)
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-[300px] overflow-y-auto">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module} className="border-b border-gray-200 last:border-0">
                        <div
                          className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                          onClick={() => toggleModule(module)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedModules.has(module) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{moduleLabels[module] || module}</span>
                            <span className="text-xs text-gray-500">({perms.length})</span>
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              toggleAllInModule(module);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800"
                          >
                            {perms.every(p => formPermissions.has(p.id)) ? 'Désélectionner tout' : 'Sélectionner tout'}
                          </button>
                        </div>
                        {expandedModules.has(module) && (
                          <div className="p-3 space-y-2">
                            {perms.map(perm => (
                              <label
                                key={perm.id}
                                className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={formPermissions.has(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                  className="mt-1"
                                />
                                <div>
                                  <div className="font-medium text-sm">{perm.name}</div>
                                  <div className="text-xs text-gray-500">{perm.description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateRole}
                disabled={isSaving || !formName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Création...' : 'Créer le rôle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Modifier le rôle: {selectedRole.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du rôle
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    disabled={selectedRole.is_system_role}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                  {selectedRole.is_system_role && (
                    <p className="text-xs text-orange-600 mt-1">
                      Le nom des rôles système ne peut pas être modifié
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions ({formPermissions.size} sélectionnées)
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-[300px] overflow-y-auto">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module} className="border-b border-gray-200 last:border-0">
                        <div
                          className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                          onClick={() => toggleModule(module)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedModules.has(module) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{moduleLabels[module] || module}</span>
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              toggleAllInModule(module);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800"
                          >
                            {perms.every(p => formPermissions.has(p.id)) ? 'Désélectionner' : 'Tout sélectionner'}
                          </button>
                        </div>
                        {expandedModules.has(module) && (
                          <div className="p-3 space-y-2">
                            {perms.map(perm => (
                              <label key={perm.id} className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formPermissions.has(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                  className="mt-1"
                                />
                                <div>
                                  <div className="font-medium text-sm">{perm.name}</div>
                                  <div className="text-xs text-gray-500">{perm.description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700">
                Annuler
              </button>
              <button
                onClick={handleEditRole}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
