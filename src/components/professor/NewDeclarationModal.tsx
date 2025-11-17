import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import {
  useCreateDeclaration,
  useAvailableCalculationSheets,
  useProfessorSegments,
  useProfessorCities,
  type ProfessorCity,
} from '@/hooks/useProfessorDeclarations';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { profilesApi } from '@/lib/api/profiles';
import { useQuery } from '@tanstack/react-query';

interface NewDeclarationModalProps {
  onClose: () => void;
}

const NewDeclarationModal: React.FC<NewDeclarationModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const createDeclaration = useCreateDeclaration();
  const { data: availableSheets } = useAvailableCalculationSheets();
  const { user } = useAuth();

  // Le rôle "impression" peut créer des déclarations pour d'autres professeurs
  const isImpressionRole = user?.role === 'impression';

  // Charger tous les professeurs si c'est le rôle "impression"
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: () => profilesApi.getAll(),
    enabled: isImpressionRole,
  });

  // Filtrer pour ne garder que les professeurs
  const professors = allProfiles.filter(p => p.role === 'professor' || (p.segment_ids && p.segment_ids.length > 0));

  // Utiliser les hooks Supabase pour récupérer segments et villes
  const { data: segments = [], isLoading: segmentsLoading } = useProfessorSegments();
  const { data: cities = [], isLoading: citiesLoading } = useProfessorCities();

  const [filteredCities, setFilteredCities] = useState<ProfessorCity[]>([]);
  const [selectedProfessor, setSelectedProfessor] = useState('');

  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  // Filtrer les villes en fonction du segment sélectionné
  useEffect(() => {
    if (selectedSegment) {
      const filtered = cities.filter(city => city.segment_id === selectedSegment);
      setFilteredCities(filtered);
      // Réinitialiser la ville sélectionnée si elle n'est plus valide
      if (selectedCity && !filtered.find(c => c.id === selectedCity)) {
        setSelectedCity('');
      }
    } else {
      setFilteredCities([]);
      setSelectedCity('');
    }
  }, [selectedSegment, cities, selectedCity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!selectedSegment || !selectedCity || !startDate || !endDate) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    // Si rôle impression, un professeur doit être sélectionné
    if (isImpressionRole && !selectedProfessor) {
      setError('Veuillez sélectionner un professeur');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError('La date de fin doit être postérieure à la date de début');
      return;
    }

    // Vérifier qu'une fiche publiée existe pour ce segment et cette ville
    // Les fiches ont maintenant segment_ids et city_ids (tableaux)
    const sheet = availableSheets?.find(
      (s: any) => s.segment_ids?.includes(selectedSegment) && s.city_ids?.includes(selectedCity)
    );

    if (!sheet) {
      setError('Aucune fiche de calcul publiée n\'existe pour ce segment et cette ville');
      return;
    }

    try {
      const declaration = await createDeclaration.mutateAsync({
        calculation_sheet_id: sheet.id,
        segment_id: selectedSegment,
        city_id: selectedCity,
        start_date: startDate,
        end_date: endDate,
        form_data: {},
        professor_id: isImpressionRole ? selectedProfessor : undefined,
      });

      // Pour le rôle impression, ne pas rediriger vers le formulaire (lecture seule)
      if (isImpressionRole) {
        onClose();
      } else {
        // Rediriger vers le formulaire de remplissage avec l'ID extrait
        navigate(`/professor/declarations/${declaration.id}/fill`);
      }
    } catch (err) {
      console.error('Error creating declaration:', err);
      setError('Erreur lors de la création de la déclaration');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Nouvelle Déclaration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Loading state */}
          {(segmentsLoading || citiesLoading) && (
            <div className="text-center py-4">
              <p className="text-gray-600">Chargement...</p>
            </div>
          )}

          {/* Sélection de professeur (uniquement pour rôle impression) */}
          {isImpressionRole && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professeur <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProfessor}
                onChange={(e) => setSelectedProfessor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionner un professeur</option>
                {professors.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Segment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Segment <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={segmentsLoading}
            >
              <option value="">Sélectionner un segment</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
            {!segmentsLoading && segments.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                Aucun segment affecté à votre compte
              </p>
            )}
          </div>

          {/* Ville */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ville <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={!selectedSegment || citiesLoading}
            >
              <option value="">Sélectionner une ville</option>
              {filteredCities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            {!citiesLoading && cities.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                Aucune ville affectée à votre compte
              </p>
            )}
            {selectedSegment && filteredCities.length === 0 && cities.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Aucune ville disponible pour ce segment
              </p>
            )}
          </div>

          {/* Date de début */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de début <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Date de fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min={startDate}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createDeclaration.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {createDeclaration.isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewDeclarationModal;
