import React, { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface DraggableCodeLinesProps {
  lines: string[];
  onChange: (reorderedLines: string[]) => void;
  readOnly?: boolean;
}

export const DraggableCodeLines: React.FC<DraggableCodeLinesProps> = ({
  lines,
  onChange,
  readOnly = false
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveLine = (index: number, direction: 'UP' | 'DOWN') => {
    if (readOnly) return;
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= lines.length) return;

    const newLines = [...lines];
    const temp = newLines[index];
    newLines[index] = newLines[targetIdx];
    newLines[targetIdx] = temp;
    onChange(newLines);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (readOnly) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    if (readOnly || draggedIndex === null) return;
    e.preventDefault();

    if (draggedIndex !== dropIndex) {
      const updated = [...lines];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, movedItem);
      onChange(updated);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2 select-none">
      <div className="text-xs font-semibold text-slate-500 mb-2">
        Arrange the code lines in the correct sequential order (drag and drop or use up/down arrows):
      </div>
      {lines.map((line, index) => {
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index && !isDragging;

        return (
          <div
            key={index}
            draggable={!readOnly}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between p-3 bg-white rounded-lg border transition-all font-mono text-sm ${
              isDragging
                ? 'opacity-40 border-dashed border-blue-500 bg-blue-50/50'
                : isDragOver
                ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-2 ring-blue-200'
                : 'border-slate-200 shadow-2xs hover:border-slate-400'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className={`text-slate-400 hover:text-slate-600 shrink-0 ${
                  readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                }`}
              >
                <GripVertical className="w-5 h-5" />
              </div>
              <span className="text-xs font-sans text-slate-400 select-none w-5 shrink-0 font-semibold">
                {index + 1}.
              </span>
              <span className="text-slate-800 font-medium whitespace-pre-wrap break-all">{line}</span>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveLine(index, 'UP')}
                  className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Move Up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === lines.length - 1}
                  onClick={() => moveLine(index, 'DOWN')}
                  className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Move Down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
