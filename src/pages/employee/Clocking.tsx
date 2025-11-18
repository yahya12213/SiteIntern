import { useState } from 'react';
import { Clock, LogIn, LogOut, Calendar, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { AppLayout } from '@/components/layout/AppLayout';

interface ClockRecord {
  id: string;
  clock_time: string;
  status: 'check_in' | 'check_out';
  source: string;
}

interface TodayStatus {
  date: string;
  records: ClockRecord[];
  last_action: ClockRecord | null;
  can_check_in: boolean;
  can_check_out: boolean;
  worked_minutes: number | null;
  is_complete: boolean;
}

interface DayRecord {
  date: string;
  records: ClockRecord[];
  worked_minutes: number | null;
  is_complete: boolean;
  has_anomaly: boolean;
}

function Clocking() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  // Get today's status
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['clocking-today'],
    queryFn: async () => {
      const response = await apiClient.get('/hr/clocking/my-today');
      return (response as any).data as { success: boolean; requires_clocking: boolean; employee: any; today: TodayStatus };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get full history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['clocking-history', selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

      const response = await apiClient.get(`/hr/clocking/my-records?start_date=${startDate}&end_date=${endDate}&limit=100`);
      return (response as any).data as { success: boolean; employee: any; records: DayRecord[] };
    }
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/hr/clocking/check-in');
      return (response as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clocking-today'] });
      queryClient.invalidateQueries({ queryKey: ['clocking-history'] });
      alert('✅ Entrée enregistrée avec succès !');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Erreur lors de l\'enregistrement de l\'entrée');
    }
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/hr/clocking/check-out');
      return (response as any).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clocking-today'] });
      queryClient.invalidateQueries({ queryKey: ['clocking-history'] });
      const hours = Math.floor((data.worked_minutes_today || 0) / 60);
      const minutes = (data.worked_minutes_today || 0) % 60;
      alert(`✅ Sortie enregistrée avec succès !\n\nTemps travaillé aujourd'hui : ${hours}h ${minutes}min`);
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Erreur lors de l\'enregistrement de la sortie');
    }
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatWorkedTime = (minutes: number | null) => {
    if (minutes === null) return '-- h --';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}min`;
  };

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  if (todayLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!todayData?.requires_clocking) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Pointage non requis
            </h2>
            <p className="text-gray-600">
              Vous n'êtes pas autorisé à utiliser le système de pointage.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const today = todayData.today;
  const currentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-600" />
            Mon Pointage
          </h1>
          <p className="text-gray-600 mt-2">
            Enregistrez vos heures d'arrivée et de départ
          </p>
        </div>

        {/* Today's Status Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 mb-8 border border-blue-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {formatDate(today.date)}
              </h2>
              <p className="text-lg text-gray-600 mt-1">
                Heure actuelle : {currentTime}
              </p>
            </div>
            <div className="text-right">
              {today.last_action ? (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  today.last_action.status === 'check_in'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {today.last_action.status === 'check_in' ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Présent depuis {formatTime(today.last_action.clock_time)}</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-5 w-5" />
                      <span className="font-semibold">Sorti à {formatTime(today.last_action.clock_time)}</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Non pointé aujourd'hui</span>
                </div>
              )}
            </div>
          </div>

          {/* Worked Time */}
          {today.is_complete && today.worked_minutes !== null && (
            <div className="bg-white/60 backdrop-blur rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <span className="text-gray-700">Temps travaillé aujourd'hui :</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatWorkedTime(today.worked_minutes)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => checkInMutation.mutate()}
              disabled={!today.can_check_in || checkInMutation.isPending}
              className={`py-6 px-8 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
                today.can_check_in && !checkInMutation.isPending
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <LogIn className="h-6 w-6" />
              {checkInMutation.isPending ? 'Enregistrement...' : 'POINTER ENTRÉE'}
            </button>

            <button
              onClick={() => checkOutMutation.mutate()}
              disabled={!today.can_check_out || checkOutMutation.isPending}
              className={`py-6 px-8 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
                today.can_check_out && !checkOutMutation.isPending
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <LogOut className="h-6 w-6" />
              {checkOutMutation.isPending ? 'Enregistrement...' : 'POINTER SORTIE'}
            </button>
          </div>

          {/* Today's Records */}
          {today.records.length > 0 && (
            <div className="mt-6 bg-white/60 backdrop-blur rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Pointages d'aujourd'hui
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {today.records.map((record, index) => (
                  <div
                    key={record.id}
                    className={`p-3 rounded-lg text-center ${
                      record.status === 'check_in'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <div className="text-xs font-medium mb-1">
                      {record.status === 'check_in' ? '➡️ Entrée' : '⬅️ Sortie'} #{index + 1}
                    </div>
                    <div className="text-lg font-bold">
                      {formatTime(record.clock_time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Historique des pointages
              </h2>
              <div className="flex gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[2024, 2025, 2026].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : historyData && historyData.records.length > 0 ? (
              <div className="space-y-4">
                {historyData.records.map((day) => (
                  <div
                    key={day.date}
                    className={`border rounded-lg p-4 ${
                      day.has_anomaly
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-gray-900">
                        {formatDate(day.date)}
                      </div>
                      <div className="flex items-center gap-4">
                        {day.has_anomaly && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            ⚠️ Anomalie
                          </span>
                        )}
                        <div className="text-sm font-bold text-blue-600">
                          {formatWorkedTime(day.worked_minutes)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {day.records.map((record, index) => (
                        <div
                          key={record.id}
                          className={`p-2 rounded text-center text-sm ${
                            record.status === 'check_in'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <div className="text-xs mb-1">
                            {record.status === 'check_in' ? '➡️ Entrée' : '⬅️ Sortie'} #{index + 1}
                          </div>
                          <div className="font-bold">
                            {formatTime(record.clock_time)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucun pointage pour ce mois
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Clocking;
