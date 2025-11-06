import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSessionsFormation, useDeleteSession } from '@/hooks/useSessionsFormation';
import { SessionFormModal } from '@/components/admin/formations/SessionFormModal';
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Eye,
  Edit2,
  Trash2,
  BookOpen,
  AlertCircle,
  Search,
} from 'lucide-react';

export const SessionsFormation: React.FC = () => {
  const navigate = useNavigate();
  const { data: sessions, isLoading, error } = useSessionsFormation();
  const deleteSession = useDeleteSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

  const filteredSessions = sessions?.filter((session) =>
    session.titre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteSession.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error: any) {
      alert('Erreur: ' + (error.message || 'Impossible de supprimer cette session'));
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Chargement des sessions...</div>
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
            <span>Erreur lors du chargement des sessions</span>
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
              <Calendar className="h-7 w-7 text-blue-600" />
              Sessions de Formation
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gérez les sessions de formation (classes)
            </p>
          </div>

          <button
            onClick={() => {
              setEditingSession(null);
              setShowSessionModal(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            Nouvelle Session
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Sessions</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">{sessions?.length || 0}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium">En Cours</div>
            <div className="text-3xl font-bold text-green-900 mt-1">
              {sessions?.filter((s) => s.statut === 'en_cours').length || 0}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Planifiées</div>
            <div className="text-3xl font-bold text-purple-900 mt-1">
              {sessions?.filter((s) => s.statut === 'planifiee').length || 0}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 font-medium">Terminées</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {sessions?.filter((s) => s.statut === 'terminee').length || 0}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une session..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sessions List */}
        {filteredSessions && filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 relative"
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      session.statut === 'en_cours'
                        ? 'bg-blue-100 text-blue-800'
                        : session.statut === 'terminee'
                        ? 'bg-green-100 text-green-800'
                        : session.statut === 'annulee'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {session.statut === 'planifiee' && 'Planifiée'}
                    {session.statut === 'en_cours' && 'En cours'}
                    {session.statut === 'terminee' && 'Terminée'}
                    {session.statut === 'annulee' && 'Annulée'}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 text-lg mb-3 pr-20">{session.titre}</h3>

                  <div className="space-y-2 mb-4">
                    {session.date_debut && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(session.date_debut).toLocaleDateString('fr-FR')}
                          {session.date_fin && ` - ${new Date(session.date_fin).toLocaleDateString('fr-FR')}`}
                        </span>
                      </div>
                    )}

                    {session.ville_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{session.ville_name}</span>
                      </div>
                    )}

                    {session.corps_formation_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen className="h-4 w-4" />
                        <span>{session.corps_formation_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{session.nombre_etudiants || 0} étudiant(s)</span>
                    </div>
                  </div>

                  {/* Segment Badge */}
                  {session.segment_name && (
                    <div className="mb-4">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: session.segment_color + '20',
                          color: session.segment_color,
                        }}
                      >
                        {session.segment_name}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/admin/sessions-formation/${session.id}`)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded border border-blue-300 hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Voir
                    </button>

                    <button
                      onClick={() => {
                        setEditingSession(session);
                        setShowSessionModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded border border-green-300 hover:bg-green-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      Modifier
                    </button>

                    <button
                      onClick={() => setDeleteConfirm(session.id)}
                      className="px-3 py-2 bg-red-50 text-red-700 rounded border border-red-300 hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === session.id && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
                      <h4 className="font-bold text-gray-900 text-lg mb-2">Confirmer la suppression</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Êtes-vous sûr de vouloir supprimer la session "{session.titre}" ?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          disabled={deleteSession.isPending}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {deleteSession.isPending ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">Aucune session trouvée</p>
            <p className="text-gray-500 text-sm mb-4">
              {searchTerm
                ? 'Aucune session ne correspond à votre recherche'
                : 'Commencez par créer votre première session de formation'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  setEditingSession(null);
                  setShowSessionModal(true);
                }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Créer une session
              </button>
            )}
          </div>
        )}
      </div>

      {/* Session Modal */}
      {showSessionModal && (
        <SessionFormModal
          session={editingSession}
          onClose={() => {
            setShowSessionModal(false);
            setEditingSession(null);
          }}
        />
      )}
    </AppLayout>
  );
};
