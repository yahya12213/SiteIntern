import React, { useRef, useState, useEffect } from 'react';
import {
  Grid3x3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Minus,
  Plus,
  Copy,
  Trash2,
  Bold,
  Italic,
  Palette
} from 'lucide-react';
import type { TemplateElement } from '@/types/certificateTemplate';
import { FONT_FAMILIES } from '@/types/certificateTemplate';

interface CanvasEditorProps {
  elements: TemplateElement[];
  selectedId: string | null;
  selectedIds: string[]; // Multi-selection support
  backgroundImage: string | null;
  canvasSize: { width: number; height: number };
  showGrid: boolean;
  onElementMove: (id: string, x: number, y: number) => void;
  onElementResize: (id: string, w: number, h: number) => void;
  onElementSelect: (id: string | null, addToSelection?: boolean) => void;
  onElementDrop: (type: string, x: number, y: number, data: any) => void;
  onElementUpdate?: (element: TemplateElement) => void;
  onElementDuplicate?: (element: TemplateElement) => void;
  onElementDelete?: (elementId: string) => void;
  onAlignElements?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onAlignMultipleElements?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
}

interface DraggingState {
  id: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ResizingState {
  id: string;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  elements,
  selectedId,
  selectedIds,
  backgroundImage,
  canvasSize,
  showGrid,
  onElementMove,
  onElementResize,
  onElementSelect,
  onElementDrop,
  onElementUpdate,
  onElementDuplicate,
  onElementDelete,
  onAlignElements,
  onAlignMultipleElements,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Gérer le déplacement d'un élément existant
  const handleMouseDown = (e: React.MouseEvent, element: TemplateElement) => {
    e.stopPropagation();

    // Support multi-selection with Ctrl/Cmd key
    const addToSelection = e.ctrlKey || e.metaKey;
    onElementSelect(element.id, addToSelection);

    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return; // Ne pas déplacer si on clique sur le handle de resize
    }

    const elementX = typeof element.x === 'number' ? element.x : 0;
    const elementY = typeof element.y === 'number' ? element.y : 0;

    setDragging({
      id: element.id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - elementX,
      offsetY: e.clientY - elementY,
    });
  };

  // Gérer le resize d'un élément
  const handleResizeMouseDown = (e: React.MouseEvent, element: TemplateElement) => {
    e.stopPropagation();
    onElementSelect(element.id);

    const width = typeof element.width === 'number' ? element.width : 100;
    const height = typeof element.height === 'number' ? element.height : 50;

    setResizing({
      id: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startW: width,
      startH: height,
    });
  };

  // Gérer le drag-and-drop depuis la palette
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const jsonData = e.dataTransfer.getData('application/json');

      // Vérifier que les données ne sont pas vides avant de parser
      if (!jsonData || jsonData.trim() === '') {
        console.warn('Drop data is empty - ignoring drop event');
        return;
      }

