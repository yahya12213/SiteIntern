import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSessionFormation } from '@/hooks/useSessionsFormation';
import { AddStudentToSessionModal } from '@/components/admin/sessions-formation/AddStudentToSessionModal';
import { EditStudentModal } from '@/components/admin/sessions-formation/EditStudentModal';
import { DiscountModal } from '@/components/admin/sessions-formation/DiscountModal';
import { apiClient } from '@/lib/api/client';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  BookOpen,
  UserCheck,
  FileText,
  ClipboardList,
  ArrowLeft,
  AlertCircle,
  MoreVertical,
  Edit,
  Receipt,
  Tag,
  Award,
  Trash2,
} from 'lucide-react';

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, error, refetch } = useSessionFormation(id);
  const [activeTab, setActiveTab] = useState<'etudiants' | 'profs' | 'tests' | 'presences'>('etudiants');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleGenerateCertificate = async (etudiant: any) => {
    if (!etudiant.formation_id) {
      alert('Impossible de générer le certificat: aucune formation assignée à cet étudiant');
      return;
    }

    try {
      // Générer le certificat (template_id sera géré par le backend)
      await apiClient.post('/certificates/generate', {
        student_id: etudiant.student_id,
        formation_id: etudiant.formation_id,
        completion_date: new Date().toISOString().split('T')[0],
      });

      alert('Certificat généré avec succès!');
      refetch();
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      if (error.message.includes('already exists')) {
        alert('Un certificat existe déjà pour cet étudiant et cette formation');
      } else if (error.message.includes('template')) {
        alert('Erreur: Aucun modèle de certificat disponible. Veuillez créer des modèles de certificats d\'abord.');
      } else {
        alert('Erreur lors de la génération du certificat: ' + error.message);
      }
    }
  };

  const handleDeleteStudent = async (etudiant: any) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${etudiant.student_name} de cette session?`)) {
      return;
    }

    try {
      await apiClient.delete(`/sessions-formation/${id}/etudiants/${etudiant.student_id}`);
      alert('Étudiant retiré de la session avec succès');
      refetch();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !session) {
    return (
      <AppLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>Erreur lors du chargement de la session</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const stats = session.statistiques;
  const totalPaye = Number(parseFloat(stats?.total_paye?.toString() || '0')) || 0;
  const totalImpaye = Number(parseFloat(stats?.total_impaye?.toString() || '0')) || 0;
  const totalPartiellement = Number(parseFloat(stats?.total_partiellement_paye?.toString() || '0')) || 0;

  // Helper pour construire l'URL complète des images
  const getImageUrl = (relativeUrl: string | null | undefined): string => {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${relativeUrl}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/admin/sessions-formation')}
              className="mt-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {session.titre}
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
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
              </h1>

              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                {session.date_debut && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(session.date_debut).toLocaleDateString('fr-FR')}
                    {session.date_fin && ` - ${new Date(session.date_fin).toLocaleDateString('fr-FR')}`}
                  </div>
                )}
                {session.ville_name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {session.ville_name}
                  </div>
                )}
                {session.segment_name && (
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: session.segment_color + '20', color: session.segment_color }}
                  >
                    {session.segment_name}
                  </span>
                )}
                {session.corps_formation_name && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {session.corps_formation_name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600 font-medium">Étudiants</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{session.nombre_etudiants || 0}</div>
              </div>
              <Users className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-600 font-medium">Professeurs</div>
                <div className="text-2xl font-bold text-purple-900 mt-1">{session.nombre_professeurs || 0}</div>
              </div>
              <UserCheck className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600 font-medium">Total Payé</div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {totalPaye.toFixed(2)} DH
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-red-600 font-medium">Total Dû</div>
                <div className="text-2xl font-bold text-red-900 mt-1">
                  {totalImpaye.toFixed(2)} DH
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Payment Statistics Chart Placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques de Paiement</h3>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Graphique à implémenter</p>
              <div className="mt-4 flex gap-4 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Payé: {totalPaye.toFixed(2)} DH</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Partiellement: {totalPartiellement.toFixed(2)} DH</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Impayé: {totalImpaye.toFixed(2)} DH</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('etudiants')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'etudiants'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-4 w-4" />
                Étudiants
              </button>
              <button
                onClick={() => setActiveTab('profs')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'profs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                Profs
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'tests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="h-4 w-4" />
                Fichier Tests
              </button>
              <button
                onClick={() => setActiveTab('presences')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'presences'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                Fiche de présences
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'etudiants' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Liste des étudiants ({session.etudiants?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ajouter un étudiant
                  </button>
                </div>

                {session.etudiants && session.etudiants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Photo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Nom
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Formation
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Remise
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            CIN
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Téléphone
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Statut Paiement
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Montant Payé
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {session.etudiants.map((etudiant) => {
                          const initials = etudiant.student_name
                            ?.split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase() || '??';

                          return (
                            <tr key={etudiant.id} className="hover:bg-gray-50">
                              {/* Photo */}
                              <td className="px-4 py-3">
                                {etudiant.profile_image_url ? (
                                  <img
                                    src={getImageUrl(etudiant.profile_image_url)}
                                    alt={etudiant.student_name}
                                    className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                                    onError={(e) => {
                                      // Si l'image ne charge pas, afficher les initiales
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : null}
                                {!etudiant.profile_image_url && (
                                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm border-2 border-blue-200">
                                    {initials}
                                  </div>
                                )}
                              </td>

                              <td className="px-4 py-3 text-sm text-gray-900">{etudiant.student_name}</td>
                              <td className="px-4 py-3 text-sm text-blue-600 font-medium">{etudiant.formation_title || '-'}</td>

                              {/* Remise */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {etudiant.discount_percentage && parseFloat(etudiant.discount_percentage.toString()) > 0 ? (
                                    <button
                                      onClick={() => {
                                        setSelectedStudent(etudiant);
                                        setShowDiscountModal(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                                    >
                                      <span>{parseFloat(etudiant.discount_percentage.toString()).toFixed(1)}%</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedStudent(etudiant);
                                        setShowDiscountModal(true);
                                      }}
                                      className="text-xs text-gray-400 hover:text-purple-600 hover:underline"
                                    >
                                      Ajouter
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-sm text-gray-600">{etudiant.student_cin}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{etudiant.student_phone}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    etudiant.statut_paiement === 'paye'
                                      ? 'bg-green-100 text-green-800'
                                      : etudiant.statut_paiement === 'partiellement_paye'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {etudiant.statut_paiement === 'paye' && 'Payé'}
                                  {etudiant.statut_paiement === 'partiellement_paye' && 'Partiellement'}
                                  {etudiant.statut_paiement === 'impaye' && 'Impayé'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {parseFloat(etudiant.montant_paye?.toString() || '0').toFixed(2)} DH
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 relative">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === etudiant.id ? null : etudiant.id)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                  <MoreVertical className="h-5 w-5 text-gray-600" />
                                </button>

                                {openMenuId === etudiant.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={() => setOpenMenuId(null)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                      <button
                                        onClick={() => {
                                          setSelectedStudent(etudiant);
                                          setShowEditStudentModal(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Edit className="h-4 w-4" />
                                        Modifier
                                      </button>

                                      <button
                                        onClick={() => {
                                          setSelectedStudent(etudiant);
                                          setShowDiscountModal(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Tag className="h-4 w-4" />
                                        Remise
                                      </button>

                                      <button
                                        onClick={() => {
                                          // TODO: Open payment manager
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Receipt className="h-4 w-4" />
                                        Paiements
                                      </button>

                                      <button
                                        onClick={() => {
                                          handleGenerateCertificate(etudiant);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Award className="h-4 w-4" />
                                        Certificat
                                      </button>

                                      <div className="border-t border-gray-200 my-1" />

                                      <button
                                        onClick={() => {
                                          handleDeleteStudent(etudiant);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Supprimer
                                      </button>
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Aucun étudiant inscrit</div>
                )}
              </div>
            )}

            {activeTab === 'profs' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Liste des professeurs ({session.professeurs?.length || 0})
                  </h3>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Affecter un professeur
                  </button>
                </div>

                {session.professeurs && session.professeurs.length > 0 ? (
                  <div className="space-y-2">
                    {session.professeurs.map((prof) => (
                      <div
                        key={prof.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{prof.professeur_name}</div>
                          <div className="text-sm text-gray-600">{prof.professeur_email}</div>
                        </div>
                        <button className="text-red-600 hover:text-red-800 transition-colors">
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Aucun professeur affecté</div>
                )}
              </div>
            )}

            {activeTab === 'tests' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Liste des tests</h3>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Ajouter un fichier de test
                  </button>
                </div>

                {session.fichiers?.filter((f) => f.type === 'test').length ? (
                  <div className="space-y-2">
                    {session.fichiers
                      .filter((f) => f.type === 'test')
                      .map((fichier) => (
                        <div key={fichier.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{fichier.titre}</div>
                              {fichier.file_name && (
                                <div className="text-sm text-gray-600">{fichier.file_name}</div>
                              )}
                            </div>
                          </div>
                          <button className="text-red-600 hover:text-red-800 transition-colors">
                            Supprimer
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Aucun fichier de test</div>
                )}
              </div>
            )}

            {activeTab === 'presences' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Liste des fiches de présences</h3>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Ajouter une fiche de présence
                  </button>
                </div>

                {session.fichiers?.filter((f) => f.type === 'presence').length ? (
                  <div className="space-y-2">
                    {session.fichiers
                      .filter((f) => f.type === 'presence')
                      .map((fichier) => (
                        <div key={fichier.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <ClipboardList className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{fichier.titre}</div>
                              {fichier.file_name && (
                                <div className="text-sm text-gray-600">{fichier.file_name}</div>
                              )}
                            </div>
                          </div>
                          <button className="text-red-600 hover:text-red-800 transition-colors">
                            Supprimer
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Aucune fiche de présence</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && session?.corps_formation_id && (
        <AddStudentToSessionModal
          sessionId={session.id}
          corpsFormationId={session.corps_formation_id}
          onClose={() => setShowAddStudentModal(false)}
          onSuccess={() => {
            refetch();
            setShowAddStudentModal(false);
          }}
        />
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          onClose={() => {
            setShowEditStudentModal(false);
            setSelectedStudent(null);
          }}
          onSuccess={() => {
            refetch();
            setShowEditStudentModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* Discount Modal */}
      {showDiscountModal && selectedStudent && session && (
        <DiscountModal
          student={selectedStudent}
          sessionId={session.id}
          onClose={() => {
            setShowDiscountModal(false);
            setSelectedStudent(null);
          }}
          onSuccess={() => {
            refetch();
            setShowDiscountModal(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </AppLayout>
  );
};
