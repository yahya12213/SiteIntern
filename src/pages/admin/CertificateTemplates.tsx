import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  useCertificateTemplates,
  useDeleteTemplate,
  useDuplicateTemplate,
  useSeedDefaultTemplates,
} from '@/hooks/useCertificateTemplates';
import {
  useTemplateFolderTree,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '@/hooks/useTemplateFolders';
import {
  Award,
  Copy,
  Trash2,
  AlertCircle,
  Edit3,
  Palette,
  Folder,
  FolderPlus,
  Edit2,
  FolderX,
} from 'lucide-react';
import { FolderTree } from '@/components/admin/templates/FolderTree';
import { FolderFormModal } from '@/components/admin/templates/FolderFormModal';
import { Breadcrumb } from '@/components/admin/templates/Breadcrumb';
import type { TemplateFolder } from '@/types/certificateTemplate';

export const CertificateTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { data: templates, isLoading, error } = useCertificateTemplates();
  const { data: folderTree, isLoading: foldersLoading } = useTemplateFolderTree();
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();
  const seedMutation = useSeedDefaultTemplates();
  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'edit'>('create');
  const [editingFolder, setEditingFolder] = useState<TemplateFolder | null>(null);

  // Filter templates by selected folder
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!selectedFolderId) return templates; // Show all if no folder selected
    return templates.filter((t) => t.folder_id === selectedFolderId);
  }, [templates, selectedFolderId]);

  // Get selected folder info
  const selectedFolder = useMemo(() => {
    if (!selectedFolderId || !folderTree) return null;
    const findFolder = (folders: TemplateFolder[]): TemplateFolder | null => {
      for (const folder of folders) {
        if (folder.id === selectedFolderId) return folder;
        if (folder.children) {
          const found = findFolder(folder.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFolder(folderTree);
  }, [selectedFolderId, folderTree]);

  // Build breadcrumb path from root to selected folder
  const breadcrumbPath = useMemo((): TemplateFolder[] => {
    if (!selectedFolderId || !folderTree) return [];

    const buildPath = (
      folders: TemplateFolder[],
      targetId: string,
      path: TemplateFolder[] = []
    ): TemplateFolder[] | null => {
      for (const folder of folders) {
        const currentPath = [...path, folder];
        if (folder.id === targetId) {
          return currentPath;
        }
        if (folder.children) {
          const found = buildPath(folder.children, targetId, currentPath);
          if (found) return found;
        }
      }
      return null;
    };

    return buildPath(folderTree, selectedFolderId) || [];
  }, [selectedFolderId, folderTree]);

  // Flatten folder tree for modal
  const flattenedFolders = useMemo(() => {
    if (!folderTree) return [];
    const flatten = (folders: TemplateFolder[], result: TemplateFolder[] = []): TemplateFolder[] => {
      for (const folder of folders) {
        result.push(folder);
        if (folder.children) {
          flatten(folder.children, result);
        }
      }
      return result;
    };
    return flatten(folderTree);
  }, [folderTree]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setShowDeleteConfirm(null);
    } catch (error: any) {
      alert('Erreur: ' + (error.message || 'Impossible de supprimer ce template'));
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateMutation.mutateAsync(id);
    } catch (error: any) {
      alert('Erreur: ' + (error.message || 'Impossible de dupliquer ce template'));
    }
  };

  const handleSeedDefaults = async () => {
    if (window.confirm('Créer les 3 templates prédéfinis ? (Classique, Moderne, Élégant)')) {
      try {
        await seedMutation.mutateAsync();
        alert('Templates créés avec succès !');
      } catch (error: any) {
        alert('Erreur: ' + (error.message || 'Impossible de créer les templates'));
      }
    }
  };

  const handleCreateFolder = () => {
    setFolderModalMode('create');
    setEditingFolder(null);
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: TemplateFolder) => {
    setFolderModalMode('edit');
    setEditingFolder(folder);
    setShowFolderModal(true);
  };

  const handleDeleteFolder = async (folder: TemplateFolder) => {
    if (window.confirm(`Supprimer le dossier "${folder.name}" ?\n\nNote: Le dossier doit être vide (sans templates ni sous-dossiers).`)) {
      try {
        await deleteFolderMutation.mutateAsync(folder.id);
        if (selectedFolderId === folder.id) {
          setSelectedFolderId(null);
        }
      } catch (error: any) {
        alert('Erreur: ' + (error.message || 'Impossible de supprimer ce dossier'));
      }
    }
  };

  const handleFolderFormSubmit = async (name: string, parentId?: string | null) => {
    try {
      if (folderModalMode === 'create') {
        await createFolderMutation.mutateAsync({ name, parent_id: parentId });
      } else if (editingFolder) {
        await updateFolderMutation.mutateAsync({ id: editingFolder.id, data: { name } });
      }
      setShowFolderModal(false);
    } catch (error: any) {
      alert('Erreur: ' + (error.message || 'Impossible d\'enregistrer le dossier'));
    }
  };

  const handleFolderContextMenu = (folder: TemplateFolder, event: React.MouseEvent) => {
    event.preventDefault();
    // For now, just select the folder on right-click
    // Could add a context menu later
    setSelectedFolderId(folder.id);
  };

  const handleCreateCanvasTemplate = () => {
    if (flattenedFolders.length === 0) {
      alert('Veuillez d\'abord créer au moins un dossier avant de créer un template.');
      handleCreateFolder();
      return;
    }
    // Redirect directly to Canvas editor with selected folder
    const folderId = selectedFolderId || flattenedFolders[0]?.id;
    navigate(`/admin/certificate-templates/new/canvas-edit?folderId=${folderId}`);
  };

  if (isLoading || foldersLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Chargement des templates...</div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>Erreur lors du chargement des templates</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="h-7 w-7 text-blue-600" />
              Templates de Certificats
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gérez les templates utilisés pour générer les certificats
            </p>
          </div>

          <div className="flex gap-3">
            {/* Nouveau Dossier Button - Primary */}
            <button
              onClick={handleCreateFolder}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
            >
              <FolderPlus className="h-5 w-5" />
              Nouveau Dossier
            </button>

            {/* Ajouter Template Canvas Button - Secondary */}
            <button
              onClick={handleCreateCanvasTemplate}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
            >
              <Palette className="h-5 w-5" />
              Ajouter Template Canvas
            </button>

            {/* Seed Defaults Button - Only if no templates */}
            {templates && templates.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                disabled={seedMutation.isPending}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md"
              >
                <Palette className="h-4 w-4" />
                Créer Templates par Défaut
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Templates</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">{templates?.length || 0}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Dossiers</div>
            <div className="text-3xl font-bold text-purple-900 mt-1">
              {flattenedFolders?.length || 0}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium">Dossier Actuel</div>
            <div className="text-lg font-bold text-green-900 mt-1 truncate">
              {selectedFolder ? selectedFolder.name : 'Tous'}
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <Breadcrumb currentPath={breadcrumbPath} onNavigate={setSelectedFolderId} />

        {/* Main Content: Always show two-panel layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel: Folder Tree - ALWAYS VISIBLE */}
          <div className="col-span-12 md:col-span-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Folder className="h-4 w-4" />
                  Dossiers
                </h3>
                <button
                  onClick={handleCreateFolder}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Nouveau dossier"
                >
                  <FolderPlus className="h-4 w-4 text-purple-600" />
                </button>
              </div>
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  selectedFolderId === null
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                📁 Tous les templates
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {folderTree && folderTree.length > 0 ? (
                <FolderTree
                  folders={folderTree}
                  selectedFolderId={selectedFolderId}
                  onFolderSelect={setSelectedFolderId}
                  onFolderContextMenu={handleFolderContextMenu}
                />
              ) : (
                <div className="p-6 text-center">
                  <FolderPlus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">Aucun dossier créé</p>
                  <button
                    onClick={handleCreateFolder}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium inline-flex items-center gap-1"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Créer un dossier
                  </button>
                </div>
              )}
            </div>
            {selectedFolder && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
                <div className="text-xs text-gray-600 font-medium mb-1">Actions sur "{selectedFolder.name}":</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditFolder(selectedFolder)}
                    className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Renommer
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(selectedFolder)}
                    disabled={deleteFolderMutation.isPending}
                    className="flex-1 px-2 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <FolderX className="h-3 w-3" />
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Templates Grid - ALWAYS VISIBLE */}
          <div className="col-span-12 md:col-span-9">
            {filteredTemplates.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {flattenedFolders.length === 0
                    ? '🚀 Commencez par créer un dossier'
                    : selectedFolder
                    ? `Aucun template dans le dossier "${selectedFolder.name}"`
                    : 'Aucun template disponible'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {flattenedFolders.length === 0
                    ? 'Organisez vos templates en créant d\'abord des dossiers (ex: Formation KSS → Certificat, Attestation, Badge)'
                    : 'Sélectionnez un dossier et créez votre premier template'}
                </p>
                <div className="flex gap-3 justify-center">
                  {flattenedFolders.length === 0 ? (
                    <button
                      onClick={handleCreateFolder}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2 font-medium shadow-md"
                    >
                      <FolderPlus className="h-5 w-5" />
                      Créer mon premier dossier
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCreateCanvasTemplate}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 font-medium shadow-md"
                      >
                        <Palette className="h-5 w-5" />
                        Créer un Template Canvas
                      </button>
                      {templates && templates.length === 0 && (
                        <button
                          onClick={handleSeedDefaults}
                          disabled={seedMutation.isPending}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2 disabled:opacity-50 font-medium shadow-md"
                        >
                          <Palette className="h-5 w-5" />
                          Templates par Défaut
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 relative"
                  >
                    {/* Preview Area */}
                    <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <div className="text-center p-4">
                        <Award className="h-16 w-16 text-gray-300 mx-auto mb-2" />
                        <div className="text-xs text-gray-500 font-mono">
                          {template.template_config.layout.orientation === 'landscape'
                            ? 'Paysage'
                            : 'Portrait'}{' '}
                          • {template.template_config.layout.format.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-base mb-1">{template.name}</h3>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {template.description || 'Aucune description'}
                      </p>

                      {/* Folder Badge */}
                      {template.folder_name && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                            <Folder className="h-3 w-3" />
                            {template.folder_name}
                          </span>
                        </div>
                      )}

                      {/* Colors Preview */}
                      <div className="flex gap-1 mb-3">
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: template.template_config.colors.primary }}
                          title="Couleur primaire"
                        />
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: template.template_config.colors.secondary }}
                          title="Couleur secondaire"
                        />
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: template.template_config.colors.text }}
                          title="Couleur du texte"
                        />
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleDuplicate(template.id)}
                          disabled={duplicateMutation.isPending}
                          className="px-2 py-1.5 bg-blue-50 text-blue-700 rounded border border-blue-300 hover:bg-blue-100 transition-colors text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Copy className="h-3 w-3" />
                          Dupliquer
                        </button>

                        <button
                          onClick={() => navigate(`/admin/certificate-templates/${template.id}/canvas-edit`)}
                          className="px-2 py-1.5 bg-purple-50 text-purple-700 rounded border border-purple-300 hover:bg-purple-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                          title="Modifier avec l'éditeur Canvas"
                        >
                          <Edit3 className="h-3 w-3" />
                          Modifier
                        </button>

                        <button
                          onClick={() => setShowDeleteConfirm(template.id)}
                          disabled={deleteMutation.isPending}
                          className="px-2 py-1.5 bg-red-50 text-red-700 rounded border border-red-300 hover:bg-red-100 transition-colors text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {/* Delete Confirmation */}
                    {showDeleteConfirm === template.id && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="bg-white p-4 rounded-lg shadow-xl max-w-xs mx-4">
                          <h4 className="font-bold text-gray-900 text-sm mb-2">Confirmer la suppression</h4>
                          <p className="text-xs text-gray-600 mb-4">
                            Êtes-vous sûr de vouloir supprimer le template "{template.name}" ?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs font-medium"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Folder Form Modal */}
        <FolderFormModal
          isOpen={showFolderModal}
          onClose={() => setShowFolderModal(false)}
          onSubmit={handleFolderFormSubmit}
          folder={editingFolder}
          folders={flattenedFolders}
          isLoading={createFolderMutation.isPending || updateFolderMutation.isPending}
          mode={folderModalMode}
        />
      </div>
    </AppLayout>
  );
};
