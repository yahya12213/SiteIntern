import { apiClient } from './client';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permission_count?: number;
  user_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
  created_at: string;
}

export interface RoleWithDetails extends Role {
  permissions: Permission[];
  users: { id: string; username: string; full_name: string }[];
}

export interface GroupedPermissions {
  [module: string]: Permission[];
}

export const rolesApi = {
  /**
   * Get all roles
   */
  async getAllRoles(): Promise<{ success: boolean; roles: Role[] }> {
    return apiClient.get('/roles');
  },

  /**
   * Get a specific role with its permissions and users
   */
  async getRole(id: string): Promise<{ success: boolean; role: Role; permissions: Permission[]; users: any[] }> {
    return apiClient.get(`/roles/${id}`);
  },

  /**
   * Create a new role
   */
  async createRole(data: {
    name: string;
    description?: string;
    permission_ids?: string[];
  }): Promise<{ success: boolean; role: Role; message: string }> {
    return apiClient.post('/roles', data);
  },

  /**
   * Update a role
   */
  async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permission_ids?: string[];
    }
  ): Promise<{ success: boolean; role: Role; message: string }> {
    return apiClient.put(`/roles/${id}`, data);
  },

  /**
   * Delete a role
   */
  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/roles/${id}`);
  },

  /**
   * Get all permissions (grouped by module)
   */
  async getAllPermissions(): Promise<{
    success: boolean;
    permissions: Permission[];
    grouped: GroupedPermissions;
  }> {
    return apiClient.get('/roles/permissions/all');
  },

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(
    userId: string,
    roleId: string
  ): Promise<{ success: boolean; user: any; message: string }> {
    return apiClient.put(`/roles/user/${userId}/role`, { role_id: roleId });
  },
};
