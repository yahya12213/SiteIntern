import React, { useState, useRef } from 'react';
import { Upload, Link, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import type { CertificateTemplate } from '@/types/certificateTemplate';
import { certificateTemplatesApi } from '@/lib/api/certificateTemplates';
import { getRecommendedImageDimensions } from '@/lib/utils/canvasDimensions';

interface BackgroundImageManagerProps {
  template: CertificateTemplate;
  onUpdate: (template: CertificateTemplate) => void;
}

export const BackgroundImageManager: React.FC<BackgroundImageManagerProps> = ({
  template,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtenir les dimensions recommandées en fonction du format et de l'orientation
  const recommendedDimensions = getRecommendedImageDimensions(
    template.template_config.layout.format,
    template.template_config.layout.orientation,
    template.template_config.layout.customWidth,
    template.template_config.layout.customHeight
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPG, PNG, WEBP ou SVG)');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5 MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await certificateTemplatesApi.uploadBackground(template.id, file);

      // IMPORTANT: Ne pas utiliser result.template car il écrase les modifications locales
      // On utilise uniquement l'URL retournée pour mettre à jour la page actuelle
      const backgroundUrl = result.background_url || result.template?.background_image_url;

      if (backgroundUrl) {
        // Mettre à jour uniquement le background_image_url, sans écraser le reste du template
        onUpdate({
          ...template,
          background_image_url: backgroundUrl,
          background_image_type: 'upload',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload de l\'image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setError('Veuillez saisir une URL');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await certificateTemplatesApi.setBackgroundUrl(template.id, url.trim());

      // IMPORTANT: Ne pas utiliser result.template car il écrase les modifications locales
      const backgroundUrl = result.background_url || result.template?.background_image_url || url.trim();

      // Mettre à jour uniquement le background_image_url
      onUpdate({
        ...template,
        background_image_url: backgroundUrl,
        background_image_type: 'url',
      });
      setUrl('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la définition de l\'URL');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBackground = async () => {
    if (!confirm('Supprimer l\'arrière-plan ?')) return;

    setIsUploading(true);
    setError(null);

    try {
      await certificateTemplatesApi.deleteBackground(template.id);

      // IMPORTANT: Ne pas utiliser result.template car il écrase les modifications locales
      // Supprimer uniquement le background_image_url de la page actuelle
      onUpdate({
        ...template,
        background_image_url: undefined,
        background_image_type: undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de l\'arrière-plan');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError('Veuillez déposer une image (JPG, PNG, WEBP ou SVG)');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5 MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await certificateTemplatesApi.uploadBackground(template.id, file);

      // IMPORTANT: Ne pas utiliser result.template car il écrase les modifications locales
      const backgroundUrl = result.background_url || result.template?.background_image_url;

      if (backgroundUrl) {
        onUpdate({
          ...template,
          background_image_url: backgroundUrl,
          background_image_type: 'upload',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Image d'arrière-plan</h3>
          <p className="text-xs text-gray-500">
            Uploadez une image ou définissez une URL pour le fond du certificat
          </p>
        </div>

        {/* Aperçu actuel */}
        {template.background_image_url && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">Arrière-plan actuel</label>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 truncate font-mono">
                      {template.background_image_url}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Type: {template.background_image_type === 'upload' ? 'Fichier uploadé' : 'URL externe'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteBackground}
                  disabled={isUploading}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Supprimer l'arrière-plan"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Preview image */}
              <div className="mt-3">
                <img
                  src={template.background_image_url}
                  alt="Aperçu arrière-plan"
                  className="w-full h-32 object-cover rounded border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="h-4 w-4 inline mr-1" />
            Upload
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Link className="h-4 w-4 inline mr-1" />
            URL
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
            />

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className={`h-12 w-12 mx-auto mb-3 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {isDragging ? 'Déposez l\'image ici' : 'Glissez-déposez une image ou cliquez pour parcourir'}
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG, WEBP ou SVG • Max 5 MB
              </p>
              <p className="text-xs text-blue-600 font-medium mt-2">
                Recommandé: {recommendedDimensions}
              </p>
              {isUploading && (
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-600 mt-2">Upload en cours...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                URL de l'image
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemple.com/image.jpg"
                disabled={isUploading}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleUrlSubmit}
              disabled={isUploading || !url.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {isUploading ? 'Application...' : 'Appliquer l\'URL'}
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Astuce:</strong> L'image d'arrière-plan sera affichée en plein écran sur le
            canvas. Vous pourrez ensuite placer vos éléments texte par-dessus.
          </p>
        </div>
      </div>
    </div>
  );
};
