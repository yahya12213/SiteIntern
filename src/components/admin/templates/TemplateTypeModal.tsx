import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Palette, Folder, ChevronRight } from 'lucide-react';
import type { TemplateFolder } from '@/types/certificateTemplate';

interface TemplateTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: TemplateFolder[];
  selectedFolderId?: string | null;
}

type TemplateType = 'classic' | 'canvas' | null;

export const TemplateTypeModal: React.FC<TemplateTypeModalProps> = ({
  isOpen,
  onClose,
  folders,
  selectedFolderId: initialFolderId,
}) => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<TemplateType>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId || null);

  // Flatten folders for dropdown
  const flattenFolders = (
    folders: TemplateFolder[],
    level: number = 0,
    result: { id: string; name: string; level: number }[] = []
  ): { id: string; name: string; level: number }[] => {
    for (const folder of folders) {
      result.push({ id: folder.id, name: folder.name, level });
      if (folder.children && folder.children.length > 0) {
        flattenFolders(folder.children, level + 1, result);
      }
    }
    return result;
  };

  const flatFolders = flattenFolders(folders);

  const handleCreate = () => {
    if (!selectedType) {
      alert('Veuillez sélectionner un type de template');
      return;
    }
    if (!selectedFolderId) {
      alert('Veuillez sélectionner un dossier de destination');
      return;
    }

    const path =
      selectedType === 'classic'
        ? `/admin/certificate-templates/new/edit?folderId=${selectedFolderId}`
        : `/admin/certificate-templates/new/canvas-edit?folderId=${selectedFolderId}`;

    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Créer un Nouveau Template
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              1. Choisissez le type de template
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Classic Template Option */}
              <button
                onClick={() => setSelectedType('classic')}
                className={`p-6 border-2 rounded-xl transition-all ${
                  selectedType === 'classic'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                      selectedType === 'classic' ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <FileText
                      className={`h-8 w-8 ${
                        selectedType === 'classic' ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Template Classique</h3>
                  <p className="text-sm text-gray-600">
                    Éditeur de configuration avec options prédéfinies pour un contrôle rapide
                  </p>
                </div>
              </button>

              {/* Canvas Template Option */}
              <button
                onClick={() => setSelectedType('canvas')}
                className={`p-6 border-2 rounded-xl transition-all ${
                  selectedType === 'canvas'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                      selectedType === 'canvas' ? 'bg-purple-500' : 'bg-gray-200'
                    }`}
                  >
                    <Palette
                      className={`h-8 w-8 ${
                        selectedType === 'canvas' ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Template Canvas</h3>
                  <p className="text-sm text-gray-600">
                    Éditeur visuel avancé avec glisser-déposer pour une personnalisation complète
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Folder Selection */}
          <div>
            <label htmlFor="folder-select" className="block text-sm font-semibold text-gray-700 mb-2">
              2. Sélectionnez le dossier de destination <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="folder-select"
                value={selectedFolderId || ''}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">-- Choisir un dossier --</option>
                {flatFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {'└─ '.repeat(folder.level)}{folder.name}
                  </option>
                ))}
              </select>
            </div>
            {flatFolders.length === 0 && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <Folder className="h-4 w-4" />
                Aucun dossier disponible. Créez d'abord un dossier avant de créer un template.
              </p>
            )}
          </div>

          {/* Summary */}
          {selectedType && selectedFolderId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                <span>
                  Vous allez créer un{' '}
                  <strong>
                    {selectedType === 'classic' ? 'Template Classique' : 'Template Canvas'}
                  </strong>{' '}
                  dans le dossier{' '}
                  <strong>
                    {flatFolders.find((f) => f.id === selectedFolderId)?.name}
                  </strong>
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedType || !selectedFolderId || flatFolders.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Créer le Template
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
