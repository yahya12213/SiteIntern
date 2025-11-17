import { useState, useEffect } from 'react';
import { X, Clock, Calendar, CheckCircle, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface WorkScheduleFormModalProps {
  scheduleId?: string | null;
  onClose: () => void;
}

interface WorkSchedule {
  id: string;
  name: string;
  description?: string;
  monday_start?: string;
  monday_end?: string;
  tuesday_start?: string;
  tuesday_end?: string;
  wednesday_start?: string;
  wednesday_end?: string;
  thursday_start?: string;
  thursday_end?: string;
  friday_start?: string;
  friday_end?: string;
  saturday_start?: string;
  saturday_end?: string;
  sunday_start?: string;
  sunday_end?: string;
  weekly_hours: number;
  is_default: boolean;
  is_active: boolean;
}

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

export default function WorkScheduleFormModal({ scheduleId, onClose }: WorkScheduleFormModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monday_start: '09:00',
    monday_end: '17:00',
    tuesday_start: '09:00',
    tuesday_end: '17:00',
    wednesday_start: '09:00',
    wednesday_end: '17:00',
    thursday_start: '09:00',
    thursday_end: '17:00',
    friday_start: '09:00',
    friday_end: '17:00',
    saturday_start: '',
    saturday_end: '',
    sunday_start: '',
    sunday_end: '',
    is_default: false,
    is_active: true,
  });

  // Fetch schedule details if editing
  const { data: scheduleData } = useQuery({
    queryKey: ['hr-work-schedule', scheduleId],
    queryFn: async () => {
      if (!scheduleId) return null;
      const response = await apiClient.get<{ success: boolean; data: WorkSchedule }>(`/hr/settings/work-schedules/${scheduleId}`);
      return response.data;
    },
    enabled: !!scheduleId,
  });

  // Initialize form when data loads
  useEffect(() => {
    if (scheduleData) {
      setFormData({
        name: scheduleData.name || '',
        description: scheduleData.description || '',
        monday_start: scheduleData.monday_start || '',
        monday_end: scheduleData.monday_end || '',
        tuesday_start: scheduleData.tuesday_start || '',
        tuesday_end: scheduleData.tuesday_end || '',
        wednesday_start: scheduleData.wednesday_start || '',
        wednesday_end: scheduleData.wednesday_end || '',
        thursday_start: scheduleData.thursday_start || '',
        thursday_end: scheduleData.thursday_end || '',
        friday_start: scheduleData.friday_start || '',
        friday_end: scheduleData.friday_end || '',
        saturday_start: scheduleData.saturday_start || '',
        saturday_end: scheduleData.saturday_end || '',
        sunday_start: scheduleData.sunday_start || '',
        sunday_end: scheduleData.sunday_end || '',
        is_default: scheduleData.is_default,
        is_active: scheduleData.is_active,
      });
    }
  }, [scheduleData]);

  // Create mutation
  const createSchedule = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post<{ success: boolean; data: WorkSchedule }>('/hr/settings/work-schedules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-work-schedules'] });
      alert('Horaire de travail créé avec succès');
      onClose();
    },
  });

  // Update mutation
  const updateSchedule = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.put<{ success: boolean; data: WorkSchedule }>(`/hr/settings/work-schedules/${scheduleId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-work-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['hr-work-schedule', scheduleId] });
      alert('Horaire de travail mis à jour avec succès');
      onClose();
    },
  });

  const calculateWeeklyHours = () => {
    let totalMinutes = 0;

    DAYS.forEach(day => {
      const startKey = `${day.key}_start` as keyof typeof formData;
      const endKey = `${day.key}_end` as keyof typeof formData;
      const start = formData[startKey] as string;
      const end = formData[endKey] as string;

      if (start && end) {
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes > startMinutes) {
          totalMinutes += endMinutes - startMinutes;
        }
      }
    });

    return (totalMinutes / 60).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    // Validate time ranges
    for (const day of DAYS) {
      const startKey = `${day.key}_start` as keyof typeof formData;
      const endKey = `${day.key}_end` as keyof typeof formData;
      const start = formData[startKey] as string;
      const end = formData[endKey] as string;

      if ((start && !end) || (!start && end)) {
        alert(`${day.label}: Les heures de début et de fin doivent être toutes les deux renseignées ou vides`);
        return;
      }

      if (start && end) {
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
          alert(`${day.label}: L'heure de fin doit être après l'heure de début`);
          return;
        }
      }
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      monday_start: formData.monday_start || null,
      monday_end: formData.monday_end || null,
      tuesday_start: formData.tuesday_start || null,
      tuesday_end: formData.tuesday_end || null,
      wednesday_start: formData.wednesday_start || null,
      wednesday_end: formData.wednesday_end || null,
      thursday_start: formData.thursday_start || null,
      thursday_end: formData.thursday_end || null,
      friday_start: formData.friday_start || null,
      friday_end: formData.friday_end || null,
      saturday_start: formData.saturday_start || null,
      saturday_end: formData.saturday_end || null,
      sunday_start: formData.sunday_start || null,
      sunday_end: formData.sunday_end || null,
      weekly_hours: parseFloat(calculateWeeklyHours()),
      is_default: formData.is_default,
      is_active: formData.is_active,
    };

    try {
      if (scheduleId) {
        await updateSchedule.mutateAsync(payload);
      } else {
        await createSchedule.mutateAsync(payload);
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(error.response?.data?.error || 'Erreur lors de la sauvegarde de l\'horaire');
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const applyToAllDays = () => {
    if (!formData.monday_start || !formData.monday_end) {
      alert('Veuillez d\'abord définir les horaires du lundi');
      return;
    }

    setFormData(prev => ({
      ...prev,
      tuesday_start: prev.monday_start,
      tuesday_end: prev.monday_end,
      wednesday_start: prev.monday_start,
      wednesday_end: prev.monday_end,
      thursday_start: prev.monday_start,
      thursday_end: prev.monday_end,
      friday_start: prev.monday_start,
      friday_end: prev.monday_end,
    }));
  };

  const isPending = createSchedule.isPending || updateSchedule.isPending;
  const weeklyHours = calculateWeeklyHours();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {scheduleId ? 'Modifier l\'horaire de travail' : 'Nouvel horaire de travail'}
              </h2>
              <p className="text-sm text-gray-500">Configuration des horaires hebdomadaires</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Informations de base
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'horaire *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Horaire standard 35h"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Description de l'horaire de travail..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                Horaires hebdomadaires
              </h3>
              <button
                type="button"
                onClick={applyToAllDays}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Appliquer lundi à tous les jours
              </button>
            </div>

            <div className="space-y-3">
              {DAYS.map(day => {
                const startKey = `${day.key}_start` as keyof typeof formData;
                const endKey = `${day.key}_end` as keyof typeof formData;
                const start = formData[startKey] as string;
                const end = formData[endKey] as string;

                return (
                  <div key={day.key} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                    <div className="w-24">
                      <p className="text-sm font-medium text-gray-900">{day.label}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={start}
                        onChange={(e) => handleChange(startKey, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-500">→</span>
                      <input
                        type="time"
                        value={end}
                        onChange={(e) => handleChange(endKey, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {start && end && (
                        <span className="text-sm text-gray-600 ml-2">
                          {(() => {
                            const [startHour, startMin] = start.split(':').map(Number);
                            const [endHour, endMin] = end.split(':').map(Number);
                            const startMinutes = startHour * 60 + startMin;
                            const endMinutes = endHour * 60 + endMin;
                            const diffMinutes = endMinutes - startMinutes;
                            const hours = Math.floor(diffMinutes / 60);
                            const mins = diffMinutes % 60;
                            return diffMinutes > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : '-';
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly Total */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900">Total hebdomadaire</p>
                <p className="text-2xl font-bold text-blue-600">{weeklyHours}h</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-600" />
              Options
            </h3>

            <div className="space-y-3">
              {/* Is Default */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => handleChange('is_default', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Horaire par défaut</p>
                  <p className="text-xs text-gray-500">Utilisé automatiquement pour les nouveaux employés</p>
                </div>
              </label>

              {/* Is Active */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Actif</p>
                  <p className="text-xs text-gray-500">Cet horaire peut être assigné aux employés</p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Enregistrement...' : scheduleId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
