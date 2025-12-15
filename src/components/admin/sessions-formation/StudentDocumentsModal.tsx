import React, { useState, useEffect } from 'react';
import { X, Download, Printer, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, tokenManager } from '@/lib/api/client';

interface Document {
  id: string;
  certificate_number: string;
  document_type: string;
  template_name: string | null;
  issued_at: string;
  file_path: string | null;
  archive_folder: string | null;
  grade: number | null;
  printed_at: string | null;
  printer_name: string | null;
  print_status: string;
  template_display_name: string | null;
  preview_image_url: string | null;
}

interface DocumentsResponse {
  success: boolean;
  documents: Document[];
  error?: string;
}

interface StudentDocumentsModalProps {
  sessionId: string;
  studentId: string;
  studentName: string;
  onClose: () => void;
}

export const StudentDocumentsModal: React.FC<StudentDocumentsModalProps> = ({
  sessionId,
  studentId,
  studentName,
  onClose,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [sessionId, studentId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<DocumentsResponse>(
        `/sessions-formation/${sessionId}/students/${studentId}/documents`
      );

      if (response.success) {
        setDocuments(response.documents || []);
      } else {
        setError(response.error || 'Erreur lors du chargement des documents');
      }
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      // Utiliser l'endpoint API pour télécharger le fichier
      const API_URL = import.meta.env.MODE === 'production' ? '/api' : (import.meta.env.VITE_API_URL || '/api');
      const token = tokenManager.getToken();

      const response = await fetch(
        `${API_URL}/certificates/${document.id}/download`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du téléchargement');
      }

      // Créer un lien de téléchargement
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;

      // Extraire le nom du fichier du header Content-Disposition si disponible
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `${document.document_type}_${document.certificate_number}.pdf`;

      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (matches && matches[1]) {
          fileName = matches[1];
        }
      }

      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      alert(error.message || 'Erreur lors du téléchargement du document');
    }
  };

  const handlePrint = async (document: Document) => {
    try {
      // Ouvrir le PDF dans un nouvel onglet pour visualisation et impression
      const API_URL = import.meta.env.MODE === 'production' ? '/api' : (import.meta.env.VITE_API_URL || '/api');
      const token = tokenManager.getToken();

      // Construire l'URL avec le token dans le header n'est pas possible pour window.open
      // On utilise donc fetch puis on crée un blob URL
      const response = await fetch(
        `${API_URL}/certificates/${document.id}/view`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du chargement du document');
      }

      // Créer un blob URL et l'ouvrir dans un nouvel onglet
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Ouvrir dans un nouvel onglet - le PDF s'affichera dans le viewer du navigateur
      const printWindow = window.open(url, '_blank');

      if (!printWindow) {
        // Si le popup est bloqué, informer l'utilisateur
        alert('Le popup a été bloqué par le navigateur. Veuillez autoriser les popups pour ce site puis réessayer.');
      }
      // Note: L'utilisateur pourra imprimer manuellement depuis le viewer PDF du navigateur (Ctrl+P)
    } catch (error: any) {
      console.error('Error printing document:', error);
      alert(error.message || 'Erreur lors de l\'ouverture du document');
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      certificat: 'Certificat',
      attestation: 'Attestation',
      badge: 'Badge',
      diplome: 'Diplôme',
    };
    return labels[type] || type;
  };

  const getDocumentTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      certificat: 'bg-blue-100 text-blue-800',
      attestation: 'bg-green-100 text-green-800',
      badge: 'bg-purple-100 text-purple-800',
      diplome: 'bg-amber-100 text-amber-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPrintStatusBadge = (status: string, printedAt: string | null) => {
    if (status === 'printed' && printedAt) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">Imprimé</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Clock className="h-4 w-4" />
        <span className="text-sm">Non imprimé</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Documents de {studentName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {documents.length} document{documents.length > 1 ? 's' : ''} généré{documents.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement des documents...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-red-600">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{error}</p>
                <Button onClick={loadDocuments} variant="outline" className="mt-4">
                  Réessayer
                </Button>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun document généré</p>
                <p className="text-sm mt-2">Aucun document n'a encore été généré pour cet étudiant.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Numéro</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Note</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Statut impression</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <Badge className={getDocumentTypeBadgeColor(doc.document_type)}>
                          {getDocumentTypeLabel(doc.document_type)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">{doc.certificate_number}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(doc.issued_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {doc.grade !== null ? `${doc.grade}%` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {getPrintStatusBadge(doc.print_status, doc.printed_at)}
                        {doc.printed_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(doc.printed_at)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {doc.file_path && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(doc)}
                                title="Télécharger"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrint(doc)}
                                title="Imprimer"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
