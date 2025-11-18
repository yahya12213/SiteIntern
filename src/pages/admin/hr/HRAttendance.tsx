import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePermission } from '@/hooks/usePermission';
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Check,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import AttendanceRecordForm from '@/components/admin/hr/AttendanceRecordForm';
import OvertimeApprovalModal from '@/components/admin/hr/OvertimeApprovalModal';
import AnomalyResolutionModal from '@/components/admin/hr/AnomalyResolutionModal';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string;
  worked_minutes: number;
  status: string;
  is_anomaly: boolean;
  anomaly_type: string;
}

interface OvertimeRequest {
  id: string;
  employee_name: string;
  employee_number: string;
  request_date: string;
  start_time: string;
  end_time: string;
  estimated_hours: number;
  reason: string;
  status: string;
  priority: string;
}

export default function HRAttendance() {
  const { hr } = usePermission();
  const [activeTab, setActiveTab] = useState<'records' | 'anomalies' | 'overtime'>('records');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [showOvertimeApprovalModal, setShowOvertimeApprovalModal] = useState(false);
  const [selectedOvertimeRequestId, setSelectedOvertimeRequestId] = useState<string | null>(null);
  const [showAnomalyResolutionModal, setShowAnomalyResolutionModal] = useState(false);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  // Fetch attendance records
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['hr-attendance', dateFrom, dateTo, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('start_date', dateFrom);
      if (dateTo) params.append('end_date', dateTo);
      if (statusFilter) params.append('status', statusFilter);

      const response = await apiClient.get<{ success: boolean; data: AttendanceRecord[] }>(`/hr/attendance?${params.toString()}`);
      return (response as any).data;
    },
    enabled: activeTab === 'records',
  });

  // Fetch anomalies
  const { data: anomaliesData, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['hr-attendance-anomalies'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: AttendanceRecord[] }>('/hr/attendance/anomalies');
      return (response as any).data;
    },
    enabled: activeTab === 'anomalies',
  });

  // Fetch overtime requests
  const { data: overtimeData, isLoading: overtimeLoading } = useQuery({
    queryKey: ['hr-overtime-requests', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await apiClient.get<{ success: boolean; data: OvertimeRequest[] }>(`/hr/attendance/overtime/requests?${params.toString()}`);
      return (response as any).data;
    },
    enabled: activeTab === 'overtime',
  });

  const attendance = attendanceData || [];
  const anomalies = anomaliesData || [];
  const overtime = overtimeData || [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      leave: 'bg-blue-100 text-blue-800',
      half_day: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      present: 'Présent',
      absent: 'Absent',
      late: 'Retard',
      leave: 'Congé',
      half_day: 'Demi-journée',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority] || styles.normal}`}>
        {priority}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-7 w-7 text-blue-600" />
              Temps & Présence
            </h1>
            <p className="text-gray-600 mt-1">
              Gestion de la présence, anomalies et heures supplémentaires
            </p>
          </div>
          {hr.canRecordAttendance && (
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-5 w-5" />
              Enregistrer Présence
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('records')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'records'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Enregistrements
            </button>
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'anomalies'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Anomalies ({anomalies.length})
            </button>
            <button
              onClick={() => setActiveTab('overtime')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overtime'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Heures Supplémentaires
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="present">Présent</option>
                <option value="absent">Absent</option>
                <option value="late">Retard</option>
                <option value="leave">Congé</option>
                <option value="half_day">Demi-journée</option>
              </select>
            </div>
            <button className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
              <Filter className="h-4 w-4" />
              Filtres
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'records' && (
          <>
            {/* Attendance Record Form */}
            {hr.canRecordAttendance && <AttendanceRecordForm />}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {attendanceLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Chargement...</p>
              </div>
            ) : attendance.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-600">Aucun enregistrement trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entrée
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sortie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heures
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendance.map((record: AttendanceRecord) => (
                      <tr key={record.id} className={record.is_anomaly ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{record.employee_name}</div>
                          <div className="text-sm text-gray-500">{record.employee_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.attendance_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.check_in_time || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.check_out_time || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.worked_minutes ? (record.worked_minutes / 60).toFixed(2) + 'h' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                          {record.is_anomaly && (
                            <AlertTriangle className="h-4 w-4 text-red-500 inline ml-2" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

        {activeTab === 'anomalies' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {anomaliesLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Chargement...</p>
              </div>
            ) : anomalies.length === 0 ? (
              <div className="p-8 text-center">
                <Check className="h-12 w-12 text-green-500 mx-auto" />
                <p className="mt-2 text-gray-600">Aucune anomalie à résoudre</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {anomalies.map((anomaly: AttendanceRecord) => (
                  <div key={anomaly.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium text-gray-900">{anomaly.employee_name}</p>
                            <p className="text-sm text-gray-600">
                              {anomaly.employee_number} • {new Date(anomaly.attendance_date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-red-600">
                          Type: {anomaly.anomaly_type?.replace('_', ' ')}
                        </p>
                      </div>
                      {hr.canCorrectAttendance && (
                        <button
                          onClick={() => {
                            setSelectedAnomalyId(anomaly.id);
                            setShowAnomalyResolutionModal(true);
                          }}
                          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
                        >
                          Résoudre
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'overtime' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {overtimeLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Chargement...</p>
              </div>
            ) : overtime.length === 0 ? (
              <div className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-600">Aucune demande d'heures supplémentaires</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horaires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heures
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priorité
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overtime.map((request: OvertimeRequest) => (
                      <tr
                        key={request.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedOvertimeRequestId(request.id);
                          setShowOvertimeApprovalModal(true);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{request.employee_name}</div>
                          <div className="text-sm text-gray-500">{request.employee_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(request.request_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.start_time} - {request.end_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {request.estimated_hours}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPriorityBadge(request.priority)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOvertimeRequestId(request.id);
                              setShowOvertimeApprovalModal(true);
                            }}
                          >
                            Voir détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Overtime Approval Modal */}
        {showOvertimeApprovalModal && selectedOvertimeRequestId && (
          <OvertimeApprovalModal
            requestId={selectedOvertimeRequestId}
            onClose={() => {
              setShowOvertimeApprovalModal(false);
              setSelectedOvertimeRequestId(null);
            }}
          />
        )}

        {/* Anomaly Resolution Modal */}
        {showAnomalyResolutionModal && selectedAnomalyId && (
          <AnomalyResolutionModal
            attendanceId={selectedAnomalyId}
            onClose={() => {
              setShowAnomalyResolutionModal(false);
              setSelectedAnomalyId(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
