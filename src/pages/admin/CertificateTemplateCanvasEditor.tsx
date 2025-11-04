import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, X, Grid3x3, Eye } from 'lucide-react';
import { useCertificateTemplate, useUpdateTemplate, useCreateTemplate } from '@/hooks/useCertificateTemplates';
import type { CertificateTemplate, TemplateElement } from '@/types/certificateTemplate';
import { ElementPalette } from '@/components/admin/templates/ElementPalette';
import { CanvasEditor } from '@/components/admin/templates/CanvasEditor';
import { ElementPropertiesPanel } from '@/components/admin/templates/ElementPropertiesPanel';
import { BackgroundImageManager } from '@/components/admin/templates/BackgroundImageManager';
import { CustomFontManager } from '@/components/admin/templates/CustomFontManager';
import { TemplatePreviewModal } from '@/components/admin/templates/TemplatePreviewModal';
import { getCanvasDimensions, FORMAT_LABELS } from '@/lib/utils/canvasDimensions';

const createDefaultTemplate = (folderId?: string): Omit<CertificateTemplate, 'id' | 'created_at' | 'updated_at'> => ({
  name: 'Nouveau Template Canvas',
  description: '',
  folder_id: folderId || '',
  template_config: {
    layout: {
      orientation: 'landscape',
      format: 'a4',
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
    },
    colors: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      text: '#1f2937',
      background: '#ffffff',
    },
    fonts: {
      title: { family: 'times', size: 28, style: 'bold' },
      subtitle: { family: 'times', size: 18, style: 'normal' },
      body: { family: 'helvetica', size: 12, style: 'normal' },
      studentName: { family: 'times', size: 24, style: 'bold' },
    },
    elements: [],
  },
});

export const CertificateTemplateCanvasEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const isNewTemplate = id === 'new';

  // Extract config parameters from URL
  const configName = searchParams.get('name');
  const configFormat = searchParams.get('format');
  const configOrientation = searchParams.get('orientation');
  const configMargins = searchParams.get('margins');
  const configCustomWidth = searchParams.get('customWidth');
  const configCustomHeight = searchParams.get('customHeight');

  const { data: existingTemplate, isLoading } = useCertificateTemplate(isNewTemplate ? null : (id || ''));
  const updateTemplate = useUpdateTemplate();
  const createTemplate = useCreateTemplate();

  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextElementId, setNextElementId] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'elements' | 'background' | 'fonts'>('elements');
  const [showPreview, setShowPreview] = useState(false);

  // Calculer les dimensions du canvas dynamiquement en fonction du format et de l'orientation
  const canvasSize = useMemo(() => {
    if (!template) return { width: 1122, height: 794 }; // Fallback A4 landscape
    const { format, orientation, customWidth, customHeight } = template.template_config.layout;
    return getCanvasDimensions(format, orientation, customWidth, customHeight);
  }, [
    template?.template_config.layout.format,
    template?.template_config.layout.orientation,
    template?.template_config.layout.customWidth,
    template?.template_config.layout.customHeight,
  ]);

  // Charger le template existant
  useEffect(() => {
    if (isNewTemplate) {
      const defaultTemplate = createDefaultTemplate(folderId || undefined);

      // Apply config parameters from URL
      const margins = configMargins ? parseInt(configMargins) : 10;
      const newTemplate: CertificateTemplate = {
        ...defaultTemplate,
        id: 'new',
        name: configName || 'Nouveau Template Canvas',
        template_config: {
          ...defaultTemplate.template_config,
          layout: {
            ...defaultTemplate.template_config.layout,
            format: (configFormat?.toLowerCase() || 'a4') as any,
            orientation: (configOrientation || 'landscape') as 'portrait' | 'landscape',
            margins: { top: margins, right: margins, bottom: margins, left: margins },
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Apply custom dimensions if Custom format
      if (configFormat?.toLowerCase() === 'custom' && configCustomWidth && configCustomHeight) {
        newTemplate.template_config.layout.customWidth = parseInt(configCustomWidth);
        newTemplate.template_config.layout.customHeight = parseInt(configCustomHeight);
      }

      setTemplate(newTemplate);
      setElements([]);
    } else if (existingTemplate) {
      setTemplate(existingTemplate);
      setElements(existingTemplate.template_config.elements || []);

      // Mettre à jour nextElementId
      if (existingTemplate.template_config.elements.length > 0) {
        const maxId = Math.max(
          ...existingTemplate.template_config.elements.map((el) => {
            const match = el.id.match(/element-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
        );
        setNextElementId(maxId + 1);
      }
    }
  }, [existingTemplate, isNewTemplate, folderId, configName, configFormat, configOrientation, configMargins, configCustomWidth, configCustomHeight]);

  // Sauvegarder
  const handleSave = async () => {
    if (!template) return;

    setIsSaving(true);
    try {
      const updatedTemplate = {
        ...template,
        template_config: {
          ...template.template_config,
          elements,
        },
      };

      if (isNewTemplate) {
        const { id, created_at, updated_at, ...createData } = updatedTemplate;
        await createTemplate.mutateAsync(createData);
      } else {
        const { id, created_at, updated_at, ...updateData } = updatedTemplate;
        await updateTemplate.mutateAsync({ id: template.id, data: updateData });
      }

      navigate('/admin/certificate-templates');
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert('Erreur lors de la sauvegarde: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  // Annuler
  const handleCancel = () => {
    if (confirm('Annuler les modifications ?')) {
      navigate('/admin/certificate-templates');
    }
  };

  // Drop d'un nouvel élément depuis la palette
  const handleElementDrop = (type: string, x: number, y: number, data: any) => {
    const id = `element-${nextElementId}`;
    setNextElementId(nextElementId + 1);

    let newElement: TemplateElement = {
      id,
      type: type as any,
      x,
      y,
      color: '#000000',
    };

    // Propriétés spécifiques selon le type
    if (type === 'text') {
      newElement = {
        ...newElement,
        content: data.variable || data.content || 'Nouveau texte',
        fontSize: 14,
        fontFamily: 'helvetica',
        fontStyle: 'normal',
        align: 'left',
      };
    } else if (type === 'image') {
      newElement = {
        ...newElement,
        source: data.source || '',
        width: 100,
        height: 100,
      };
    } else if (type === 'rectangle' || type === 'border') {
      newElement = {
        ...newElement,
        width: 150,
        height: 80,
        lineWidth: 1,
      };
    } else if (type === 'circle') {
      newElement = {
        ...newElement,
        radius: 30,
        lineWidth: 1,
      };
    } else if (type === 'line') {
      newElement = {
        ...newElement,
        x1: x,
        y1: y,
        x2: x + 100,
        y2: y,
        lineWidth: 1,
      };
      delete newElement.x;
      delete newElement.y;
    }

    setElements([...elements, newElement]);
    setSelectedId(id);
  };

  // Déplacer un élément
  const handleElementMove = (id: string, x: number, y: number) => {
    setElements(
      elements.map((el) =>
        el.id === id
          ? { ...el, x, y }
          : el
      )
    );
  };

  // Redimensionner un élément
  const handleElementResize = (id: string, w: number, h: number) => {
    setElements(
      elements.map((el) =>
        el.id === id
          ? { ...el, width: w, height: h }
          : el
      )
    );
  };

  // Modifier un élément
  const handleElementChange = (updatedElement: TemplateElement) => {
    setElements(
      elements.map((el) =>
        el.id === updatedElement.id ? updatedElement : el
      )
    );
  };

  // Supprimer un élément
  const handleElementDelete = () => {
    if (!selectedId) return;
    if (confirm('Supprimer cet élément ?')) {
      setElements(elements.filter((el) => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  // Dupliquer un élément
  const handleElementDuplicate = () => {
    if (!selectedId) return;

    const elementToDuplicate = elements.find((el) => el.id === selectedId);
    if (!elementToDuplicate) return;

    const id = `element-${nextElementId}`;
    setNextElementId(nextElementId + 1);

    const duplicatedElement: TemplateElement = {
      ...elementToDuplicate,
      id,
      x: typeof elementToDuplicate.x === 'number' ? elementToDuplicate.x + 20 : elementToDuplicate.x,
      y: typeof elementToDuplicate.y === 'number' ? elementToDuplicate.y + 20 : elementToDuplicate.y,
    };

    setElements([...elements, duplicatedElement]);
    setSelectedId(id);
  };

  // Gérer drag start depuis palette
  const handlePaletteDragStart = (type: string, data: any) => {
    const dragData = { type, ...data };
    // On stocke en global pour le récupérer dans handleDrop
    (window as any).__dragData = dragData;
  };

  // Rafraîchir les données du template
  const handleTemplateUpdate = (updatedTemplate: CertificateTemplate) => {
    setTemplate(updatedTemplate);
  };

  // Changer le format du canvas
  const handleFormatChange = (newFormat: 'a4' | 'letter' | 'badge') => {
    if (!template) return;
    setTemplate({
      ...template,
      template_config: {
        ...template.template_config,
        layout: {
          ...template.template_config.layout,
          format: newFormat,
        },
      },
    });
  };

  // Changer l'orientation du canvas
  const handleOrientationChange = (newOrientation: 'portrait' | 'landscape') => {
    if (!template) return;
    setTemplate({
      ...template,
      template_config: {
        ...template.template_config,
        layout: {
          ...template.template_config.layout,
          orientation: newOrientation,
        },
      },
    });
  };

  if (isLoading || !template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du template...</p>
        </div>
      </div>
    );
  }

  const selectedElement = selectedId ? elements.find((el) => el.id === selectedId) || null : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/certificate-templates')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Retour"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  className="text-xl font-bold text-gray-900 border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                />
                <p className="text-sm text-gray-500">Éditeur Canvas Drag-and-Drop</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sélecteur de format */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 font-medium">Format:</label>
                <select
                  value={template.template_config.layout.format}
                  onChange={(e) => handleFormatChange(e.target.value as 'a4' | 'letter' | 'badge')}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="a4">{FORMAT_LABELS.a4} (297×210mm)</option>
                  <option value="letter">{FORMAT_LABELS.letter} (279×216mm)</option>
                  <option value="badge">{FORMAT_LABELS.badge} (86×54mm)</option>
                </select>
              </div>

              {/* Sélecteur d'orientation */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 font-medium">Orientation:</label>
                <select
                  value={template.template_config.layout.orientation}
                  onChange={(e) => handleOrientationChange(e.target.value as 'portrait' | 'landscape')}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="landscape">Paysage</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              {/* Dimension du canvas (affichage info) */}
              <div className="px-3 py-2 text-xs bg-gray-50 text-gray-600 rounded-lg border border-gray-200">
                {canvasSize.width} × {canvasSize.height} px
              </div>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                  showGrid
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Afficher/Masquer la grille"
              >
                <Grid3x3 className="h-4 w-4" />
                Grille
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                title="Prévisualiser le certificat"
              >
                <Eye className="h-4 w-4" />
                Visualiser
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 3 colonnes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Colonne gauche - Palette */}
        <div className="w-64 flex-shrink-0">
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
              <button
                onClick={() => setActiveTab('elements')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'elements'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Éléments
              </button>
            </div>

            {/* Content */}
            {activeTab === 'elements' && (
              <ElementPalette onDragStart={handlePaletteDragStart} />
            )}
          </div>
        </div>

        {/* Colonne centrale - Canvas */}
        <div className="flex-1">
          <CanvasEditor
            elements={elements}
            selectedId={selectedId}
            backgroundImage={template.background_image_url || null}
            canvasSize={canvasSize}
            showGrid={showGrid && !template.background_image_url}
            onElementMove={handleElementMove}
            onElementResize={handleElementResize}
            onElementSelect={setSelectedId}
            onElementDrop={(type, x, y) => {
              const data = (window as any).__dragData || {};
              handleElementDrop(type, x, y, data);
              delete (window as any).__dragData;
            }}
          />
        </div>

        {/* Colonne droite - Propriétés */}
        <div className="w-80 flex-shrink-0">
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
              <button
                onClick={() => setActiveTab('elements')}
                className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'elements'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Propriétés
              </button>
              <button
                onClick={() => setActiveTab('background')}
                className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'background'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Arrière-plan
              </button>
              <button
                onClick={() => setActiveTab('fonts')}
                className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'fonts'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Polices
              </button>
            </div>

            {/* Content */}
            {activeTab === 'elements' && (
              <ElementPropertiesPanel
                element={selectedElement}
                customFonts={[]}
                onChange={handleElementChange}
                onDelete={handleElementDelete}
                onDuplicate={handleElementDuplicate}
              />
            )}
            {activeTab === 'background' && template && (
              <BackgroundImageManager
                template={template}
                onUpdate={handleTemplateUpdate}
              />
            )}
            {activeTab === 'fonts' && (
              <CustomFontManager />
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {template && (
        <TemplatePreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          template={template}
        />
      )}
    </div>
  );
};
