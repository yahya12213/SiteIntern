import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Download, FileText, Eye, Save, Link, ExternalLink, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAdminDeclaration,
  useApproveDeclaration,
  useRejectDeclaration,
  useRequestModification,
  useDeleteAdminDeclaration,
} from '@/hooks/useAdminDeclarations';
import { useUpdateDeclaration } from '@/hooks/useProfessorDeclarations';
import { calculateAllValues } from '@/lib/formula/dependency';
import type { FieldDefinition, FormulaContext } from '@/lib/formula/types';
import FilePreviewModal from '@/components/admin/FilePreviewModal';

const DeclarationViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: declaration, isLoading } = useAdminDeclaration(id!);
  const approveDeclaration = useApproveDeclaration();
  const rejectDeclaration = useRejectDeclaration();
  const requestModification = useRequestModification();
  const updateDeclaration = useUpdateDeclaration();
  const deleteDeclaration = useDeleteAdminDeclaration();

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [values, setValues] = useState<FormulaContext>({});
  const [calculatedValues, setCalculatedValues] = useState<FormulaContext>({});
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // États pour le modal de prévisualisation des fichiers
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<any[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Charger les données de la déclaration
  useEffect(() => {
    if (declaration?.template_data) {
      try {
        const template = JSON.parse(declaration.template_data);
        if (template.fields && template.fields.length > 0) {
          setFields(template.fields);
        }
        if (template.canvasSize) {
          setCanvasSize(template.canvasSize);
        }
      } catch (error) {
        console.error('Error parsing template:', error);
      }
    }

    if (declaration?.form_data) {
      try {
        const data = JSON.parse(declaration.form_data);
        setValues(data);
      } catch (error) {
        console.error('Error parsing form data:', error);
      }
    }
  }, [declaration]);

  // Recalculer les valeurs à chaque changement
  useEffect(() => {
    const newCalculated = calculateAllValues(fields, values);
    setCalculatedValues(newCalculated);
  }, [values, fields]);

  const handleValueChange = (ref: string, value: string) => {
    const field = fields.find((f) => f.ref === ref);
    if (!field) return;

    let parsedValue: number | string = value;

    if (field.type === 'number') {
      parsedValue = value === '' ? 0 : parseFloat(value) || 0;
    }

    setValues((prev) => ({
      ...prev,
      [ref]: parsedValue,
    }));
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      await updateDeclaration.mutateAsync({
        id,
        form_data: values,
      });

      setSaveMessage('Modifications sauvegardées avec succès!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving declaration:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleApprove = async () => {
    if (confirm('Voulez-vous vraiment approuver cette déclaration ?')) {
      try {
        await approveDeclaration.mutateAsync(id!);
        navigate('/admin/declarations');
      } catch (error) {
        console.error('Error approving declaration:', error);
        alert('Erreur lors de l\'approbation');
      }
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Veuillez fournir un motif de refus');
      return;
    }

    try {
      await rejectDeclaration.mutateAsync({ id: id!, reason: rejectionReason });
      navigate('/admin/declarations');
    } catch (error) {
      console.error('Error rejecting declaration:', error);
      alert('Erreur lors du refus');
    }
  };

  const handleRequestModification = async () => {
    if (!rejectionReason.trim()) {
      alert('Veuillez fournir un motif de demande de modification');
      return;
    }

    try {
      await requestModification.mutateAsync({ id: id!, reason: rejectionReason });
      navigate('/admin/declarations');
    } catch (error) {
      console.error('Error requesting modification:', error);
      alert('Erreur lors de la demande de modification');
    }
  };

  const handleDelete = async () => {
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer cette déclaration de ${declaration?.professor_name} ?\n\nCette action est irréversible.`;

    if (confirm(confirmMessage)) {
      try {
        await deleteDeclaration.mutateAsync(id!);
        navigate('/admin/declarations');
      } catch (error) {
        console.error('Error deleting declaration:', error);
        alert('Erreur lors de la suppression de la déclaration');
      }
    }
  };

  const renderField = (field: FieldDefinition) => {
    const layout = field.layout || { x: 0, y: 0, w: 200, h: 40 };
    const isAdminOnly = field.visibility?.hidden === true;

    // Helper pour les classes des champs admin uniquement
    const getAdminOnlyClasses = (baseClasses: string) => {
      if (isAdminOnly) {
        return `${baseClasses} ring-2 ring-red-400 ring-offset-2`;
      }
      return baseClasses;
    };

    // Badge "Admin uniquement"
    const AdminOnlyBadge = () => {
      if (!isAdminOnly) return null;
      return (
        <div className="absolute -top-2 -right-2 z-10 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg">
          ADMIN
        </div>
      );
    };

    if (field.type === 'label') {
      return (
        <div
          key={field.id}
          className="absolute"
          style={{
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.w}px`,
            height: `${layout.h}px`,
          }}
        >
          <div className={getAdminOnlyClasses("w-full h-full bg-gray-100 border-2 border-gray-300 rounded px-3 py-2 flex items-center font-semibold text-gray-700")}>
            {field.props.label}
          </div>
          <AdminOnlyBadge />
        </div>
      );
    }

    if (field.type === 'text') {
      const currentValue = values[field.ref!];
      const stringValue = typeof currentValue === 'string' || typeof currentValue === 'number' ? String(currentValue) : '';

      return (
        <div
          key={field.id}
          className="absolute"
          style={{
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.w}px`,
            height: `${layout.h}px`,
          }}
        >
          <input
            type="text"
            value={stringValue}
            onChange={(e) => handleValueChange(field.ref!, e.target.value)}
            className={getAdminOnlyClasses("w-full h-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent")}
          />
          <AdminOnlyBadge />
        </div>
      );
    }

    if (field.type === 'textarea') {
      const currentValue = values[field.ref!];
      const stringValue = typeof currentValue === 'string' || typeof currentValue === 'number' ? String(currentValue) : '';

      return (
        <div
          key={field.id}
          className="absolute"
          style={{
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.w}px`,
            height: `${layout.h}px`,
          }}
        >
          <textarea
            value={stringValue}
            onChange={(e) => handleValueChange(field.ref!, e.target.value)}
            placeholder={field.props.label || 'Écrivez vos commentaires ici...'}
            className={getAdminOnlyClasses("w-full h-full px-3 py-2 border-2 border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none")}
          />
          <AdminOnlyBadge />
        </div>
      );
    }

    if (field.type === 'number') {
      const currentValue = values[field.ref!] !== undefined ? values[field.ref!] : field.props.default || 0;
      const numberValue = typeof currentValue === 'number' || typeof currentValue === 'string' ? currentValue : '';

      return (
        <div
          key={field.id}
          className="absolute"
          style={{
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.w}px`,
            height: `${layout.h}px`,
          }}
        >
          <input
            type="number"
            step="0.01"
            value={numberValue}
            onChange={(e) => handleValueChange(field.ref!, e.target.value)}
            className={getAdminOnlyClasses("w-full h-full px-3 py-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent")}
          />
          <AdminOnlyBadge />
        </div>
      );
    }

    if (field.type === 'formula') {
      const value = calculatedValues[field.ref!];
      const isError = typeof value === 'string' && value.startsWith('#');

      return (
        <div
          key={field.id}
          className="absolute flex items-center"
          style={{
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.w}px`,
            height: `${layout.h}px`,
          }}
        >
          <div
            className={getAdminOnlyClasses(`w-full h-full px-3 py-2 border-2 rounded font-semibold flex items-center ${
              isError
                ? 'bg-red-50 border-red-400 text-red-700'
                : 'bg-purple-50 border-purple-400 text-purple-900'
            }`)}
          >
            {typeof value === 'number' ? value.toFixed(field.props.decimals || 2) : String(value || '0')}
          </div>
          <AdminOnlyBadge />
        </div>
      );
    }

    if (field.type === 'frame') {
      return (
        <div
          key={field.id}
          className="absolute"
          style={{
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.w}px`,
            height: `${layout.h}px`,
          }}
        >
          <div className={getAdminOnlyClasses("w-full h-full border-2 border-orange-400 rounded-lg bg-orange-50/30")}>
            <div className="bg-orange-500 text-white px-3 py-1 rounded-t font-semibold text-sm">
              {field.props.label || 'Cadre'}
            </div>
          </div>
          <AdminOnlyBadge />
        </div>
      );
    }

    if (field.type === 'file') {
      const fileData = values[field.ref!];
      const hasFiles = fileData && Array.isArray(fileData) && fileData.length > 0;

      // Fonction pour formater la taille du fichier
      const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      };

      // Fonction pour télécharger un fichier
      const downloadFile = (file: any) => {
        try {
          const base64Data = file.data.split(',')[1];
          const mimeType = file.data.split(',')[0].split(':')[1].split(';')[0];
          const byteString = atob(base64Data);
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([arrayBuffer], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Erreur lors du téléchargement:', error);
          alert('Erreur lors du téléchargement du fichier');
        }
      };

      // Fonction pour ouvrir la prévisualisation
      const openPreview = (index: number) => {
        setPreviewFiles(fileData as any);
        setCurrentFileIndex(index);
        setShowFilePreview(true);
      };

      return (
        <div
          key={field.id}
          className="absolute"
          style={{
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.w}px`,
            height: `${layout.h}px`,
          }}
        >
          <div className={getAdminOnlyClasses("w-full h-full border-2 border-dashed border-teal-300 bg-teal-50/50 rounded px-3 py-2 overflow-y-auto")}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-medium text-teal-700">
                {field.props.label || 'Pièces jointes'} ({hasFiles ? fileData.length : 0})
              </span>
            </div>
            {hasFiles ? (
              <div className="space-y-2">
                {fileData.map((file: any, index: number) => {
                  const isImage = file.type.startsWith('image/');
                  const Icon = isImage ? ImageIcon : FileText;

                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-white rounded border border-teal-200 hover:border-teal-400 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-teal-900 truncate">
                          {file.name}
                        </div>
                        <div className="text-xs text-teal-600">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openPreview(index)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-1.5 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <FileText className="w-8 h-8 text-teal-300 mx-auto mb-2" />
                <span className="text-xs text-teal-500 italic">
                  Aucune pièce jointe
                </span>
              </div>
            )}
          </div>
          <AdminOnlyBadge />
        </div>
      );
    }

    if (field.type === 'link') {
      const url = (values[field.ref!] as string) || '';
      const hasValidUrl = url && url.trim() !== '' && (url.startsWith('http://') || url.startsWith('https://'));

      return (
        <div
          key={field.id}
          className="absolute"
          style={{
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.w}px`,
            height: `${layout.h}px`,
          }}
        >
          <div className={getAdminOnlyClasses("w-full h-full border-2 border-cyan-400 bg-cyan-50 rounded px-3 py-2 flex items-center gap-2")}>
            <Link className="w-5 h-5 text-cyan-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-cyan-700 mb-1">
                {field.props.label || 'Lien'}
              </div>
              {hasValidUrl ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cyan-900 hover:text-cyan-700 underline truncate block"
                >
                  {url}
                </a>
              ) : (
                <span className="text-sm text-gray-400 italic">Aucun lien fourni</span>
              )}
            </div>
            {hasValidUrl && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors flex-shrink-0"
                title="Ouvrir le lien"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <AdminOnlyBadge />
        </div>
      );
    }

    return null;
  };

  const statusConfig = {
    brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
    soumise: { label: 'Soumise', color: 'bg-blue-100 text-blue-800' },
    en_cours: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
    approuvee: { label: 'Approuvée', color: 'bg-green-100 text-green-800' },
    refusee: { label: 'Refusée', color: 'bg-red-100 text-red-800' },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!declaration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Déclaration introuvable</p>
          <Button onClick={() => navigate('/admin/declarations')} className="mt-4">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/declarations')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Retour à la liste"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{declaration.sheet_title}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    (statusConfig as any)[declaration.status].color
                  }`}
                >
                  {(statusConfig as any)[declaration.status].label}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Mode Admin
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {declaration.professor_name} • {declaration.segment_name} • {declaration.city_name} • Du{' '}
                {new Date(declaration.start_date).toLocaleDateString('fr-FR')} au{' '}
                {new Date(declaration.end_date).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Message de sauvegarde */}
            {saveMessage && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium">{saveMessage}</span>
              </div>
            )}

            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>

            <Button
              variant="outline"
              onClick={handleSave}
              disabled={updateDeclaration.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>

            {declaration.status === 'soumise' && (
              <>
                <Button
                  variant="outline"
                  className="text-green-600 hover:bg-green-50"
                  onClick={handleApprove}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approuver
                </Button>
                <Button
                  variant="outline"
                  className="text-yellow-600 hover:bg-yellow-50"
                  onClick={() => setShowModificationModal(true)}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Demander modification
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setShowRejectModal(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rejection reason */}
      {declaration.rejection_reason && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {declaration.status === 'refusee' ? 'Déclaration refusée' : 'Modifications demandées'}
              </p>
              <p className="text-sm text-red-700 mt-1">{declaration.rejection_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-auto">
          <div
            className="relative bg-white"
            style={{
              width: `${canvasSize.width}px`,
              minHeight: `${canvasSize.height}px`,
            }}
          >
            {fields.map((field) => renderField(field))}
          </div>
        </div>
      </div>

      {/* Modal Refus */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Refuser la déclaration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez fournir un motif de refus pour la déclaration de{' '}
                <strong>{declaration.professor_name}</strong>
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
      {showModificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Demander une modification</h2>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez préciser les modifications à apporter pour la déclaration de{' '}
                <strong>{declaration.professor_name}</strong>
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

      {/* Modal de prévisualisation des fichiers */}
      {showFilePreview && previewFiles.length > 0 && (
        <FilePreviewModal
          files={previewFiles}
          currentIndex={currentFileIndex}
          onClose={() => setShowFilePreview(false)}
          onNavigate={(index: number) => setCurrentFileIndex(index)}
        />
      )}
    </div>
  );
};

export default DeclarationViewer;
