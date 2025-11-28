import { useState, useRef, useEffect, ReactNode } from 'react';

interface ResizablePanesProps {
  leftPane: ReactNode;
  rightPane: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export function ResizablePanes({
  leftPane,
  rightPane,
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  minRightWidth = 20
}: ResizablePanesProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Enforce minimum widths
      if (newLeftWidth >= minLeftWidth && newLeftWidth <= (100 - minRightWidth)) {
        setLeftWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minLeftWidth, minRightWidth]);

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div 
        style={{ width: `${leftWidth}%` }}
        className="overflow-hidden"
      >
        {leftPane}
      </div>
      
      <div
        className="w-1 bg-border cursor-col-resize hover:bg-primary transition-colors duration-200 flex-shrink-0"
        onMouseDown={() => setIsDragging(true)}
        data-testid="resizer-handle"
      />
      
      <div 
        style={{ width: `${100 - leftWidth}%` }}
        className="overflow-hidden"
      >
        {rightPane}
      </div>
    </div>
  );
}
