import React from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import type { TemplateElement } from '@/types/certificateTemplate';
import { ColorPicker } from './ColorPicker';

interface ElementEditorProps {
  element: TemplateElement | null;
  onChange: (element: TemplateElement) => void;
}

export const ElementEditor: React.FC<ElementEditorProps> = ({ element, onChange }) => {
  if (!element) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-400">
          <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sélectionnez un élément pour l'éditer</p>
        </div>
      </div>
    );
  }

  const handleFieldChange = (field: string, value: any) => {
    onChange({ ...element, [field]: value });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">
            Éditer: {element.id} ({element.type})
          </h3>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {/* Common Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID de l'élément</label>
          <input
            type="text"
            value={element.id}
            onChange={(e) => handleFieldChange('id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="element-id"
          />
        </div>

        {/* Type-specific fields */}
        {element.type === 'text' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenu du texte</label>
              <textarea
                value={element.content || ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Texte à afficher ou variable"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille de police</label>
                <input
                  type="number"
                  value={element.fontSize || 12}
                  onChange={(e) => handleFieldChange('fontSize', parseInt(e.target.value))}
                  min="6"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alignement</label>
                <select
                  value={element.align || 'left'}
                  onChange={(e) => handleFieldChange('align', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="left">Gauche</option>
                  <option value="center">Centre</option>
                  <option value="right">Droite</option>
                </select>
              </div>
            </div>
          </>
        )}

        {element.type === 'line' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">X1</label>
              <input
                type="text"
                value={element.x1 || 0}
                onChange={(e) => handleFieldChange('x1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Y1</label>
              <input
                type="text"
                value={element.y1 || 0}
                onChange={(e) => handleFieldChange('y1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">X2</label>
              <input
                type="text"
                value={element.x2 || 0}
                onChange={(e) => handleFieldChange('x2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Y2</label>
              <input
                type="text"
                value={element.y2 || 0}
                onChange={(e) => handleFieldChange('y2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {(element.type === 'rectangle' || element.type === 'border') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Largeur</label>
              <input
                type="text"
                value={element.width || ''}
                onChange={(e) => handleFieldChange('width', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hauteur</label>
              <input
                type="text"
                value={element.height || ''}
                onChange={(e) => handleFieldChange('height', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {element.type === 'circle' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rayon</label>
            <input
              type="number"
              value={element.radius || 10}
              onChange={(e) => handleFieldChange('radius', parseFloat(e.target.value))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}

        {/* Position Fields */}
        {element.type !== 'line' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position X</label>
              <input
                type="text"
                value={element.x || 0}
                onChange={(e) => handleFieldChange('x', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position Y</label>
              <input
                type="text"
                value={element.y || 0}
                onChange={(e) => handleFieldChange('y', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {/* Color Field */}
        <ColorPicker
          label="Couleur"
          value={element.color || '#000000'}
          onChange={(color) => handleFieldChange('color', color)}
        />

        {/* Condition Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition (optionnel)</label>
          <input
            type="text"
            value={element.condition || ''}
            onChange={(e) => handleFieldChange('condition', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Afficher seulement si cette donnée existe</p>
        </div>

        {/* Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Variables: {'{student_name}'}, {'{formation_title}'}, {'{grade}'}, etc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
