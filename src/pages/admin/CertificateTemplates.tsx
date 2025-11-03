import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  useCertificateTemplates,
  useDeleteTemplate,
  useDuplicateTemplate,
  useSetDefaultTemplate,
  useSeedDefaultTemplates,
} from '@/hooks/useCertificateTemplates';
import {
  Award,
  Plus,
  Copy,
  Trash2,
  Star,
  AlertCircle,
  Eye,
  Edit3,
  Palette,
} from 'lucide-react';

export const CertificateTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { data: templates, isLoading, error } = useCertificateTemplates();
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();
  const setDefaultMutation = useSetDefaultTemplate();
  const seedMutation = useSeedDefaultTemplates();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultMutation.mutateAsync(id);
    } catch (error: any) {
      alert('Erreur: ' + (error.message || 'Impossible de définir comme défaut'));
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

  if (isLoading) {
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
      <div className="space-y-6">
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

          <div className="flex gap-2">
            {templates && templates.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                disabled={seedMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Palette className="h-4 w-4" />
                Créer Templates par Défaut
              </button>
            )}
            <button
              onClick={() => navigate('/admin/certificate-templates/new/edit')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouveau Template
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Templates</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">{templates?.length || 0}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium">Template par Défaut</div>
            <div className="text-lg font-bold text-green-900 mt-1">
              {templates?.find((t) => t.is_default)?.name || 'Aucun'}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Styles Disponibles</div>
            <div className="text-3xl font-bold text-purple-900 mt-1">
              {templates?.length || 0}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {!templates || templates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun template disponible
            </h3>
            <p className="text-gray-600 mb-4">
              Commencez par créer les templates prédéfinis ou créez un nouveau template personnalisé
            </p>
            <button
              onClick={handleSeedDefaults}
              disabled={seedMutation.isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Palette className="h-5 w-5" />
              Créer Templates par Défaut
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
              >
                {/* Preview Area */}
                <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                  {template.is_default && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                        <Star className="h-3 w-3 fill-current" />
                        PAR DÉFAUT
                      </div>
                    </div>
                  )}

                  <div className="text-center p-6">
                    <Award className="h-20 w-20 text-gray-300 mx-auto mb-3" />
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
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description || 'Aucune description'}
                  </p>

                  {/* Colors Preview */}
                  <div className="flex gap-1 mb-4">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: template.template_config.colors.primary }}
                      title="Couleur primaire"
                    />
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: template.template_config.colors.secondary }}
                      title="Couleur secondaire"
                    />
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: template.template_config.colors.text }}
                      title="Couleur du texte"
                    />
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {!template.is_default && (
                      <button
                        onClick={() => handleSetDefault(template.id)}
                        disabled={setDefaultMutation.isPending}
                        className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded border border-yellow-300 hover:bg-yellow-100 transition-colors text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Star className="h-4 w-4" />
                        Définir par défaut
                      </button>
                    )}

                    <button
                      onClick={() => handleDuplicate(template.id)}
                      disabled={duplicateMutation.isPending}
                      className="px-3 py-2 bg-blue-50 text-blue-700 rounded border border-blue-300 hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4" />
                      Dupliquer
                    </button>

                    <button
                      onClick={() => navigate(`/admin/certificate-templates/${template.id}/edit`)}
                      className="px-3 py-2 bg-purple-50 text-purple-700 rounded border border-purple-300 hover:bg-purple-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Edit3 className="h-4 w-4" />
                      Modifier
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(template.id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-2 bg-red-50 text-red-700 rounded border border-red-300 hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === template.id && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
                      <h4 className="font-bold text-gray-900 mb-2">Confirmer la suppression</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Êtes-vous sûr de vouloir supprimer le template "{template.name}" ?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(template.id)}
                          disabled={deleteMutation.isPending}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          Annuler
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
    </AppLayout>
  );
};
