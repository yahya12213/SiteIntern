import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
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

interface SessionFormationSelectorProps {
  selectedSegmentId: string;
  selectedCityId: string;
  selectedCorpsId: string;
  onSegmentChange: (segmentId: string) => void;
  onCityChange: (cityId: string) => void;
  onCorpsChange: (corpsId: string) => void;
}

export const SessionFormationSelector: React.FC<SessionFormationSelectorProps> = ({
  selectedSegmentId,
  selectedCityId,
  selectedCorpsId,
  onSegmentChange,
  onCityChange,
  onCorpsChange,
}) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [corpsFormations, setCorpsFormations] = useState<CorpsFormation[]>([]);

  const [loadingSegments, setLoadingSegments] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCorps, setLoadingCorps] = useState(false);

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
            onChange={(e) => onCorpsChange(e.target.value)}
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
    </div>
  );
};
