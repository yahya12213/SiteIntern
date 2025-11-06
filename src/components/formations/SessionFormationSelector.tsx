import React, { useState, useEffect } from 'react';
import { ChevronDown, X, Package } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface Segment {
  id: string;
  name: string;
  color?: string;
}

interface City {
  id: string;
  name: string;
  code: string;
  segment_id: string;
}

interface CorpsFormation {
  id: string;
  name: string;
  formations_count?: number;
}

interface Formation {
  id: string;
  title: string;
  description?: string;
  price?: number;
  is_pack?: boolean;
  formations_count?: number;
  corps_formation_name?: string;
}

interface SessionFormationSelectorProps {
  selectedSegmentId: string;
  selectedCityId: string;
  selectedFormationIds: string[];
  onSegmentChange: (segmentId: string) => void;
  onCityChange: (cityId: string) => void;
  onFormationsChange: (formationIds: string[]) => void;
}

export const SessionFormationSelector: React.FC<SessionFormationSelectorProps> = ({
  selectedSegmentId,
  selectedCityId,
  selectedFormationIds,
  onSegmentChange,
  onCityChange,
  onFormationsChange,
}) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [corpsFormations, setCorpsFormations] = useState<CorpsFormation[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedCorpsId, setSelectedCorpsId] = useState<string>('');

  const [loadingSegments, setLoadingSegments] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCorps, setLoadingCorps] = useState(false);
  const [loadingFormations, setLoadingFormations] = useState(false);

  // Charger les segments au montage
  useEffect(() => {
    fetchSegments();
  }, []);

  // Charger les corps de formation au montage
  useEffect(() => {
    fetchCorpsFormations();
  }, []);

  // Charger les villes quand le segment change
  useEffect(() => {
    if (selectedSegmentId) {
      fetchCities(selectedSegmentId);
    } else {
      setCities([]);
      onCityChange('');
    }
  }, [selectedSegmentId]);

  // Charger les formations quand le corps change
  useEffect(() => {
    if (selectedCorpsId) {
      fetchFormations(selectedCorpsId);
    } else {
      setFormations([]);
      onFormationsChange([]);
    }
  }, [selectedCorpsId]);

  const fetchSegments = async () => {
    try {
      setLoadingSegments(true);
      const data = await apiClient.get<Segment[]>('/segments');
      setSegments(data);
    } catch (error) {
      console.error('Error fetching segments:', error);
    } finally {
      setLoadingSegments(false);
    }
  };

  const fetchCities = async (segmentId: string) => {
    try {
      setLoadingCities(true);
      const data = await apiClient.get<City[]>(`/cities/by-segment/${segmentId}`);
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchCorpsFormations = async () => {
    try {
      setLoadingCorps(true);
      const response = await apiClient.get<{ success: boolean; corps: CorpsFormation[] }>('/corps-formation');
      setCorpsFormations(response.corps);
    } catch (error) {
      console.error('Error fetching corps formations:', error);
      setCorpsFormations([]);
    } finally {
      setLoadingCorps(false);
    }
  };

  const fetchFormations = async (corpsId: string) => {
    try {
      setLoadingFormations(true);
      const data = await apiClient.get<Formation[]>(`/formations/all?corps_id=${corpsId}`);
      setFormations(data);
    } catch (error) {
      console.error('Error fetching formations:', error);
      setFormations([]);
    } finally {
      setLoadingFormations(false);
    }
  };

  const handleSegmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSegmentId = e.target.value;
    console.log('[SessionFormationSelector] Segment changed:', newSegmentId);
    onSegmentChange(newSegmentId);
    // Reset city when segment changes
    onCityChange('');
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCityChange(e.target.value);
  };

  const toggleFormation = (formationId: string) => {
    if (selectedFormationIds.includes(formationId)) {
      // Remove formation
      onFormationsChange(selectedFormationIds.filter(id => id !== formationId));
    } else {
      // Add formation
      onFormationsChange([...selectedFormationIds, formationId]);
    }
  };

  const removeFormation = (formationId: string) => {
    onFormationsChange(selectedFormationIds.filter(id => id !== formationId));
  };

  const selectedFormations = formations.filter(f => selectedFormationIds.includes(f.id));

  return (
    <div className="space-y-4">
      {/* Segment Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Segment <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            key={`segment-select-${selectedSegmentId || 'empty'}`}
            value={selectedSegmentId}
            onChange={handleSegmentChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10"
            disabled={loadingSegments}
          >
            <option value="">Sélectionner un segment</option>
            {segments.map(segment => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* City Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ville <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            key={`city-select-${selectedCityId || 'empty'}`}
            value={selectedCityId}
            onChange={handleCityChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={!selectedSegmentId || loadingCities}
          >
            <option value="">
              {!selectedSegmentId
                ? 'Sélectionner d\'abord un segment'
                : loadingCities
                ? 'Chargement...'
                : 'Sélectionner une ville'}
            </option>
            {cities.map(city => (
              <option key={city.id} value={city.id}>
                {city.name} ({city.code})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Corps de Formation Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Corps de Formation <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            key={`corps-select-${selectedCorpsId || 'empty'}`}
            value={selectedCorpsId}
            onChange={(e) => {
              setSelectedCorpsId(e.target.value);
              onFormationsChange([]); // Reset formations quand le corps change
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={loadingCorps}
          >
            <option value="">Sélectionner un corps de formation</option>
            {corpsFormations.map(corps => (
              <option key={corps.id} value={corps.id}>
                {corps.name} {corps.formations_count ? `(${corps.formations_count})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Formations Multi-Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Formations <span className="text-red-500">*</span>
        </label>

        {/* Selected formations badges */}
        {selectedFormations.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFormations.map(formation => (
              <div
                key={formation.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                <span>{formation.title}</span>
                <button
                  type="button"
                  onClick={() => removeFormation(formation.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formation selection */}
        <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
          {!selectedCorpsId ? (
            <div className="p-4 text-center text-gray-500">Veuillez d'abord sélectionner un corps de formation</div>
          ) : loadingFormations ? (
            <div className="p-4 text-center text-gray-500">Chargement des formations...</div>
          ) : formations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Aucune formation disponible dans ce corps</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {formations.map(formation => (
                <label
                  key={formation.id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFormationIds.includes(formation.id)}
                    onChange={() => toggleFormation(formation.id)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">{formation.title}</div>
                      {formation.is_pack && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          <Package className="h-3 w-3 mr-1" />
                          Pack
                        </span>
                      )}
                    </div>
                    {formation.description && (
                      <div className="text-sm text-gray-500 mt-0.5">{formation.description}</div>
                    )}
                    {formation.is_pack && formation.formations_count && (
                      <div className="text-xs text-blue-600 mt-1">
                        {formation.formations_count} formation{formation.formations_count > 1 ? 's' : ''} incluse{formation.formations_count > 1 ? 's' : ''}
                      </div>
                    )}
                    {formation.price !== undefined && (
                      <div className="text-sm text-blue-600 mt-1 font-semibold">
                        {parseFloat(String(formation.price)).toFixed(2)} MAD
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedFormationIds.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">
            Sélectionnez au moins une formation pour cette session
          </p>
        )}
      </div>
    </div>
  );
};
