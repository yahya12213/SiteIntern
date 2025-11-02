import React, { useState } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateFormation, useUpdateFormation } from '@/hooks/useCours';
import type { Formation, FormationLevel, FormationStatus } from '@/types/cours';

interface FormationFormModalProps {
  formation?: Formation;
  onClose: () => void;
}

export const FormationFormModal: React.FC<FormationFormModalProps> = ({ formation, onClose }) => {
  const isEdit = !!formation;
  const createFormation = useCreateFormation();
  const updateFormation = useUpdateFormation();

  const [formData, setFormData] = useState({
    title: formation?.title || '',
    description: formation?.description || '',
    price: formation?.price?.toString() || '',
    duration_hours: formation?.duration_hours?.toString() || '',
    level: (formation?.level || 'debutant') as FormationLevel,
    thumbnail_url: formation?.thumbnail_url || '',
    status: (formation?.status || 'draft') as FormationStatus,
    passing_score_percentage: formation?.passing_score_percentage?.toString() || '80',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est obligatoire';
    }

    if (formData.price && parseFloat(formData.price) < 0) {
      newErrors.price = 'Le prix doit être positif';
    }

    if (formData.duration_hours && parseInt(formData.duration_hours) < 1) {
      newErrors.duration_hours = 'La durée doit être supérieure à 0';
    }

    const passingScore = parseInt(formData.passing_score_percentage);
    if (passingScore < 0 || passingScore > 100) {
      newErrors.passing_score_percentage = 'Le score doit être entre 0 et 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : undefined,
        level: formData.level,
        thumbnail_url: formData.thumbnail_url.trim() || undefined,
        status: formData.status,
        passing_score_percentage: parseInt(formData.passing_score_percentage),
      };

      if (isEdit && formation) {
        await updateFormation.mutateAsync({
          id: formation.id,
          data: submitData,
        });
      } else {
        await createFormation.mutateAsync(submitData);
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving formation:', error);
      setErrors({ submit: error.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEdit ? 'Modifier la formation' : 'Nouvelle formation'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEdit ? 'Mettez à jour les informations de la formation' : 'Créez une nouvelle formation en ligne'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre de la formation <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Maîtriser React et TypeScript"
              className={errors.title ? 'border-red-300' : ''}
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description complète de la formation..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Level and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as FormationLevel })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="avance">Avancé</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as FormationStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publiée</option>
              </select>
            </div>
          </div>

          {/* Price and Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix (MAD)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className={errors.price ? 'border-red-300' : ''}
              />
              {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
              <p className="text-xs text-gray-500 mt-1">Laissez vide pour gratuit</p>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée (heures)
              </label>
              <Input
                type="number"
                min="1"
                value={formData.duration_hours}
                onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                placeholder="10"
                className={errors.duration_hours ? 'border-red-300' : ''}
              />
              {errors.duration_hours && <p className="text-xs text-red-600 mt-1">{errors.duration_hours}</p>}
            </div>
          </div>

          {/* Passing Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Score de réussite (%) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.passing_score_percentage}
              onChange={(e) => setFormData({ ...formData, passing_score_percentage: e.target.value })}
              className={errors.passing_score_percentage ? 'border-red-300' : ''}
            />
            {errors.passing_score_percentage && (
              <p className="text-xs text-red-600 mt-1">{errors.passing_score_percentage}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Score minimum requis pour valider les tests (défaut: 80%)</p>
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de l'image
            </label>
            <Input
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">Image de présentation de la formation (optionnel)</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>...</span>
                </div>
              ) : isEdit ? (
                'Enregistrer'
              ) : (
                'Créer'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
