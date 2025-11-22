import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSessionFormation } from '@/hooks/useSessionsFormation';
import { AddStudentToSessionModal } from '@/components/admin/sessions-formation/AddStudentToSessionModal';
import { EditStudentModal } from '@/components/admin/sessions-formation/EditStudentModal';
import { DiscountModal } from '@/components/admin/sessions-formation/DiscountModal';
import { PaymentManagerModal } from '@/components/admin/sessions-formation/PaymentManagerModal';
import { ImageCropperModal } from '@/components/admin/students/ImageCropperModal';
import { apiClient } from '@/lib/api/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CertificateTemplateEngine } from '@/lib/utils/certificateTemplateEngine';
import type { Certificate } from '@/lib/api/certificates';
import type { CertificateTemplate } from '@/types/certificateTemplate';
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
  Trash2,
  CheckSquare,
  Square,
  ShieldCheck,
  ShieldX,
  ChevronRight,
  FileDown,
  Loader2,
} from 'lucide-react';

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, error, refetch } = useSessionFormation(id);
  const [activeTab, setActiveTab] = useState<'etudiants' | 'profs' | 'tests' | 'presences'>('etudiants');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [documentSubmenuOpen, setDocumentSubmenuOpen] = useState<string | null>(null);
  const [availableDocuments, setAvailableDocuments] = useState<Record<string, any[]>>({});
  const [loadingDocuments, setLoadingDocuments] = useState<string | null>(null);
  const [generatingDocument, setGeneratingDocument] = useState<string | null>(null);
  const [showBulkDocumentModal, setShowBulkDocumentModal] = useState(false);
  const [bulkTemplates, setBulkTemplates] = useState<any[]>([]);
  const [generatingBulkDocuments, setGeneratingBulkDocuments] = useState(false);
  const [bulkGenerationProgress, setBulkGenerationProgress] = useState({ current: 0, total: 0, templateName: '' });

  // Charger les documents disponibles pour un étudiant
  const loadAvailableDocuments = async (studentId: string) => {
    if (availableDocuments[studentId]) {
      setDocumentSubmenuOpen(studentId);
      return;
    }

    setLoadingDocuments(studentId);
    try {
      const response = await apiClient.get(`/sessions-formation/${id}/etudiants/${studentId}/available-documents`) as { templates: any[] };
      setAvailableDocuments(prev => ({
        ...prev,
        [studentId]: response.templates || []
      }));
      setDocumentSubmenuOpen(studentId);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      alert('Erreur lors du chargement des documents: ' + error.message);
    } finally {
      setLoadingDocuments(null);
    }
  };

  // Générer et télécharger un document
  const handleGenerateDocument = async (etudiant: any, template: any) => {
    if (etudiant.student_status === 'abandonne') {
      alert('Impossible de générer le document: cet étudiant a le statut "Abandonné".');
      return;
    }

    setGeneratingDocument(`${etudiant.student_id}-${template.template_id}`);
    try {
      // Récupérer le template complet avec sa configuration
      const templateResponse = await apiClient.get(`/certificate-templates/${template.template_id}`) as { success: boolean; template: CertificateTemplate };
      const fullTemplate: CertificateTemplate = templateResponse.template;

      // Construire l'objet Certificate avec les données de l'étudiant
      const certificateData: Certificate = {
        id: `temp-${Date.now()}`,
        student_id: etudiant.student_id,
        formation_id: etudiant.formation_id,
        student_name: etudiant.student_name,
        student_email: etudiant.student_email || '',
        formation_title: etudiant.formation_title || '',
        formation_description: '',
        duration_hours: 0,
        certificate_number: `DOC-${Date.now()}`,
        issued_at: new Date().toISOString(),
        completion_date: new Date().toISOString(),
        grade: null,
        metadata: {
          student_first_name: etudiant.student_first_name || etudiant.student_name?.split(' ')[0] || '',
          student_last_name: etudiant.student_last_name || etudiant.student_name?.split(' ').slice(1).join(' ') || '',
          cin: etudiant.student_cin || '',
          phone: etudiant.student_phone || '',
          whatsapp: etudiant.student_whatsapp || '',
          date_naissance: etudiant.student_birth_date || '',
          lieu_naissance: etudiant.student_birth_place || '',
          adresse: etudiant.student_address || '',
          organization_name: session?.titre || 'Session de Formation',
          // Session data
          session_title: session?.titre || '',
          session_date_debut: session?.date_debut || '',
          session_date_fin: session?.date_fin || '',
          session_ville: session?.ville_name || '',
          session_segment: session?.segment_name || '',
          session_corps_formation: session?.corps_formation_name || '',
          // Student photo
          student_photo_url: etudiant.profile_image_url || '',
          // Certificate serial (to be generated)
          certificate_serial: `${etudiant.student_id?.substring(0, 8) || 'XXXX'}-${Date.now().toString(36).toUpperCase()}`,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Générer le PDF
      const engine = new CertificateTemplateEngine(certificateData, fullTemplate);
      const doc = await engine.generate();

      // Formater le nom de fichier: NomPrenom_NomSession_TypeDocument.pdf
      const studentName = etudiant.student_name?.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Etudiant';
      const sessionName = session?.titre?.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Session';
      const documentType = template.document_type?.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Document';
      const filename = `${studentName}_${sessionName}_${documentType}.pdf`;

      // Télécharger le PDF
      doc.save(filename);

      setOpenMenuId(null);
      setDocumentSubmenuOpen(null);
    } catch (error: any) {
      console.error('Error generating document:', error);
      alert('Erreur lors de la génération du document: ' + error.message);
    } finally {
      setGeneratingDocument(null);
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

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const toggleAllStudents = () => {
    if (!session?.etudiants) return;

    // Exclure les étudiants abandonnés de la sélection
    const validStudents = session.etudiants.filter((e: any) => e.student_status !== 'abandonne');

    if (selectedStudents.size === validStudents.length && validStudents.length > 0) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(validStudents.map((e: any) => e.student_id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: 'valide' | 'abandonne') => {
    if (selectedStudents.size === 0) {
      alert('Veuillez sélectionner au moins un étudiant');
      return;
    }

    const statusLabel = newStatus === 'valide' ? 'Valide' : 'Abandonné';
    if (!confirm(`Êtes-vous sûr de vouloir changer le statut de ${selectedStudents.size} étudiant(s) en "${statusLabel}"?`)) {
      return;
    }

    setIsChangingStatus(true);
    try {
      await apiClient.put(`/sessions-formation/${id}/etudiants/bulk-status`, {
        student_ids: Array.from(selectedStudents),
        status: newStatus
      });

      alert(`Statut mis à jour avec succès pour ${selectedStudents.size} étudiant(s)`);
      setSelectedStudents(new Set());
      refetch();
    } catch (error: any) {
      console.error('Error changing status:', error);
      alert('Erreur lors du changement de statut: ' + error.message);
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Charger les templates communs pour la génération en masse
  const loadBulkTemplates = async () => {
    if (selectedStudents.size === 0) {
      alert('Veuillez sélectionner au moins un étudiant');
      return;
    }

    try {
      // Récupérer les étudiants sélectionnés (exclure les abandonnés)
      const selectedEtudiants = session?.etudiants?.filter(
        (e: any) => selectedStudents.has(e.student_id) && e.student_status !== 'abandonne'
      ) || [];

      if (selectedEtudiants.length === 0) {
        alert('Aucun étudiant valide sélectionné');
        return;
      }

      // Récupérer les formation_ids uniques
      const formationIds = [...new Set(selectedEtudiants.map((e: any) => e.formation_id))];

      // Charger les templates pour chaque formation
      const templatesMap: Record<string, any[]> = {};
      for (const formationId of formationIds) {
        const studentForFormation = selectedEtudiants.find((e: any) => e.formation_id === formationId);
        if (studentForFormation) {
          const response = await apiClient.get(`/sessions-formation/${id}/etudiants/${studentForFormation.student_id}/available-documents`) as { templates: any[] };
          templatesMap[formationId] = response.templates || [];
        }
      }

      // Trouver les templates communs à toutes les formations
      let commonTemplates: any[] = [];
      const allTemplateArrays = Object.values(templatesMap);

      if (allTemplateArrays.length > 0) {
        commonTemplates = allTemplateArrays[0];
        for (let i = 1; i < allTemplateArrays.length; i++) {
          const currentTemplateIds = new Set(allTemplateArrays[i].map((t: any) => t.template_id));
          commonTemplates = commonTemplates.filter((t: any) => currentTemplateIds.has(t.template_id));
        }
      }

      if (commonTemplates.length === 0) {
        alert('Aucun template commun trouvé pour les formations sélectionnées');
        return;
      }

      setBulkTemplates(commonTemplates);
      setShowBulkDocumentModal(true);
    } catch (error: any) {
      console.error('Error loading bulk templates:', error);
      alert('Erreur lors du chargement des templates: ' + error.message);
    }
  };

  // Générer les documents en masse
  const handleBulkDocumentGeneration = async (template: any) => {
    const selectedEtudiants = session?.etudiants?.filter(
      (e: any) => selectedStudents.has(e.student_id) && e.student_status !== 'abandonne'
    ) || [];

    if (selectedEtudiants.length === 0) {
      alert('Aucun étudiant valide sélectionné');
      return;
    }

    setGeneratingBulkDocuments(true);
    setBulkGenerationProgress({ current: 0, total: selectedEtudiants.length, templateName: template.template_name });

    try {
      // Récupérer le template complet
      const templateResponse = await apiClient.get(`/certificate-templates/${template.template_id}`) as { success: boolean; template: CertificateTemplate };
      const fullTemplate: CertificateTemplate = templateResponse.template;

      // Générer le premier document pour l'utiliser comme base
      const firstEtudiant: any = selectedEtudiants[0];
      setBulkGenerationProgress(prev => ({ ...prev, current: 1 }));

      const firstCertificateData: Certificate = {
        id: `temp-${Date.now()}-0`,
        student_id: firstEtudiant.student_id,
        formation_id: firstEtudiant.formation_id || '',
        student_name: firstEtudiant.student_name,
        student_email: firstEtudiant.student_email || '',
        formation_title: firstEtudiant.formation_title || '',
        formation_description: '',
        duration_hours: 0,
        certificate_number: `DOC-${Date.now()}-0`,
        issued_at: new Date().toISOString(),
        completion_date: new Date().toISOString(),
        grade: null,
        metadata: {
          student_first_name: firstEtudiant.student_first_name || firstEtudiant.student_name?.split(' ')[0] || '',
          student_last_name: firstEtudiant.student_last_name || firstEtudiant.student_name?.split(' ').slice(1).join(' ') || '',
          cin: firstEtudiant.student_cin || '',
          phone: firstEtudiant.student_phone || '',
          whatsapp: firstEtudiant.student_whatsapp || '',
          date_naissance: firstEtudiant.student_birth_date || '',
          lieu_naissance: firstEtudiant.student_birth_place || '',
          adresse: firstEtudiant.student_address || '',
          organization_name: session?.titre || 'Session de Formation',
          session_title: session?.titre || '',
          session_date_debut: session?.date_debut || '',
          session_date_fin: session?.date_fin || '',
          session_ville: session?.ville_name || '',
          session_segment: session?.segment_name || '',
          session_corps_formation: session?.corps_formation_name || '',
          student_photo_url: firstEtudiant.profile_image_url || '',
          certificate_serial: `${firstEtudiant.student_id?.substring(0, 8) || 'XXXX'}-${Date.now().toString(36).toUpperCase()}`,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const firstEngine = new CertificateTemplateEngine(firstCertificateData, fullTemplate);
      const combinedDoc = await firstEngine.generate();

      // Ajouter les pages pour les autres étudiants
      for (let i = 1; i < selectedEtudiants.length; i++) {
        const etudiant: any = selectedEtudiants[i];
        setBulkGenerationProgress(prev => ({ ...prev, current: i + 1 }));

        const certificateData: Certificate = {
          id: `temp-${Date.now()}-${i}`,
          student_id: etudiant.student_id,
          formation_id: etudiant.formation_id || '',
          student_name: etudiant.student_name,
          student_email: etudiant.student_email || '',
          formation_title: etudiant.formation_title || '',
          formation_description: '',
          duration_hours: 0,
          certificate_number: `DOC-${Date.now()}-${i}`,
          issued_at: new Date().toISOString(),
          completion_date: new Date().toISOString(),
          grade: null,
          metadata: {
            student_first_name: etudiant.student_first_name || etudiant.student_name?.split(' ')[0] || '',
            student_last_name: etudiant.student_last_name || etudiant.student_name?.split(' ').slice(1).join(' ') || '',
            cin: etudiant.student_cin || '',
            phone: etudiant.student_phone || '',
            whatsapp: etudiant.student_whatsapp || '',
            date_naissance: etudiant.student_birth_date || '',
            lieu_naissance: etudiant.student_birth_place || '',
            adresse: etudiant.student_address || '',
            organization_name: session?.titre || 'Session de Formation',
            session_title: session?.titre || '',
            session_date_debut: session?.date_debut || '',
            session_date_fin: session?.date_fin || '',
            session_ville: session?.ville_name || '',
            session_segment: session?.segment_name || '',
            session_corps_formation: session?.corps_formation_name || '',
            student_photo_url: etudiant.profile_image_url || '',
            certificate_serial: `${etudiant.student_id?.substring(0, 8) || 'XXXX'}-${Date.now().toString(36).toUpperCase()}`,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Créer l'engine avec le document combiné existant
        const engine = new CertificateTemplateEngine(certificateData, fullTemplate);
        await engine.appendToDocument(combinedDoc);
      }

      // Nom du fichier combiné
      const sessionName = session?.titre?.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Session';
      const templateName = template.document_type?.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Document';
      const filename = `${templateName}_${sessionName}_${selectedEtudiants.length}_etudiants.pdf`;

      combinedDoc.save(filename);

      setShowBulkDocumentModal(false);
      alert(`PDF combiné généré avec succès pour ${selectedEtudiants.length} étudiant(s)`);
    } catch (error: any) {
      console.error('Error generating bulk documents:', error);
      alert('Erreur lors de la génération: ' + error.message);
    } finally {
      setGeneratingBulkDocuments(false);
      setBulkGenerationProgress({ current: 0, total: 0, templateName: '' });
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
    // Use relative path directly - works in both dev (Vite proxy) and production (same domain)
    return relativeUrl;
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
                    style={{
                      backgroundColor: session.segment_color ? session.segment_color + '20' : '#e5e7eb',
                      color: session.segment_color || '#6b7280'
                    }}
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

        {/* Payment Statistics Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques de Paiement</h3>
          <div className="h-64">
            {session.etudiants && session.etudiants.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Payé', value: totalPaye, count: session.etudiants.filter((e: any) => e.statut_paiement === 'paye').length },
                      { name: 'Partiellement', value: totalPartiellement, count: session.etudiants.filter((e: any) => e.statut_paiement === 'partiellement_paye').length },
                      { name: 'Impayé', value: totalImpaye, count: session.etudiants.filter((e: any) => e.statut_paiement === 'impaye').length },
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell key="cell-0" fill="#22c55e" />
                    <Cell key="cell-1" fill="#eab308" />
                    <Cell key="cell-2" fill="#ef4444" />
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toFixed(2)} DH (${props.payload.count} étudiants)`,
                      name
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => (
                      <span className="text-sm text-gray-600">
                        {value}: {entry.payload.value.toFixed(2)} DH ({entry.payload.count} étudiants)
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Aucun étudiant inscrit</p>
                </div>
              </div>
            )}
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
                  <div>
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            <button
                              onClick={toggleAllStudents}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title={selectedStudents.size === session.etudiants.length ? "Désélectionner tout" : "Sélectionner tout"}
                            >
                              {selectedStudents.size === session.etudiants.length ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Photo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Nom
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Statut
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Formation
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Prix Formation
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
                            Reste à Payer
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
                            <tr key={etudiant.id} className={`hover:bg-gray-50 ${etudiant.student_status === 'abandonne' ? 'bg-red-50' : ''}`}>
                              {/* Checkbox */}
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleStudentSelection(etudiant.student_id)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                  {selectedStudents.has(etudiant.student_id) ? (
                                    <CheckSquare className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <Square className="h-5 w-5 text-gray-400" />
                                  )}
                                </button>
                              </td>

                              {/* Photo */}
                              <td className="px-4 py-3">
                                {(() => {
                                  const hasImageError = imageErrors.has(etudiant.id);
                                  const shouldShowImage = etudiant.profile_image_url && !hasImageError;

                                  return shouldShowImage ? (
                                    <img
                                      src={getImageUrl(etudiant.profile_image_url)}
                                      alt={etudiant.student_name}
                                      className="w-[60px] h-20 rounded-lg object-cover border-3 border-gray-300 shadow-sm cursor-pointer hover:border-blue-500 transition-all"
                                      onClick={() => {
                                        setSelectedStudent(etudiant);
                                        setShowCropModal(true);
                                      }}
                                      onError={() => {
                                        setImageErrors(prev => new Set(prev).add(etudiant.id));
                                      }}
                                    />
                                  ) : (
                                    <div
                                      className="w-[60px] h-20 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xl border-3 border-blue-300 shadow-sm cursor-pointer hover:border-blue-500 transition-all"
                                      onClick={() => {
                                        setSelectedStudent(etudiant);
                                        setShowCropModal(true);
                                      }}
                                    >
                                      {initials}
                                    </div>
                                  );
                                })()}
                              </td>

                              <td className="px-4 py-3 text-sm text-gray-900">{etudiant.student_name}</td>

                              {/* Statut étudiant */}
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                    etudiant.student_status === 'abandonne'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {etudiant.student_status === 'abandonne' ? (
                                    <>
                                      <ShieldX className="h-3 w-3" />
                                      Abandonné
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="h-3 w-3" />
                                      Valide
                                    </>
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-sm text-blue-600 font-medium">{etudiant.formation_title || '-'}</td>

                              {/* Prix Formation */}
                              <td className="px-4 py-3 text-sm">
                                {etudiant.formation_original_price && parseFloat(etudiant.formation_original_price.toString()) > 0 ? (
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {parseFloat(etudiant.formation_original_price.toString()).toFixed(2)} DH
                                    </div>
                                    {etudiant.discount_percentage && parseFloat(etudiant.discount_percentage.toString()) > 0 && (
                                      <div className="text-xs text-green-600 mt-0.5">
                                        Après remise: {parseFloat(etudiant.montant_total?.toString() || '0').toFixed(2)} DH
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="font-semibold text-indigo-600">
                                    {parseFloat(etudiant.montant_total?.toString() || '0').toFixed(2)} DH
                                  </div>
                                )}
                              </td>

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

                              {/* Reste à Payer */}
                              <td className="px-4 py-3">
                                <span
                                  className={`text-sm font-semibold ${
                                    parseFloat(etudiant.montant_du?.toString() || '0') === 0
                                      ? 'text-green-600'
                                      : parseFloat(etudiant.montant_du?.toString() || '0') === parseFloat(etudiant.montant_total?.toString() || '0')
                                      ? 'text-red-600'
                                      : 'text-orange-600'
                                  }`}
                                >
                                  {parseFloat(etudiant.montant_du?.toString() || '0').toFixed(2)} DH
                                </span>
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
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setDocumentSubmenuOpen(null);
                                      }}
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
                                          setSelectedStudent(etudiant);
                                          setShowPaymentModal(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Receipt className="h-4 w-4" />
                                        Paiements
                                      </button>

                                      {/* Documents submenu */}
                                      <div className="relative">
                                        <button
                                          onClick={() => loadAvailableDocuments(etudiant.student_id)}
                                          onMouseEnter={() => loadAvailableDocuments(etudiant.student_id)}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                                        >
                                          <div className="flex items-center gap-2">
                                            <FileDown className="h-4 w-4" />
                                            Documents
                                          </div>
                                          {loadingDocuments === etudiant.student_id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </button>

                                        {/* Documents submenu panel */}
                                        {documentSubmenuOpen === etudiant.student_id && availableDocuments[etudiant.student_id] && (
                                          <div className="absolute left-full top-0 ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30">
                                            {availableDocuments[etudiant.student_id].length === 0 ? (
                                              <div className="px-4 py-3 text-sm text-gray-500 italic">
                                                Aucun document disponible pour cette formation
                                              </div>
                                            ) : (
                                              <>
                                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                                                  Documents disponibles
                                                </div>
                                                {availableDocuments[etudiant.student_id].map((template: any) => (
                                                  <button
                                                    key={template.template_id}
                                                    onClick={() => handleGenerateDocument(etudiant, template)}
                                                    disabled={generatingDocument === `${etudiant.student_id}-${template.template_id}` || etudiant.student_status === 'abandonne'}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                                                  >
                                                    <div className="flex flex-col">
                                                      <span className="font-medium">{template.template_name}</span>
                                                      <span className="text-xs text-gray-500">{template.document_type}</span>
                                                    </div>
                                                    {generatingDocument === `${etudiant.student_id}-${template.template_id}` ? (
                                                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                                    ) : (
                                                      <FileDown className="h-4 w-4 text-blue-600" />
                                                    )}
                                                  </button>
                                                ))}
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>

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

                    {/* Barre d'action flottante pour sélection multiple */}
                    {selectedStudents.size > 0 && (
                      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 flex items-center gap-4 z-50">
                        <div className="text-sm font-medium text-gray-700">
                          {selectedStudents.size} étudiant(s) sélectionné(s)
                        </div>
                        <div className="h-6 w-px bg-gray-300" />
                        <button
                          onClick={() => handleBulkStatusChange('valide')}
                          disabled={isChangingStatus}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Valider
                        </button>
                        <button
                          onClick={() => handleBulkStatusChange('abandonne')}
                          disabled={isChangingStatus}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShieldX className="h-4 w-4" />
                          Abandonner
                        </button>
                        <div className="h-6 w-px bg-gray-300" />
                        <button
                          onClick={loadBulkTemplates}
                          disabled={isChangingStatus || generatingBulkDocuments}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FileDown className="h-4 w-4" />
                          Générer Documents
                        </button>
                        <button
                          onClick={() => setSelectedStudents(new Set())}
                          className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
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

      {/* Image Cropper Modal */}
      {showCropModal && selectedStudent && (
        <ImageCropperModal
          student={selectedStudent}
          onClose={() => {
            setShowCropModal(false);
            setSelectedStudent(null);
          }}
          onSuccess={() => {
            refetch();
            setShowCropModal(false);
            setSelectedStudent(null);
            setImageErrors(new Set()); // Reset image errors after successful upload
          }}
        />
      )}

      {/* Payment Manager Modal */}
      {showPaymentModal && selectedStudent && session && (
        <PaymentManagerModal
          student={selectedStudent}
          sessionId={session.id}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedStudent(null);
          }}
          onSuccess={() => {
            refetch();
            setShowPaymentModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* Modal de génération de documents en masse */}
      {showBulkDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Générer Documents en Masse
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedStudents.size} étudiant(s) sélectionné(s) - Choisissez le type de document
              </p>
            </div>

            {generatingBulkDocuments ? (
              <div className="p-6">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-900">
                    Génération en cours...
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {bulkGenerationProgress.templateName}
                  </p>
                  <div className="mt-4 bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${(bulkGenerationProgress.current / bulkGenerationProgress.total) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {bulkGenerationProgress.current} / {bulkGenerationProgress.total} étudiants
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                {bulkTemplates.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Aucun template disponible
                  </p>
                ) : (
                  bulkTemplates.map((template: any) => (
                    <button
                      key={template.template_id}
                      onClick={() => handleBulkDocumentGeneration(template)}
                      className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {template.template_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {template.document_type}
                          </p>
                        </div>
                        <FileDown className="h-5 w-5 text-blue-600" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowBulkDocumentModal(false)}
                disabled={generatingBulkDocuments}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
