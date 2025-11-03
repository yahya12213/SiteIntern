import React from 'react';
import { Type } from 'lucide-react';
import type { TemplateFont } from '@/types/certificateTemplate';
import { FONT_FAMILIES, FONT_STYLES } from '@/types/certificateTemplate';
import { ColorPicker } from './ColorPicker';

interface FontEditorProps {
  label: string;
  font: TemplateFont;
  onChange: (font: TemplateFont) => void;
  showColor?: boolean;
}

export const FontEditor: React.FC<FontEditorProps> = ({ label, font, onChange, showColor = false }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <Type className="h-4 w-4 text-blue-600" />
        {label}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Font Family */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Police</label>
          <select
            value={font.family}
            onChange={(e) => onChange({ ...font, family: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {family.charAt(0).toUpperCase() + family.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Taille (pt)</label>
          <input
            type="number"
            min="6"
            max="100"
            value={font.size}
            onChange={(e) => onChange({ ...font, size: parseInt(e.target.value) || 12 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Font Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
          <select
            value={font.style}
            onChange={(e) => onChange({ ...font, style: e.target.value as TemplateFont['style'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {FONT_STYLES.map((style) => (
              <option key={style} value={style}>
                {style === 'normal' && 'Normal'}
                {style === 'bold' && 'Gras'}
                {style === 'italic' && 'Italique'}
                {style === 'bolditalic' && 'Gras Italique'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional Color */}
      {showColor && (
        <ColorPicker
          label="Couleur du texte"
          value={font.color || '#000000'}
          onChange={(color) => onChange({ ...font, color })}
          description="Couleur personnalisée pour cette police (optionnel)"
        />
      )}
    </div>
  );
};
