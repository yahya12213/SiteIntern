import React from 'react';
import { Type, Minus, Square, Circle, Edit2, Copy, Trash2, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import type { TemplateElement } from '@/types/certificateTemplate';

interface ElementListProps {
  elements: TemplateElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const getElementIcon = (type: TemplateElement['type']) => {
  switch (type) {
    case 'text':
      return <Type className="h-4 w-4" />;
    case 'line':
      return <Minus className="h-4 w-4" />;
    case 'rectangle':
    case 'border':
      return <Square className="h-4 w-4" />;
    case 'circle':
      return <Circle className="h-4 w-4" />;
    case 'image':
      return <ImageIcon className="h-4 w-4" />;
    default:
      return <Square className="h-4 w-4" />;
  }
};

const getElementLabel = (element: TemplateElement) => {
  if (element.type === 'text' && element.content) {
    const preview = element.content.substring(0, 30);
    return `${preview}${element.content.length > 30 ? '...' : ''}`;
  }
  return element.id;
};

export const ElementList: React.FC<ElementListProps> = ({
  elements,
  selectedId,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm">
          Éléments du Template ({elements.length})
        </h3>
      </div>

      {/* Elements List */}
      <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
        {elements.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            Aucun élément. Ajoutez un élément pour commencer.
          </div>
        ) : (
          elements.map((element, index) => (
            <div
              key={element.id}
              className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                selectedId === element.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
              onClick={() => onSelect(element.id)}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Element Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <div className={`flex-shrink-0 ${selectedId === element.id ? 'text-blue-600' : 'text-gray-400'}`}>
                    {getElementIcon(element.type)}
                  </div>

                  {/* Label and Type */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedId === element.id ? 'text-blue-900' : 'text-gray-900'}`}>
                      {getElementLabel(element)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Type: {element.type}
                      {element.condition && ` • Condition: ${element.condition}`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Move Up */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveUp(element.id);
                    }}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Déplacer vers le haut"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>

                  {/* Move Down */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveDown(element.id);
                    }}
                    disabled={index === elements.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Déplacer vers le bas"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Edit (selecting does this) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(element.id);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Éditer"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(element.id);
                    }}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    title="Dupliquer"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Supprimer l'élément "${getElementLabel(element)}" ?`)) {
                        onDelete(element.id);
                      }
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
