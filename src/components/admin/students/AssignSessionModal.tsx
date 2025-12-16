import React, { useState } from 'react';
import { X, Search, Monitor, Building2, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionsFormation } from '@/hooks/useSessionsFormation';
import { useAssignStudentToSession, type StudentWithSession } from '@/hooks/useStudentsList';
import { toast } from '@/hooks/use-toast';

interface AssignSessionModalProps {
  student: StudentWithSession;
  onClose: () => void;
}

export const AssignSessionModal: React.FC<AssignSessionModalProps> = ({
  student,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useSessionsFormation();
  const assignMutation = useAssignStudentToSession();

  // Filtrer les sessions actives
  const activeSessions = sessions?.filter(session =>
    session.statut === 'planifiee' || session.statut === 'en_cours'
  ) || [];

  // Filtrer par recherche
  const filteredSessions = activeSessions.filter(session => {
    const searchLower = searchTerm.toLowerCase();
    return (
      session.titre.toLowerCase().includes(searchLower) ||
      (session.ville_name && session.ville_name.toLowerCase().includes(searchLower))
    );
  });

  const selectedSession = filteredSessions.find(s => s.id === selectedSessionId);

  const handleAssign = async () => {
    if (!selectedSessionId || !selectedSession) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une session',
      });
      return;
    }

    const prixTotal = typeof selectedSession.prix_total === 'string'
      ? parseFloat(selectedSession.prix_total)
      : (selectedSession.prix_total || 0);

    try {
      await assignMutation.mutateAsync({
        sessionId: selectedSessionId,
        studentId: student.id,
        montantTotal: prixTotal,
      });
      toast({
        title: 'Affectation réussie',
        description: `${student.prenom} ${student.nom} a été affecté à la session "${selectedSession.titre}"`,
      });
      onClose();
    } catch (error) {
      console.error('Error assigning student:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors de l\'affectation de l\'étudiant',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Affecter à une Session</h2>
            <p className="text-sm text-gray-500 mt-1">
              Étudiant: <span className="font-medium text-gray-700">{student.prenom} {student.nom}</span> ({student.cin})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher une session..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? 'Aucune session ne correspond à votre recherche'
                : 'Aucune session active disponible'}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSessionId === session.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{session.titre}</h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          session.session_type === 'en_ligne'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {session.session_type === 'en_ligne' ? (
                          <>
                            <Monitor className="w-3 h-3" />
                            En ligne
                          </>
                        ) : (
                          <>
                            <Building2 className="w-3 h-3" />
                            Présentielle
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                      {session.ville_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {session.ville_name}
                        </span>
                      )}
                      {session.date_debut && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(session.date_debut).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {session.corps_formation_name && (
                        <span className="text-gray-600">
                          {session.corps_formation_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">
                      {typeof session.prix_total === 'string'
                        ? parseFloat(session.prix_total).toLocaleString('fr-FR')
                        : (session.prix_total || 0).toLocaleString('fr-FR')} DH
                    </span>
                    <p className="text-xs text-gray-500">
                      {session.nombre_etudiants || 0}/{session.nombre_places || '∞'} places
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedSessionId || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Affectation...</span>
              </div>
            ) : (
              'Affecter à cette session'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignSessionModal;
