import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { permissionsApi, type PermissionModule, type PermissionMenu } from '@/lib/api/permissions';
import { ChevronDown, ChevronRight, Check, Minus, Folder, FileText } from 'lucide-react';

interface PermissionTreeProps {
  selectedPermissions: string[]; // Array of permission IDs
  onSelectionChange: (permissionIds: string[]) => void;
  readOnly?: boolean;
}

interface ExpandState {
  [key: string]: boolean;
}

export function PermissionTree({
  roleId,
  selectedPermissions,
  onSelectionChange,
  readOnly = false,
}: PermissionTreeProps) {
  const [expanded, setExpanded] = useState<ExpandState>({});

  // Fetch permission tree structure
  const { data: treeData, isLoading, error } = useQuery({
    queryKey: ['permissions-tree'],
    queryFn: () => permissionsApi.getTree(),
  });

  // Auto-expand all modules on first load
  useEffect(() => {
    if (treeData?.data) {
      const initialExpanded: ExpandState = {};
      treeData.data.forEach(module => {
        initialExpanded[module.id] = true;
        module.menus.forEach(menu => {
          initialExpanded[`${module.id}.${menu.id}`] = true;
        });
      });
      setExpanded(initialExpanded);
    }
  }, [treeData]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Check if all actions in a menu are selected
  const isMenuFullySelected = (menu: PermissionMenu): boolean => {
    return menu.actions.every(action => selectedPermissions.includes(action.id));
  };

  // Check if some (but not all) actions in a menu are selected
  const isMenuPartiallySelected = (menu: PermissionMenu): boolean => {
    const selectedCount = menu.actions.filter(action => selectedPermissions.includes(action.id)).length;
    return selectedCount > 0 && selectedCount < menu.actions.length;
  };

  // Check if all menus in a module are fully selected
  const isModuleFullySelected = (module: PermissionModule): boolean => {
    return module.menus.every(menu => isMenuFullySelected(menu));
  };

  // Check if some menus in a module are partially or fully selected
  const isModulePartiallySelected = (module: PermissionModule): boolean => {
    const hasAnySelection = module.menus.some(menu =>
      menu.actions.some(action => selectedPermissions.includes(action.id))
    );
    return hasAnySelection && !isModuleFullySelected(module);
  };

  // Toggle all permissions in a module
  const toggleModule = (module: PermissionModule) => {
    if (readOnly) return;

    const allModulePermIds = module.menus.flatMap(menu => menu.actions.map(a => a.id));
    const isFullySelected = isModuleFullySelected(module);

    if (isFullySelected) {
      // Deselect all
      onSelectionChange(selectedPermissions.filter(id => !allModulePermIds.includes(id)));
    } else {
      // Select all
      const newSelection = [...new Set([...selectedPermissions, ...allModulePermIds])];
      onSelectionChange(newSelection);
    }
  };

  // Toggle all permissions in a menu
  const toggleMenu = (menu: PermissionMenu) => {
    if (readOnly) return;

    const menuPermIds = menu.actions.map(a => a.id);
    const isFullySelected = isMenuFullySelected(menu);

    if (isFullySelected) {
      // Deselect all
      onSelectionChange(selectedPermissions.filter(id => !menuPermIds.includes(id)));
    } else {
      // Select all
      const newSelection = [...new Set([...selectedPermissions, ...menuPermIds])];
      onSelectionChange(newSelection);
    }
  };

  // Toggle a single permission
  const togglePermission = (permissionId: string) => {
    if (readOnly) return;

    if (selectedPermissions.includes(permissionId)) {
      onSelectionChange(selectedPermissions.filter(id => id !== permissionId));
    } else {
      onSelectionChange([...selectedPermissions, permissionId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Chargement des permissions...</span>
      </div>
    );
  }

  if (error || !treeData?.data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">Erreur lors du chargement des permissions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-50 rounded-md p-3 mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{selectedPermissions.length}</span> permissions sélectionnées
        </p>
      </div>

      {/* Tree */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {treeData.data.map((module) => (
          <div key={module.id} className="border-b border-gray-200 last:border-b-0">
            {/* Module Header */}
            <div
              className="flex items-center bg-gray-100 px-4 py-3 hover:bg-gray-150 cursor-pointer"
              onClick={() => toggleExpand(module.id)}
            >
              <button
                type="button"
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                {expanded[module.id] ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleModule(module);
                }}
                disabled={readOnly}
                className={`mr-3 w-5 h-5 rounded border flex items-center justify-center
                  ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${isModuleFullySelected(module)
                    ? 'bg-indigo-600 border-indigo-600'
                    : isModulePartiallySelected(module)
                      ? 'bg-indigo-100 border-indigo-400'
                      : 'bg-white border-gray-300'
                  }`}
              >
                {isModuleFullySelected(module) && <Check className="w-4 h-4 text-white" />}
                {isModulePartiallySelected(module) && <Minus className="w-4 h-4 text-indigo-600" />}
              </button>

              <Folder className="w-5 h-5 text-indigo-600 mr-2" />
              <span className="font-semibold text-gray-900">{module.label}</span>
              <span className="ml-2 text-sm text-gray-500">
                ({module.menus.length} pages)
              </span>
            </div>

            {/* Module Content (Menus) */}
            {expanded[module.id] && (
              <div className="pl-8">
                {module.menus.map((menu) => (
                  <div key={`${module.id}.${menu.id}`} className="border-t border-gray-100">
                    {/* Menu Header */}
                    <div
                      className="flex items-center bg-white px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(`${module.id}.${menu.id}`)}
                    >
                      <button
                        type="button"
                        className="mr-2 text-gray-400 hover:text-gray-600"
                      >
                        {expanded[`${module.id}.${menu.id}`] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMenu(menu);
                        }}
                        disabled={readOnly}
                        className={`mr-3 w-4 h-4 rounded border flex items-center justify-center
                          ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          ${isMenuFullySelected(menu)
                            ? 'bg-indigo-600 border-indigo-600'
                            : isMenuPartiallySelected(menu)
                              ? 'bg-indigo-100 border-indigo-400'
                              : 'bg-white border-gray-300'
                          }`}
                      >
                        {isMenuFullySelected(menu) && <Check className="w-3 h-3 text-white" />}
                        {isMenuPartiallySelected(menu) && <Minus className="w-3 h-3 text-indigo-600" />}
                      </button>

                      <FileText className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="font-medium text-gray-800">{menu.label}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({menu.actions.length} actions)
                      </span>
                    </div>

                    {/* Menu Content (Actions) */}
                    {expanded[`${module.id}.${menu.id}`] && (
                      <div className="pl-8 py-2 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {menu.actions.map((action) => (
                            <label
                              key={action.id}
                              className={`flex items-center px-3 py-2 rounded-md hover:bg-white transition-colors ${
                                readOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(action.id)}
                                onChange={() => togglePermission(action.id)}
                                disabled={readOnly}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {action.actionLabel}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {!readOnly && (
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              const allIds = treeData.data.flatMap(m =>
                m.menus.flatMap(menu => menu.actions.map(a => a.id))
              );
              onSelectionChange(allIds);
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            onClick={() => onSelectionChange([])}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
          >
            Tout désélectionner
          </button>
          <button
            type="button"
            onClick={() => {
              // Select only view_page permissions
              const viewPageIds = treeData.data.flatMap(m =>
                m.menus.flatMap(menu =>
                  menu.actions
                    .filter(a => a.action === 'view_page')
                    .map(a => a.id)
                )
              );
              onSelectionChange(viewPageIds);
            }}
            className="px-3 py-1 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-md"
          >
            Lecture seule (voir pages)
          </button>
        </div>
      )}
    </div>
  );
}
