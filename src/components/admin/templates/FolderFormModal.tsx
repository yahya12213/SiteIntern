import React, { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import type { TemplateFolder } from '@/types/certificateTemplate';

interface FolderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, parentId?: string | null) => void;
  folder?: TemplateFolder | null; // Pour édition
  folders: TemplateFolder[]; // Liste de tous les dossiers (pour sélecteur de parent)
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export const FolderFormModal: React.FC<FolderFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  folder,
  folders,
  isLoading = false,
  mode,
}) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && folder) {
        setName(folder.name);
        setParentId(folder.parent_id);
      } else {
        setName('');
        setParentId(null);
      }
    }
  }, [isOpen, mode, folder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), mode === 'create' ? parentId : undefined);
    }
  };

  if (!isOpen) return null;

  // Filter out current folder and its children when editing (to prevent circular references)
  const availableParents = folders.filter((f) => {
    if (mode === 'edit' && folder) {
      return f.id !== folder.id; // Can't be parent of itself
      // TODO: Also filter out children of current folder
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Nouveau Dossier' : 'Renommer le Dossier'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name Input */}
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom du dossier <span className="text-red-500">*</span>
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Formation KSS"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Parent Folder Select (only for create mode) */}
          {mode === 'create' && (
            <div>
              <label htmlFor="parent-folder" className="block text-sm font-medium text-gray-700 mb-1">
                Dossier parent (optionnel)
              </label>
              <select
                id="parent-folder"
                value={parentId || ''}
                onChange={(e) => setParentId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="">📁 Racine (aucun parent)</option>
                {availableParents.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide pour créer un dossier à la racine
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Enregistrement...' : mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