      const data = JSON.parse(jsonData);
      onElementDrop(data.type, x, y, data);
    } catch (error) {
      console.error('Error parsing drop data:', error);
    }
  };

  // Gérer le mouvement global de la souris
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(canvasSize.width, e.clientX - rect.left));
        const newY = Math.max(0, Math.min(canvasSize.height, e.clientY - rect.top));

        onElementMove(dragging.id, newX, newY);
      }

      if (resizing) {
        const deltaX = e.clientX - resizing.startX;
        const deltaY = e.clientY - resizing.startY;

        const newW = Math.max(10, resizing.startW + deltaX);
        const newH = Math.max(10, resizing.startH + deltaY);

        onElementResize(resizing.id, newW, newH);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setResizing(null);
    };

    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, canvasSize, onElementMove, onElementResize]);

  // Render d'un élément selon son type
  const renderElement = (element: TemplateElement) => {
    const isSelected = element.id === selectedId;
    const isInMultiSelection = selectedIds.includes(element.id);
    const isHighlighted = isSelected || isInMultiSelection;
    const x = typeof element.x === 'number' ? element.x : 0;
    const y = typeof element.y === 'number' ? element.y : 0;

    // Different border colors: blue for primary selection, green for multi-selection
    const borderColor = isSelected ? '#3B82F6' : isInMultiSelection ? '#10B981' : 'rgba(0,0,0,0.2)';
    const borderStyle = isHighlighted ? 'solid' : 'dashed';

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      cursor: dragging?.id === element.id ? 'grabbing' : 'grab',
      border: `2px ${borderStyle} ${borderColor}`,
      boxShadow: isHighlighted ? `0 0 0 1px ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` : 'none',
    };

    // Texte
    if (element.type === 'text') {
      const width = typeof element.width === 'number' ? element.width : 150;
      const height = typeof element.height === 'number' ? element.height : 30;

      return (
        <div key={element.id}>
          <div
            style={{
              ...baseStyle,
              width: `${width}px`,
              height: `${height}px`,
              padding: '4px 8px',
              fontSize: `${element.fontSize || 12}px`,
              fontFamily: element.fontFamily || 'helvetica',
              fontWeight: element.fontStyle?.includes('bold') ? 'bold' : 'normal',
              fontStyle: element.fontStyle?.includes('italic') ? 'italic' : 'normal',
              color: element.color || '#000000',
              textAlign: (element.align as any) || 'left',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflow: 'hidden',
              backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
            }}
            onMouseDown={(e) => handleMouseDown(e, element)}
          >
            {element.content || 'Texte vide'}
          </div>
          {/* Quick action toolbar for text elements - positioned outside canvas to not obscure other elements */}
          {isSelected && (
            <div
              className="resize-handle"
              style={{
                position: 'absolute',
                left: `${x + width - 8}px`,
                top: `${y + height - 8}px`,
                width: '16px',
                height: '16px',
                backgroundColor: '#3B82F6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'se-resize',
                zIndex: 1000,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, element)}
            />
          )}
        </div>
      );
    }

    // Rectangle
    if (element.type === 'rectangle' || element.type === 'border') {
      const width = typeof element.width === 'number' ? element.width : 100;
      const height = typeof element.height === 'number' ? element.height : 50;

      return (
        <div key={element.id}>
          <div
            style={{
              ...baseStyle,
              width: `${width}px`,
              height: `${height}px`,
              border: `${element.lineWidth || 1}px solid ${element.color || '#000000'}`,
              backgroundColor: element.fillColor || 'transparent',
            }}
            onMouseDown={(e) => handleMouseDown(e, element)}
          />
          {isSelected && (
            <div
              className="resize-handle"
              style={{
                position: 'absolute',
                left: `${x + width - 8}px`,
                top: `${y + height - 8}px`,
                width: '16px',
                height: '16px',
                backgroundColor: '#3B82F6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'se-resize',
                zIndex: 1000,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, element)}
            />
          )}
        </div>
      );
    }

    // Cercle
    if (element.type === 'circle') {
      const radius = element.radius || 20;

      return (
        <div key={element.id}>
          <div
            style={{
              ...baseStyle,
              width: `${radius * 2}px`,
              height: `${radius * 2}px`,
              borderRadius: '50%',
              border: `${element.lineWidth || 1}px solid ${element.color || '#000000'}`,
              backgroundColor: element.fillColor || 'transparent',
            }}
            onMouseDown={(e) => handleMouseDown(e, element)}
          />
        </div>
      );
    }

    // Ligne
    if (element.type === 'line') {
      const x1 = typeof element.x1 === 'number' ? element.x1 : 0;
      const y1 = typeof element.y1 === 'number' ? element.y1 : 0;
      const x2 = typeof element.x2 === 'number' ? element.x2 : 100;
      const y2 = typeof element.y2 === 'number' ? element.y2 : 0;

      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

      return (
        <div key={element.id}>
          <div
            style={{
              position: 'absolute',
              left: `${x1}px`,
              top: `${y1}px`,
              width: `${length}px`,
              height: `${element.lineWidth || 1}px`,
              backgroundColor: element.color || '#000000',
              transform: `rotate(${angle}deg)`,
              transformOrigin: '0 0',
              cursor: 'grab',
              border: isSelected ? '2px solid #3B82F6' : 'none',
            }}
            onMouseDown={(e) => handleMouseDown(e, element)}
          />
        </div>
      );
    }

    // Image
    if (element.type === 'image') {
      const width = typeof element.width === 'number' ? element.width : 100;
      const height = typeof element.height === 'number' ? element.height : 100;

      return (
        <div key={element.id}>
          <div
            style={{
              ...baseStyle,
              width: `${width}px`,
              height: `${height}px`,
              border: isSelected ? '2px solid #3B82F6' : '1px dashed rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.05)',
            }}
            onMouseDown={(e) => handleMouseDown(e, element)}
          >
            <span className="text-xs text-gray-400">
              {element.source ? element.source.substring(0, 20) + '...' : 'Image'}
            </span>
          </div>
          {isSelected && (
            <div
              className="resize-handle"
              style={{
                position: 'absolute',
                left: `${x + width - 8}px`,
                top: `${y + height - 8}px`,
                width: '16px',
                height: '16px',
                backgroundColor: '#3B82F6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'se-resize',
                zIndex: 1000,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, element)}
            />
          )}
        </div>
      );
    }

    return null;
  };

  // Get the selected element for the toolbar
  const selectedElement = selectedId ? elements.find(el => el.id === selectedId) : null;

  // Check if we have multiple elements selected
  const hasMultipleSelection = selectedIds.length > 1;

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Fixed Toolbar - above canvas, always visible when element is selected */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 min-h-[52px] flex-shrink-0">
        {/* Multi-selection toolbar */}
        {hasMultipleSelection ? (
          <>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              <span className="text-sm font-medium text-green-700">
                {selectedIds.length} éléments sélectionnés
              </span>
            </div>

            <div className="w-px h-6 bg-gray-300" />

            {/* Multi-element alignment tools */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Aligner entre eux:</span>
              <div className="flex items-center gap-0.5 bg-green-50 rounded-lg p-0.5 border border-green-200">
                <button
                  onClick={() => onAlignMultipleElements?.('left')}
                  className="p-1.5 rounded hover:bg-green-200 text-green-700"
                  title="Aligner les bords gauches"
                >
                  <AlignStartHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAlignMultipleElements?.('center')}
                  className="p-1.5 rounded hover:bg-green-200 text-green-700"
                  title="Centrer horizontalement"
                >
                  <AlignCenterHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAlignMultipleElements?.('right')}
                  className="p-1.5 rounded hover:bg-green-200 text-green-700"
                  title="Aligner les bords droits"
                >
                  <AlignEndHorizontal className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-0.5 bg-green-50 rounded-lg p-0.5 ml-1 border border-green-200">
                <button
                  onClick={() => onAlignMultipleElements?.('top')}
                  className="p-1.5 rounded hover:bg-green-200 text-green-700"
                  title="Aligner les bords supérieurs"
                >
                  <AlignStartVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAlignMultipleElements?.('middle')}
                  className="p-1.5 rounded hover:bg-green-200 text-green-700"
                  title="Centrer verticalement"
                >
                  <AlignCenterVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAlignMultipleElements?.('bottom')}
                  className="p-1.5 rounded hover:bg-green-200 text-green-700"
                  title="Aligner les bords inférieurs"
                >
                  <AlignEndVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="ml-auto text-xs text-gray-400">
              Maintenez Ctrl et cliquez pour sélectionner plusieurs éléments
            </div>
          </>
        ) : selectedElement ? (
          <>
            {/* Text formatting tools - only for text elements */}
            {selectedElement.type === 'text' && (
              <>
                {/* Text alignment */}
                <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5">
                  <button
                    onClick={() => onElementUpdate?.({ ...selectedElement, align: 'left' })}
                    className={`p-1.5 rounded hover:bg-gray-200 ${selectedElement.align === 'left' || !selectedElement.align ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                    title="Aligner à gauche"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onElementUpdate?.({ ...selectedElement, align: 'center' })}
                    className={`p-1.5 rounded hover:bg-gray-200 ${selectedElement.align === 'center' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                    title="Centrer le texte"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onElementUpdate?.({ ...selectedElement, align: 'right' })}
                    className={`p-1.5 rounded hover:bg-gray-200 ${selectedElement.align === 'right' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                    title="Aligner à droite"
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-300" />

                {/* Font family */}
                <select
                  value={selectedElement.fontFamily || 'helvetica'}
                  onChange={(e) => onElementUpdate?.({ ...selectedElement, fontFamily: e.target.value })}
                  className="text-xs bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Police"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font.charAt(0).toUpperCase() + font.slice(1)}
                    </option>
                  ))}
                </select>

                <div className="w-px h-6 bg-gray-300" />

                {/* Font style */}
                <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5">
                  <button
                    onClick={() => {
                      const currentStyle = selectedElement.fontStyle || 'normal';
                      const isBold = currentStyle.includes('bold');
                      const isItalic = currentStyle.includes('italic');
                      const newStyle: 'bold' | 'normal' | 'italic' | 'bolditalic' = isBold
                        ? isItalic ? 'italic' : 'normal'
                        : isItalic ? 'bolditalic' : 'bold';
                      onElementUpdate?.({ ...selectedElement, fontStyle: newStyle });
                    }}
                    className={`p-1.5 rounded hover:bg-gray-200 ${selectedElement.fontStyle?.includes('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                    title="Gras"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      const currentStyle = selectedElement.fontStyle || 'normal';
                      const isBold = currentStyle.includes('bold');
                      const isItalic = currentStyle.includes('italic');
                      const newStyle: 'bold' | 'normal' | 'italic' | 'bolditalic' = isItalic
                        ? isBold ? 'bold' : 'normal'
                        : isBold ? 'bolditalic' : 'italic';
                      onElementUpdate?.({ ...selectedElement, fontStyle: newStyle });
                    }}
                    className={`p-1.5 rounded hover:bg-gray-200 ${selectedElement.fontStyle?.includes('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                    title="Italique"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-300" />

                {/* Font size */}
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-1 py-0.5">
                  <button
                    onClick={() => onElementUpdate?.({ ...selectedElement, fontSize: Math.max(8, (selectedElement.fontSize || 12) - 2) })}
                    className="p-1 rounded hover:bg-gray-200 text-gray-600"
                    title="Réduire la taille"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-medium text-gray-700 min-w-[36px] text-center">
                    {selectedElement.fontSize || 12}px
                  </span>
                  <button
                    onClick={() => onElementUpdate?.({ ...selectedElement, fontSize: Math.min(200, (selectedElement.fontSize || 12) + 2) })}
                    className="p-1 rounded hover:bg-gray-200 text-gray-600"
                    title="Augmenter la taille"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-300" />

                {/* Color */}
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                  <Palette className="h-4 w-4 text-gray-500" />
                  <input
                    type="color"
                    title="Couleur du texte"
                    value={selectedElement.color || '#000000'}
                    onChange={(e) => onElementUpdate?.({ ...selectedElement, color: e.target.value })}
                    className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0"
                  />
                </div>

                <div className="w-px h-6 bg-gray-300" />
              </>
            )}

            {/* Canvas alignment tools - for ALL element types */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Aligner sur canvas:</span>
              <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5">
                <button
                  onClick={() => onAlignElements?.('left')}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  title="Aligner à gauche du canvas"
                >
                  <AlignStartHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAlignElements?.('center')}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  title="Centrer horizontalement"
                >
                  <AlignCenterHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAlignElements?.('right')}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  title="Aligner à droite du canvas"
                >
                  <AlignEndHorizontal className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5 ml-1">
                <button
                  onClick={() => onAlignElements?.('top')}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  title="Aligner en haut du canvas"
                >
                  <AlignStartVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAlignElements?.('middle')}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  title="Centrer verticalement"
                >
                  <AlignCenterVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAlignElements?.('bottom')}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  title="Aligner en bas du canvas"
                >
                  <AlignEndVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="w-px h-6 bg-gray-300" />

            {/* Duplicate and Delete */}
            <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5">
              <button
                onClick={() => onElementDuplicate?.(selectedElement)}
                className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                title="Dupliquer"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => onElementDelete?.(selectedElement.id)}
                className="p-1.5 rounded hover:bg-red-100 text-red-600"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Position info */}
            <div className="ml-auto text-xs text-gray-400">
              X: {Math.round(Number(selectedElement.x) || 0)} | Y: {Math.round(Number(selectedElement.y) || 0)}
              {selectedElement.width && ` | W: ${Math.round(Number(selectedElement.width))}`}
              {selectedElement.height && ` | H: ${Math.round(Number(selectedElement.height))}`}
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-400 italic">
            Sélectionnez un élément pour voir les options d'édition et d'alignement
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
        <div
          ref={canvasRef}
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            position: 'relative',
            backgroundColor: '#ffffff',
            backgroundImage: backgroundImage
              ? `url(${backgroundImage})`
              : showGrid
              ? 'repeating-linear-gradient(0deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent 20px)'
              : 'none',
            backgroundSize: backgroundImage ? 'cover' : '20px 20px',
            backgroundPosition: backgroundImage ? 'center' : '0 0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: dragOver ? '3px dashed #3B82F6' : '1px solid #d1d5db',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={(e) => {
            // Only deselect if clicking directly on canvas background, not on children
            if (e.target === e.currentTarget) {
              onElementSelect(null);
            }
          }}
        >
          {/* Message si vide */}
          {elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <Grid3x3 className="h-16 w-16 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Glissez-déposez des éléments ici</p>
              </div>
            </div>
          )}

          {/* Render tous les éléments */}
          {elements.map(renderElement)}
        </div>
      </div>
    </div>
  );
};
