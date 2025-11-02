import React, { useState, useMemo } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateSession, useUpdateSession } from '@/hooks/useFormations';
import { useSegments } from '@/hooks/useSegments';
import { useCities } from '@/hooks/useCities';
import type { FormationSession, SessionStatus } from '@/types/formations';

interface SessionFormModalProps {
  session?: FormationSession;
  onClose: () => void;
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({ session, onClose }) => {
  const isEdit = !!session;
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  // Fetch segments and cities
  const { data: segments = [] } = useSegments();
  const { data: allCities = [] } = useCities();

  const [formData, setFormData] = useState({
    name: session?.name || '',
    description: session?.description || '',
    start_date: session?.start_date ? session.start_date.split('T')[0] : '',
    end_date: session?.end_date ? session.end_date.split('T')[0] : '',
    segment_id: session?.segment_id || '',
    city_id: session?.city_id || '',
    instructor_id: session?.instructor_id || '',
    max_capacity: session?.max_capacity?.toString() || '',
    status: (session?.status || 'planned') as SessionStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter cities based on selected segment
  const filteredCities = useMemo(() => {
    if (!formData.segment_id) {
      return allCities;
    }
    return allCities.filter((city) => city.segment_id === formData.segment_id);
  }, [allCities, formData.segment_id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'La date de début est obligatoire';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'La date de fin est obligatoire';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'La date de fin doit être après la date de début';
    }

    if (formData.max_capacity && parseInt(formData.max_capacity) < 1) {
      newErrors.max_capacity = 'La capacité doit être supérieure à 0';
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
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        segment_id: formData.segment_id || undefined,
        city_id: formData.city_id || undefined,
        instructor_id: formData.instructor_id || undefined,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : undefined,
        status: formData.status,
      };

      if (isEdit && session) {
        await updateSession.mutateAsync({
          id: session.id,
          data: submitData,
        });
      } else {
        await createSession.mutateAsync(submitData);
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving session:', error);
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
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEdit ? 'Modifier la session' : 'Nouvelle session'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEdit ? 'Mettez à jour les informations de la session' : 'Créez une nouvelle session de formation'}
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la session <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Formation React Avancé"
              className={errors.name ? 'border-red-300' : ''}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la session..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Segment and City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Segment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Segment
              </label>
              <select
                value={formData.segment_id}
                onChange={(e) => {
                  setFormData({ ...formData, segment_id: e.target.value, city_id: '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Sélectionner un segment</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville
              </label>
              <select
                value={formData.city_id}
                onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                disabled={!formData.segment_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Sélectionner une ville</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {!formData.segment_id && (
                <p className="text-xs text-gray-500 mt-1">Sélectionnez d'abord un segment</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={errors.start_date ? 'border-red-300' : ''}
              />
              {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className={errors.end_date ? 'border-red-300' : ''}
              />
              {errors.end_date && <p className="text-xs text-red-600 mt-1">{errors.end_date}</p>}
            </div>
          </div>

          {/* Max capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capacité maximale
            </label>
            <Input
              type="number"
              min="1"
              value={formData.max_capacity}
              onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
              placeholder="Laissez vide pour illimité"
              className={errors.max_capacity ? 'border-red-300' : ''}
            />
            {errors.max_capacity && <p className="text-xs text-red-600 mt-1">{errors.max_capacity}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as SessionStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="planned">Planifiée</option>
              <option value="active">Active</option>
              <option value="completed">Terminée</option>
              <option value="cancelled">Annulée</option>
            </select>
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
