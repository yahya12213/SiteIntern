import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Users,
  TrendingUp,
  PlayCircle,
  Award,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions } from '@/hooks/useFormations';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allSessions = [], isLoading } = useSessions();

  // Filter sessions where current user is enrolled
  const myEnrolledSessions = allSessions.filter((session) =>
    session.students?.some((student) => student.student_id === user?.id)
  );

  const getStatusColor = (status: string) => {
    const colors = {
      planned: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      planned: 'Planifiée',
      active: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isSessionActive = (session: typeof myEnrolledSessions[0]) => {
    const now = new Date();
    const start = new Date(session.start_date);
    const end = new Date(session.end_date);
    return now >= start && now <= end;
  };

  const activeSessions = myEnrolledSessions.filter(
    (s) => s.status === 'active' || isSessionActive(s)
  );
  const upcomingSessions = myEnrolledSessions.filter(
    (s) => s.status === 'planned' && !isSessionActive(s)
  );
  const completedSessions = myEnrolledSessions.filter((s) => s.status === 'completed');

  return (
    <AppLayout
      title={`Bonjour ${user?.full_name || 'Étudiant'}`}
      subtitle="Bienvenue sur votre portail de formation"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Sessions inscrites</p>
                <p className="text-3xl font-bold mt-2">{myEnrolledSessions.length}</p>
              </div>
              <BookOpen className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Sessions actives</p>
                <p className="text-3xl font-bold mt-2">{activeSessions.length}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">À venir</p>
                <p className="text-3xl font-bold mt-2">{upcomingSessions.length}</p>
              </div>
              <Calendar className="h-12 w-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Terminées</p>
                <p className="text-3xl font-bold mt-2">{completedSessions.length}</p>
              </div>
              <Award className="h-12 w-12 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <PlayCircle className="h-6 w-6 text-green-600" />
                Sessions en cours
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-green-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{session.name}</h3>
                      {session.formation_title && (
                        <p className="text-sm text-green-700 font-medium">
                          📚 {session.formation_title}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {getStatusLabel(session.status)}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {session.segment_name && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{session.segment_name}</span>
                      </div>
                    )}
                    {session.city_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{session.city_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {formatDate(session.start_date)} - {formatDate(session.end_date)}
                      </span>
                    </div>
                  </div>

                  {session.formation_id && (
                    <div className="mt-4">
                      <Button
                        onClick={() =>
                          navigate(`/student/formations/${session.formation_id}`)
                        }
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Accéder à la formation
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="h-6 w-6 text-purple-600" />
              Sessions à venir
            </h2>
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{session.name}</h3>
                      {session.formation_title && (
                        <p className="text-sm text-gray-600 mb-2">
                          📚 {session.formation_title}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {session.segment_name && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{session.segment_name}</span>
                          </div>
                        )}
                        {session.city_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{session.city_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>Début: {formatDate(session.start_date)}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {getStatusLabel(session.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        {completedSessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Award className="h-6 w-6 text-gray-600" />
              Sessions terminées
            </h2>
            <div className="space-y-4">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{session.name}</h3>
                      {session.formation_title && (
                        <p className="text-sm text-gray-600">📚 {session.formation_title}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {getStatusLabel(session.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && myEnrolledSessions.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune session inscrite
            </h3>
            <p className="text-gray-500 mb-6">
              Vous n'êtes inscrit à aucune session de formation pour le moment.
            </p>
            <Button onClick={() => navigate('/student/catalog')}>
              Parcourir le catalogue
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
