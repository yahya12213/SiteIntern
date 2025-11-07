import React, { useRef, useState, useEffect } from 'react';
import { Grid3x3 } from 'lucide-react';
import type { TemplateElement } from '@/types/certificateTemplate';

interface CanvasEditorProps {
  elements: TemplateElement[];
  selectedId: string | null;
  backgroundImage: string | null;
  canvasSize: { width: number; height: number };
  showGrid: boolean;
  onElementMove: (id: string, x: number, y: number) => void;
  onElementResize: (id: string, w: number, h: number) => void;
  onElementSelect: (id: string | null) => void;
  onElementDrop: (type: string, x: number, y: number, data: any) => void;
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
  backgroundImage,
  canvasSize,
  showGrid,
  onElementMove,
  onElementResize,
  onElementSelect,
  onElementDrop,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Gérer le déplacement d'un élément existant
  const handleMouseDown = (e: React.MouseEvent, element: TemplateElement) => {
    e.stopPropagation();

    onElementSelect(element.id);

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
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
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
    const x = typeof element.x === 'number' ? element.x : 0;
    const y = typeof element.y === 'number' ? element.y : 0;

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      cursor: dragging?.id === element.id ? 'grabbing' : 'grab',
      border: isSelected ? '2px solid #3B82F6' : '1px dashed rgba(0,0,0,0.2)',
      boxShadow: isSelected ? '0 0 0 1px rgba(59, 130, 246, 0.3)' : 'none',
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
        <div
          key={element.id}
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
        <div
          key={element.id}
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

  return (
    <div className="h-full flex flex-col bg-gray-100">
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
