import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, X, Grid3x3, Eye, Plus, FileText } from 'lucide-react';
import { useCertificateTemplate, useUpdateTemplate, useCreateTemplate } from '@/hooks/useCertificateTemplates';
import type { CertificateTemplate, TemplateElement, TemplatePage } from '@/types/certificateTemplate';
import { getTemplatePages, createNewPage, generatePageId } from '@/types/certificateTemplate';
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
    // Nouveau format multi-pages
    pages: [
      {
        id: generatePageId(),
        name: 'Recto',
        elements: [],
      },
    ],
    // Garder elements vide pour rétrocompatibilité
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

  // États pour le support multi-pages (recto-verso)
  const [pages, setPages] = useState<TemplatePage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

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

      // Extraire les pages (avec migration automatique si nécessaire)
      const extractedPages = getTemplatePages(newTemplate.template_config, {
        url: newTemplate.background_image_url,
        type: newTemplate.background_image_type,
      });
      setPages(extractedPages);
      setCurrentPageIndex(0);
      setElements(extractedPages[0]?.elements || []);
    } else if (existingTemplate) {
      setTemplate(existingTemplate);

      // Extraire les pages (avec migration automatique si nécessaire)
      const extractedPages = getTemplatePages(existingTemplate.template_config, {
        url: existingTemplate.background_image_url,
        type: existingTemplate.background_image_type,
      });
      setPages(extractedPages);
      setCurrentPageIndex(0);
      setElements(extractedPages[0]?.elements || []);

      // Mettre à jour nextElementId - chercher dans toutes les pages
      const allElements = extractedPages.flatMap(page => page.elements);
      if (allElements.length > 0) {
        const maxId = Math.max(
          ...allElements.map((el) => {
            const match = el.id.match(/element-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
        );
        setNextElementId(maxId + 1);
      }
    }
  }, [existingTemplate, isNewTemplate, folderId, configName, configFormat, configOrientation, configMargins, configCustomWidth, configCustomHeight]);

  // Référence pour éviter la synchronisation lors du changement de page
  const isChangingPageRef = React.useRef(false);
  const previousPageIndexRef = React.useRef(currentPageIndex);

  // Synchroniser les éléments avec la page actuelle quand on modifie les éléments
  // MAIS PAS pendant un changement de page (pour éviter la race condition)
  useEffect(() => {
    // Ne pas synchroniser si on est en train de changer de page
    if (isChangingPageRef.current) {
      return;
    }

    if (pages.length > 0 && currentPageIndex < pages.length) {
      setPages(prevPages => {
        const newPages = [...prevPages];
        newPages[currentPageIndex] = {
          ...newPages[currentPageIndex],
          elements: elements,
        };
        return newPages;
      });
    }
  }, [elements]);

  // Charger les éléments de la page actuelle quand on change de page
  useEffect(() => {
    if (pages.length > 0 && currentPageIndex < pages.length) {
      // Vérifier si l'index de page a réellement changé
      if (previousPageIndexRef.current !== currentPageIndex) {
        // Marquer qu'on change de page pour éviter la synchronisation inverse
        isChangingPageRef.current = true;

        // Charger les éléments de la nouvelle page
        setElements(pages[currentPageIndex].elements);
        setSelectedId(null);

        // Mettre à jour la référence
        previousPageIndexRef.current = currentPageIndex;

        // Réactiver la synchronisation après un court délai
        setTimeout(() => {
          isChangingPageRef.current = false;
        }, 50);
      }
    }
  }, [currentPageIndex, pages]);

  // Gestion des pages
  const handleAddPage = () => {
    const pageName = pages.length === 1 ? 'Verso' : `Page ${pages.length + 1}`;
    const newPage = createNewPage(pageName);

    // D'abord sauvegarder les éléments de la page actuelle dans pages
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...updatedPages[currentPageIndex],
      elements: elements,
    };

    // Ajouter la nouvelle page vide
    updatedPages.push(newPage);

    // Marquer qu'on change de page
    isChangingPageRef.current = true;

    // Mettre à jour les pages et changer de page
    setPages(updatedPages);
    setElements([]); // La nouvelle page est vide
    setCurrentPageIndex(updatedPages.length - 1);
    previousPageIndexRef.current = updatedPages.length - 1;

    // Réactiver la synchronisation
    setTimeout(() => {
      isChangingPageRef.current = false;
    }, 50);
  };

  const handlePageSelect = (index: number) => {
    if (index >= 0 && index < pages.length && index !== currentPageIndex) {
      // D'abord sauvegarder les éléments de la page actuelle
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        elements: elements,
      };

      // Marquer qu'on change de page
      isChangingPageRef.current = true;

      // Mettre à jour les pages et charger les éléments de la nouvelle page
      setPages(updatedPages);
      setElements(updatedPages[index].elements);
      setCurrentPageIndex(index);
      setSelectedId(null);
      previousPageIndexRef.current = index;

      // Réactiver la synchronisation
      setTimeout(() => {
        isChangingPageRef.current = false;
      }, 50);
    }
  };

  const handlePageRename = (index: number, newName: string) => {
    if (index >= 0 && index < pages.length && newName.trim()) {
      const newPages = [...pages];
      newPages[index] = {
        ...newPages[index],
        name: newName.trim(),
      };
      setPages(newPages);
    }
  };

  const handlePageDelete = (index: number) => {
    if (pages.length <= 1) {
      alert('Vous devez avoir au moins une page dans le template.');
      return;
    }

    if (confirm(`Supprimer la page "${pages[index].name}" ?`)) {
      const newPages = pages.filter((_, i) => i !== index);
      setPages(newPages);

      // Ajuster currentPageIndex si nécessaire
      if (currentPageIndex >= newPages.length) {
        setCurrentPageIndex(newPages.length - 1);
      } else if (currentPageIndex === index && index > 0) {
        setCurrentPageIndex(index - 1);
      }
    }
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!template) return;

    setIsSaving(true);
    try {
      // IMPORTANT: Synchroniser les éléments de la page actuelle avant de sauvegarder
      // Car les éléments en cours d'édition sont dans `elements`, pas encore dans `pages`
      const finalPages = [...pages];
      finalPages[currentPageIndex] = {
        ...finalPages[currentPageIndex],
        elements: elements,
      };

      // Sauvegarder le template avec le nouveau format multi-pages
      const updatedTemplate = {
        ...template,
        template_config: {
          ...template.template_config,
          pages: finalPages, // Utiliser finalPages avec les éléments synchronisés
          elements: finalPages[0]?.elements || [], // Garder elements pour rétrocompatibilité
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
        width: 150,
        height: 30,
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

  // Wrapper for canvas toolbar - duplicate with element parameter
  const handleCanvasDuplicate = (element: TemplateElement) => {
    const id = `element-${nextElementId}`;
    setNextElementId(nextElementId + 1);

    const duplicatedElement: TemplateElement = {
      ...element,
      id,
      x: typeof element.x === 'number' ? element.x + 20 : element.x,
      y: typeof element.y === 'number' ? element.y + 20 : element.y,
    };

    setElements([...elements, duplicatedElement]);
    setSelectedId(id);
  };

  // Wrapper for canvas toolbar - delete with ID parameter
  const handleCanvasDelete = (elementId: string) => {
    setElements(elements.filter((el) => el.id !== elementId));
    setSelectedId(null);
  };

  // Gérer drag start depuis palette
  const handlePaletteDragStart = (type: string, data: any) => {
    const dragData = { type, ...data };
    // On stocke en global pour le récupérer dans handleDrop
    (window as any).__dragData = dragData;
  };

  // Gérer la mise à jour du background de la page actuelle
  const handlePageBackgroundUpdate = (updatedTemplate: CertificateTemplate) => {
    // Extraire le background_image_url et background_image_type du template
    const newBackgroundUrl = updatedTemplate.background_image_url;
    const newBackgroundType = updatedTemplate.background_image_type;

    // Mettre à jour la page actuelle avec le nouveau background
    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages[currentPageIndex] = {
        ...newPages[currentPageIndex],
        background_image_url: newBackgroundUrl,
        background_image_type: newBackgroundType,
      };
      return newPages;
    });

    // Mettre à jour aussi le template (pour garder la cohérence)
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

  // Template modifié pour le BackgroundImageManager (avec le background de la page actuelle)
  const templateForBackgroundManager = template ? {
    ...template,
    background_image_url: pages[currentPageIndex]?.background_image_url || template.background_image_url,
    background_image_type: pages[currentPageIndex]?.background_image_type || template.background_image_type,
  } : null;

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
        <div className="flex-1 flex flex-col">
          {/* Navigation des pages */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    currentPageIndex === index
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <input
                    type="text"
                    value={page.name}
                    onChange={(e) => handlePageRename(index, e.target.value)}
                    onClick={() => handlePageSelect(index)}
                    className={`bg-transparent border-none outline-none w-20 ${
                      currentPageIndex === index ? 'text-blue-700' : 'text-gray-700'
                    }`}
                  />
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePageDelete(index);
                      }}
                      className="ml-1 hover:bg-red-100 hover:text-red-600 rounded p-0.5 transition-colors"
                      title="Supprimer cette page"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Bouton Ajouter une page */}
              <button
                onClick={handleAddPage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200"
                title="Ajouter une nouvelle page"
              >
                <Plus className="h-4 w-4" />
                Ajouter page
              </button>

              {/* Indicateur page actuelle */}
              <div className="ml-auto text-xs text-gray-500 px-2">
                Page {currentPageIndex + 1} / {pages.length}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1">
            <CanvasEditor
            elements={elements}
            selectedId={selectedId}
            backgroundImage={pages[currentPageIndex]?.background_image_url || template.background_image_url || null}
            canvasSize={canvasSize}
            showGrid={showGrid && !template.background_image_url}
            onElementMove={handleElementMove}
            onElementResize={handleElementResize}
            onElementSelect={(id) => {
              setSelectedId(id);
              if (id !== null) {
                setActiveTab('elements');
              }
            }}
            onElementDrop={(type, x, y) => {
              const data = (window as any).__dragData || {};
              handleElementDrop(type, x, y, data);
              delete (window as any).__dragData;
            }}
            onElementUpdate={handleElementChange}
            onElementDuplicate={handleCanvasDuplicate}
            onElementDelete={handleCanvasDelete}
          />
          </div>
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
            {activeTab === 'background' && templateForBackgroundManager && (
              <BackgroundImageManager
                template={templateForBackgroundManager}
                onUpdate={handlePageBackgroundUpdate}
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
