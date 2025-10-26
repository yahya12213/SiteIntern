import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useAdminDeclarations,
  useDeclarationStats,
  useRejectDeclaration,
  useRequestModification,
  useDeleteAdminDeclaration,
  type AdminDeclaration,
} from '@/hooks/useAdminDeclarations';
import EditDeclarationModal from '@/components/admin/EditDeclarationModal';

const DeclarationsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProfessor, setSelectedProfessor] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedDeclaration, setSelectedDeclaration] = useState<AdminDeclaration | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [declarationToEdit, setDeclarationToEdit] = useState<AdminDeclaration | null>(null);

  const { data: allDeclarations = [], isLoading } = useAdminDeclarations(selectedStatus);
  const { data: stats } = useDeclarationStats();
  const rejectDeclaration = useRejectDeclaration();
  const requestModification = useRequestModification();
  const deleteDeclaration = useDeleteAdminDeclaration();

  // Extraire les listes uniques pour les filtres
  const professors = React.useMemo(() => {
    const unique = Array.from(new Set(allDeclarations.map(d => d.professor_name)));
    return unique.sort();
  }, [allDeclarations]);

  const cities = React.useMemo(() => {
    const unique = Array.from(new Set(allDeclarations.map(d => d.city_name)));
    return unique.sort();
  }, [allDeclarations]);

  const segments = React.useMemo(() => {
    const unique = Array.from(new Set(allDeclarations.map(d => d.segment_name)));
    return unique.sort();
  }, [allDeclarations]);

  // Appliquer les filtres
  const declarations = React.useMemo(() => {
    return allDeclarations.filter(declaration => {
      if (selectedProfessor !== 'all' && declaration.professor_name !== selectedProfessor) {
        return false;
      }
      if (selectedCity !== 'all' && declaration.city_name !== selectedCity) {
        return false;
      }
      if (selectedSegment !== 'all' && declaration.segment_name !== selectedSegment) {
        return false;
      }
      return true;
    });
  }, [allDeclarations, selectedProfessor, selectedCity, selectedSegment]);

  const statusConfig = {
    brouillon: {
      label: 'Brouillon',
      color: 'bg-gray-100 text-gray-800',
      bgColor: 'bg-gray-50 border-gray-200',
      hoverColor: 'hover:bg-gray-100',
      icon: FileText
    },
    a_declarer: {
      label: 'À déclarer',
      color: 'bg-orange-100 text-orange-800',
      bgColor: 'bg-orange-50 border-orange-200',
      hoverColor: 'hover:bg-orange-100',
      icon: AlertCircle
    },
    soumise: {
      label: 'Soumise',
      color: 'bg-blue-100 text-blue-800',
      bgColor: 'bg-blue-50 border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      icon: Clock
    },
    en_cours: {
      label: 'En cours',
      color: 'bg-yellow-100 text-yellow-800',
      bgColor: 'bg-yellow-50 border-yellow-200',
      hoverColor: 'hover:bg-yellow-100',
      icon: AlertCircle
    },
    approuvee: {
      label: 'Approuvée',
      color: 'bg-green-100 text-green-800',
      bgColor: 'bg-green-50 border-green-200',
      hoverColor: 'hover:bg-green-100',
      icon: CheckCircle
    },
    refusee: {
      label: 'Refusée',
      color: 'bg-red-100 text-red-800',
      bgColor: 'bg-red-50 border-red-200',
      hoverColor: 'hover:bg-red-100',
      icon: XCircle
    },
  };


  const handleReject = async () => {
    if (!selectedDeclaration || !rejectionReason.trim()) {
      alert('Veuillez fournir un motif de refus');
      return;
    }

    try {
      await rejectDeclaration.mutateAsync({
        id: selectedDeclaration.id,
        reason: rejectionReason,
      });
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedDeclaration(null);
    } catch (error) {
      console.error('Error rejecting declaration:', error);
      alert('Erreur lors du refus');
    }
  };

  const handleRequestModification = async () => {
    if (!selectedDeclaration || !rejectionReason.trim()) {
      alert('Veuillez fournir un motif de demande de modification');
      return;
    }

    try {
      await requestModification.mutateAsync({
        id: selectedDeclaration.id,
        reason: rejectionReason,
      });
      setShowModificationModal(false);
      setRejectionReason('');
      setSelectedDeclaration(null);
    } catch (error) {
      console.error('Error requesting modification:', error);
      alert('Erreur lors de la demande de modification');
    }
  };

  const handleDelete = async (declaration: AdminDeclaration) => {
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer cette déclaration de ${declaration.professor_name} ?\n\nCette action est irréversible.`;

    if (confirm(confirmMessage)) {
      try {
        await deleteDeclaration.mutateAsync(declaration.id);
      } catch (error) {
        console.error('Error deleting declaration:', error);
        alert('Erreur lors de la suppression de la déclaration');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Gestion des Déclarations
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Valider, refuser ou demander des modifications
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{stats.a_declarer || 0}</p>
                  <p className="text-sm text-gray-600">À déclarer</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.soumises}</p>
                  <p className="text-sm text-gray-600">Soumises</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.en_cours}</p>
                  <p className="text-sm text-gray-600">En cours</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.approuvees}</p>
                  <p className="text-sm text-gray-600">Approuvées</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.refusees}</p>
                  <p className="text-sm text-gray-600">Refusées</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtre par statut */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Par statut
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('all')}
                >
                  Toutes
                </Button>
                <Button
                  variant={selectedStatus === 'a_declarer' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('a_declarer')}
                >
                  À déclarer
                </Button>
                <Button
                  variant={selectedStatus === 'soumise' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('soumise')}
                >
                  Soumises
                </Button>
                <Button
                  variant={selectedStatus === 'en_cours' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('en_cours')}
                >
                  En cours
                </Button>
                <Button
                  variant={selectedStatus === 'approuvee' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('approuvee')}
                >
                  Approuvées
                </Button>
                <Button
                  variant={selectedStatus === 'refusee' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('refusee')}
                >
                  Refusées
                </Button>
              </div>
            </div>

            {/* Filtres additionnels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtre par professeur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Par professeur
                </label>
                <select
                  value={selectedProfessor}
                  onChange={(e) => setSelectedProfessor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">Tous les professeurs</option>
                  {professors.filter((p): p is string => p !== undefined).map((professor) => (
                    <option key={professor} value={professor}>
                      {professor}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre par ville */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Par ville
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">Toutes les villes</option>
                  {cities.filter((c): c is string => c !== undefined).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre par segment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Par segment
                </label>
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">Tous les segments</option>
                  {segments.filter((s): s is string => s !== undefined).map((segment) => (
                    <option key={segment} value={segment}>
                      {segment}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des déclarations */}
        <Card>
          <CardHeader>
            <CardTitle>
              Déclarations ({declarations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Chargement...</p>
              </div>
            ) : declarations.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Aucune déclaration trouvée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {declarations.map((declaration: any) => {
                  const StatusIcon = (statusConfig as any)[declaration.status].icon;
                  const config = (statusConfig as any)[declaration.status];

                  return (
                    <div
                      key={declaration.id}
                      className={`border rounded-lg p-4 transition-all ${config.bgColor} ${config.hoverColor}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {declaration.professor_name}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Segment:</span> {declaration.segment_name}
                            </div>
                            <div>
                              <span className="font-medium">Ville:</span> {declaration.city_name}
                            </div>
                            <div>
                              <span className="font-medium">Période:</span>{' '}
                              {formatDate(declaration.start_date)} - {formatDate(declaration.end_date)}
                            </div>
                            <div>
                              <span className="font-medium">Soumise le:</span>{' '}
                              {declaration.submitted_at
                                ? formatDate(declaration.submitted_at)
                                : 'N/A'}
                            </div>
                          </div>
                          {declaration.rejection_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <span className="font-medium">Motif:</span> {declaration.rejection_reason}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeclarationToEdit(declaration);
                              setShowEditModal(true);
                            }}
                            className="bg-white hover:bg-purple-50 border-purple-300"
                            title="Modifier les métadonnées"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/declarations/${declaration.id}`)}
                            className="bg-white hover:bg-blue-50 border-blue-300"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Ouvrir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white text-red-600 hover:bg-red-50 border-red-300"
                            onClick={() => handleDelete(declaration)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Détails */}
      {selectedDeclaration && !showRejectModal && !showModificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Détails de la déclaration</h2>
              <div className="space-y-4">
                <div>
                  <span className="font-medium">Professeur:</span> {selectedDeclaration.professor_name}
                </div>
                <div>
                  <span className="font-medium">Segment:</span> {selectedDeclaration.segment_name}
                </div>
                <div>
                  <span className="font-medium">Ville:</span> {selectedDeclaration.city_name}
                </div>
                <div>
                  <span className="font-medium">Fiche de calcul:</span> {selectedDeclaration.sheet_title}
                </div>
                <div>
                  <span className="font-medium">Période:</span>{' '}
                  {formatDate(selectedDeclaration.start_date)} - {formatDate(selectedDeclaration.end_date)}
                </div>
                <div>
                  <span className="font-medium">Statut:</span>{' '}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[selectedDeclaration.status].color}`}>
                    {statusConfig[selectedDeclaration.status].label}
                  </span>
                </div>
                {selectedDeclaration.form_data && (
                  <div>
                    <span className="font-medium">Données du formulaire:</span>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedDeclaration.form_data), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedDeclaration(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Refus */}
      {showRejectModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Refuser la déclaration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez fournir un motif de refus pour la déclaration de{' '}
                <strong>{selectedDeclaration.professor_name}</strong>
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
                placeholder="Motif du refus..."
              />
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setSelectedDeclaration(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                >
                  Refuser
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Demande de modification */}
      {showModificationModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Demander une modification</h2>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez préciser les modifications à apporter pour la déclaration de{' '}
                <strong>{selectedDeclaration.professor_name}</strong>
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                rows={4}
                placeholder="Modifications demandées..."
              />
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModificationModal(false);
                    setRejectionReason('');
                    setSelectedDeclaration(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={handleRequestModification}
                  disabled={!rejectionReason.trim()}
                >
                  Demander
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier la déclaration */}
      {showEditModal && declarationToEdit && (
        <EditDeclarationModal
          declaration={declarationToEdit}
          onClose={() => {
            setShowEditModal(false);
            setDeclarationToEdit(null);
          }}
        />
      )}
    </div>
  );
};

export default DeclarationsManagement;
