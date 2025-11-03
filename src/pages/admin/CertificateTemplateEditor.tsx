import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { useCertificateTemplate, useUpdateTemplate, useCreateTemplate } from '@/hooks/useCertificateTemplates';
import type { CertificateTemplate, TemplateElement } from '@/types/certificateTemplate';
import { ColorPicker } from '@/components/admin/templates/ColorPicker';
import { FontEditor } from '@/components/admin/templates/FontEditor';
import { TemplatePreview } from '@/components/admin/templates/TemplatePreview';
import { ElementList } from '@/components/admin/templates/ElementList';
import { ElementEditor } from '@/components/admin/templates/ElementEditor';

type Tab = 'general' | 'colors' | 'fonts' | 'elements';

const DEFAULT_TEMPLATE: Omit<CertificateTemplate, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Nouveau Template',
  description: '',
  folder_id: '',
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
};

export const CertificateTemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewTemplate = id === 'new';

  const { data: existingTemplate, isLoading } = useCertificateTemplate(isNewTemplate ? null : (id || ''));
  const updateTemplate = useUpdateTemplate();
  const createTemplate = useCreateTemplate();

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isNewTemplate) {
      setTemplate({
        ...DEFAULT_TEMPLATE,
        id: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as CertificateTemplate);
    } else if (existingTemplate) {
      setTemplate(existingTemplate);
    }
  }, [existingTemplate, isNewTemplate]);

  const handleSave = async () => {
    if (!template) return;

    setIsSaving(true);
    try {
      if (isNewTemplate) {
        const { id, created_at, updated_at, ...createData } = template;
        await createTemplate.mutateAsync(createData);
      } else {
        const { id, created_at, updated_at, ...updateData } = template;
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

  const handleCancel = () => {
    if (confirm('Annuler les modifications ?')) {
      navigate('/admin/certificate-templates');
    }
  };

  const handleAddElement = (type: TemplateElement['type']) => {
    if (!template) return;

    const newElement: TemplateElement = {
      id: `element-${Date.now()}`,
      type,
      x: type === 'line' ? undefined : 10,
      y: type === 'line' ? undefined : 10,
      color: '#000000',
      ...(type === 'text' && { content: 'Nouveau texte', fontSize: 12, align: 'left' }),
      ...(type === 'line' && { x1: 10, y1: 10, x2: 100, y2: 10 }),
      ...(type === 'rectangle' && { width: '100', height: '50' }),
      ...(type === 'border' && { width: 'pageWidth - 20', height: 'pageHeight - 20' }),
      ...(type === 'circle' && { radius: 20 }),
    };

    setTemplate({
      ...template,
      template_config: {
        ...template.template_config,
        elements: [...template.template_config.elements, newElement],
      },
    });

    setSelectedElementId(newElement.id);
  };

  const handleElementChange = (updatedElement: TemplateElement) => {
    if (!template) return;

    setTemplate({
      ...template,
      template_config: {
        ...template.template_config,
        elements: template.template_config.elements.map((el: TemplateElement) =>
          el.id === updatedElement.id ? updatedElement : el
        ),
      },
    });
  };

  const handleDeleteElement = (elementId: string) => {
    if (!template) return;

    setTemplate({
      ...template,
      template_config: {
        ...template.template_config,
        elements: template.template_config.elements.filter((el: TemplateElement) => el.id !== elementId),
      },
    });

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const handleDuplicateElement = (elementId: string) => {
    if (!template) return;

    const elementToDuplicate = template.template_config.elements.find((el: TemplateElement) => el.id === elementId);
    if (!elementToDuplicate) return;

    const duplicatedElement: TemplateElement = {
      ...elementToDuplicate,
      id: `element-${Date.now()}`,
      x: elementToDuplicate.x !== undefined ? (typeof elementToDuplicate.x === 'number' ? elementToDuplicate.x + 10 : elementToDuplicate.x) : undefined,
      y: elementToDuplicate.y !== undefined ? (typeof elementToDuplicate.y === 'number' ? elementToDuplicate.y + 10 : elementToDuplicate.y) : undefined,
    };

    setTemplate({
      ...template,
      template_config: {
        ...template.template_config,
        elements: [...template.template_config.elements, duplicatedElement],
      },
    });
  };

  const handleMoveElementUp = (elementId: string) => {
    if (!template) return;

    const index = template.template_config.elements.findIndex((el: TemplateElement) => el.id === elementId);
    if (index <= 0) return;

    const newElements = [...template.template_config.elements];
    [newElements[index - 1], newElements[index]] = [newElements[index], newElements[index - 1]];

    setTemplate({
      ...template,
      template_config: {
        ...template.template_config,
        elements: newElements,
      },
    });
  };

  const handleMoveElementDown = (elementId: string) => {
    if (!template) return;

    const index = template.template_config.elements.findIndex((el: TemplateElement) => el.id === elementId);
    if (index < 0 || index >= template.template_config.elements.length - 1) return;

    const newElements = [...template.template_config.elements];
    [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];

    setTemplate({
      ...template,
      template_config: {
        ...template.template_config,
        elements: newElements,
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

  const selectedElement = selectedElementId
    ? template.template_config.elements.find((el: TemplateElement) => el.id === selectedElementId) || null
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
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
                <h1 className="text-xl font-bold text-gray-900">
                  {isNewTemplate ? 'Nouveau Template' : template.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {isNewTemplate ? 'Créer un nouveau template de certificat' : 'Modifier le template'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Editor */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {(['general', 'colors', 'fonts', 'elements'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab === 'general' && 'Général'}
                    {tab === 'colors' && 'Couleurs'}
                    {tab === 'fonts' && 'Polices'}
                    {tab === 'elements' && 'Éléments'}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-6">
                {/* General Tab */}
                {activeTab === 'general' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom du template</label>
                      <input
                        type="text"
                        value={template.name}
                        onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Certificat Premium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={template.description || ''}
                        onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Description du template..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
                        <select
                          value={template.template_config.layout.orientation}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              template_config: {
                                ...template.template_config,
                                layout: { ...template.template_config.layout, orientation: e.target.value as 'portrait' | 'landscape' },
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Paysage</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                        <select
                          value={template.template_config.layout.format}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              template_config: {
                                ...template.template_config,
                                layout: { ...template.template_config.layout, format: e.target.value as 'a4' | 'letter' },
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="a4">A4</option>
                          <option value="letter">Letter</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Colors Tab */}
                {activeTab === 'colors' && (
                  <>
                    <ColorPicker
                      label="Couleur principale"
                      value={template.template_config.colors.primary}
                      onChange={(color) =>
                        setTemplate({
                          ...template,
                          template_config: {
                            ...template.template_config,
                            colors: { ...template.template_config.colors, primary: color },
                          },
                        })
                      }
                      description="Utilisée pour les titres et éléments importants"
                    />

                    <ColorPicker
                      label="Couleur secondaire"
                      value={template.template_config.colors.secondary}
                      onChange={(color) =>
                        setTemplate({
                          ...template,
                          template_config: {
                            ...template.template_config,
                            colors: { ...template.template_config.colors, secondary: color },
                          },
                        })
                      }
                      description="Utilisée pour les accents et bordures"
                    />

                    <ColorPicker
                      label="Couleur du texte"
                      value={template.template_config.colors.text}
                      onChange={(color) =>
                        setTemplate({
                          ...template,
                          template_config: {
                            ...template.template_config,
                            colors: { ...template.template_config.colors, text: color },
                          },
                        })
                      }
                      description="Couleur par défaut du texte"
                    />

                    <ColorPicker
                      label="Couleur de fond"
                      value={template.template_config.colors.background}
                      onChange={(color) =>
                        setTemplate({
                          ...template,
                          template_config: {
                            ...template.template_config,
                            colors: { ...template.template_config.colors, background: color },
                          },
                        })
                      }
                      description="Couleur de fond du certificat"
                    />
                  </>
                )}

                {/* Fonts Tab */}
                {activeTab === 'fonts' && (
                  <>
                    <FontEditor
                      label="Police du titre principal"
                      font={template.template_config.fonts.title}
                      onChange={(font) =>
                        setTemplate({
                          ...template,
                          template_config: {
                            ...template.template_config,
                            fonts: { ...template.template_config.fonts, title: font },
                          },
                        })
                      }
                      showColor
                    />

                    <FontEditor
                      label="Police du sous-titre"
                      font={template.template_config.fonts.subtitle}
                      onChange={(font) =>
                        setTemplate({
                          ...template,
                          template_config: {
                            ...template.template_config,
                            fonts: { ...template.template_config.fonts, subtitle: font },
                          },
                        })
                      }
                      showColor
                    />

                    <FontEditor
                      label="Police du corps de texte"
                      font={template.template_config.fonts.body}
                      onChange={(font) =>
                        setTemplate({
                          ...template,
                          template_config: {
                            ...template.template_config,
                            fonts: { ...template.template_config.fonts, body: font },
                          },
                        })
                      }
                      showColor
                    />

                    <FontEditor
                      label="Police du nom de l'étudiant"
                      font={template.template_config.fonts.studentName}
                      onChange={(font) =>
                        setTemplate({
                          ...template,
                          template_config: {
                            ...template.template_config,
                            fonts: { ...template.template_config.fonts, studentName: font },
                          },
                        })
                      }
                      showColor
                    />
                  </>
                )}

                {/* Elements Tab */}
                {activeTab === 'elements' && (
                  <>
                    {/* Add Element Buttons */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Ajouter un élément</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleAddElement('text')}
                          className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Texte
                        </button>
                        <button
                          onClick={() => handleAddElement('line')}
                          className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Ligne
                        </button>
                        <button
                          onClick={() => handleAddElement('rectangle')}
                          className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Rectangle
                        </button>
                        <button
                          onClick={() => handleAddElement('border')}
                          className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Bordure
                        </button>
                        <button
                          onClick={() => handleAddElement('circle')}
                          className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Cercle
                        </button>
                      </div>
                    </div>

                    {/* Element List */}
                    <ElementList
                      elements={template.template_config.elements}
                      selectedId={selectedElementId}
                      onSelect={setSelectedElementId}
                      onDelete={handleDeleteElement}
                      onDuplicate={handleDuplicateElement}
                      onMoveUp={handleMoveElementUp}
                      onMoveDown={handleMoveElementDown}
                    />

                    {/* Element Editor */}
                    <ElementEditor element={selectedElement} onChange={handleElementChange} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <TemplatePreview template={template} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
