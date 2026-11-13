import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { CanvasElement, CanvasConnection, CanvasDocument, PresenceState } from '@/types/domain';

export interface ViewportState {
  pan: { x: number; y: number };
  zoom: number;
}

interface CanvasViewportProps {
  canvas: CanvasDocument;
  viewport: ViewportState;
  setViewport: (v: ViewportState) => void;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  tool: string;
  editingEnabled: boolean;
  presences: PresenceState[];
  onElementPointerDown: (id: string, e: React.PointerEvent) => void;
  onElementDoubleClick: (id: string) => void;
  onCanvasClick: () => void;
  onStartConnection: (fromId: string) => void;
  pendingConnectionFrom: string | null;
  onMoveElement: (id: string, x: number, y: number) => void;
  children?: ReactNode;
}

export default function CanvasViewport(props: CanvasViewportProps) {
  const {
    canvas,
    viewport,
    setViewport,
    selectedIds,
    onSelect,
    tool,
    editingEnabled,
    presences,
    onElementPointerDown,
    onElementDoubleClick,
    onCanvasClick,
    onStartConnection,
    pendingConnectionFrom,
    onMoveElement,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [dragInfo, setDragInfo] = useState<{
    id: string;
    startX: number;
    startY: number;
    elX: number;
    elY: number;
  } | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeStart = useRef({ x: 0, y: 0 });

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (sx - rect.left - viewport.pan.x) / viewport.zoom,
        y: (sy - rect.top - viewport.pan.y) / viewport.zoom,
      };
    },
    [viewport],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === 'pan' || (e.button === 1) || (e.button === 0 && tool === 'pan')) {
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: viewport.pan.x,
        panY: viewport.pan.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (tool === 'select' && e.button === 0) {
      const world = screenToWorld(e.clientX, e.clientY);
      marqueeStart.current = world;
      setMarquee({ x: world.x, y: world.y, w: 0, h: 0 });
    }

    onCanvasClick();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setViewport({
        pan: {
          x: panStart.current.panX + (e.clientX - panStart.current.x),
          y: panStart.current.panY + (e.clientY - panStart.current.y),
        },
        zoom: viewport.zoom,
      });
      return;
    }

    if (dragInfo) {
      const dx = (e.clientX - dragInfo.startX) / viewport.zoom;
      const dy = (e.clientY - dragInfo.startY) / viewport.zoom;
      onMoveElement(dragInfo.id, dragInfo.elX + dx, dragInfo.elY + dy);
      return;
    }

    if (marquee) {
      const world = screenToWorld(e.clientX, e.clientY);
      setMarquee({
        x: Math.min(marqueeStart.current.x, world.x),
        y: Math.min(marqueeStart.current.y, world.y),
        w: Math.abs(world.x - marqueeStart.current.x),
        h: Math.abs(world.y - marqueeStart.current.y),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (dragInfo) {
      setDragInfo(null);
      return;
    }

    if (marquee && marquee.w > 5 && marquee.h > 5) {
      const hits = canvas.elements.filter((el) => {
        return (
          el.x + el.width > marquee.x &&
          el.x < marquee.x + marquee.w &&
          el.y + el.height > marquee.y &&
          el.y < marquee.y + marquee.h
        );
      });
      onSelect(hits.map((h) => h.id));
    }
    setMarquee(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.1, Math.min(3, viewport.zoom * (1 + delta)));
      const scale = newZoom / viewport.zoom;
      setViewport({
        zoom: newZoom,
        pan: {
          x: mx - (mx - viewport.pan.x) * scale,
          y: my - (my - viewport.pan.y) * scale,
        },
      });
    } else {
      setViewport({
        pan: {
          x: viewport.pan.x - e.deltaX,
          y: viewport.pan.y - e.deltaY,
        },
        zoom: viewport.zoom,
      });
    }
  };

  const startElementDrag = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (!editingEnabled) return;
    if (tool === 'connect') {
      onStartConnection(id);
      return;
    }
    if (tool !== 'select') return;
    const el = canvas.elements.find((x) => x.id === id);
    if (!el) return;
    if (!selectedIds.includes(id)) {
      onSelect(e.shiftKey ? [...selectedIds, id] : [id]);
    }
    setDragInfo({
      id,
      startX: e.clientX,
      startY: e.clientY,
      elX: el.x,
      elY: el.y,
    });
    onElementPointerDown(id, e);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#f8f9fb] touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{ cursor: tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
          backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
        }}
      />

      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Connections */}
        <svg className="absolute overflow-visible" style={{ width: 1, height: 1 }}>
          {canvas.connections.map((conn) => {
            const from = canvas.elements.find((e) => e.id === conn.from_element_id);
            const to = canvas.elements.find((e) => e.id === conn.to_element_id);
            if (!from || !to) return null;
            return (
              <ConnectionRenderer
                key={conn.id}
                conn={conn}
                from={from}
                to={to}
                selected={selectedIds.includes(conn.id)}
              />
            );
          })}
        </svg>

        {/* Elements */}
        {canvas.elements.map((el) => (
          <ElementRenderer
            key={el.id}
            element={el}
            selected={selectedIds.includes(el.id)}
            isPending={pendingConnectionFrom === el.id}
            onPointerDown={(e) => startElementDrag(el.id, e)}
            onDoubleClick={() => onElementDoubleClick(el.id)}
          />
        ))}

        {/* Marquee selection */}
        {marquee && marquee.w > 1 && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
            style={{
              left: marquee.x,
              top: marquee.y,
              width: marquee.w,
              height: marquee.h,
            }}
          />
          )}
      </div>

      {/* Presence cursors */}
      {presences
        .filter((p) => p.cursor)
        .map((p) => {
          const screenX = p.cursor!.x * viewport.zoom + viewport.pan.x;
          const screenY = p.cursor!.y * viewport.zoom + viewport.pan.y;
          return (
            <div
              key={p.participantId}
              className="absolute pointer-events-none z-30 transition-all duration-500 ease-out"
              style={{ left: screenX, top: screenY }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 2L17 8L10 11L7 17L3 2Z"
                  fill={p.color}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              <div
                className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-xs text-white whitespace-nowrap font-medium"
                style={{ backgroundColor: p.color }}
              >
                {p.displayName}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function ConnectionRenderer({
  conn,
  from,
  to,
  selected,
}: {
  conn: CanvasConnection;
  from: CanvasElement;
  to: CanvasElement;
  selected: boolean;
}) {
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;

  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  let path = '';
  if (conn.style === 'straight') {
    path = `M ${fromX} ${fromY} L ${toX} ${toY}`;
  } else if (conn.style === 'elbow') {
    path = `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`;
  } else {
    const dx = Math.abs(toX - fromX) * 0.5;
    path = `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;
  }

  const isParentChild =
    conn.label === 'father' ||
    conn.label === 'mother' ||
    conn.label === 'parent' ||
    conn.label === 'adoptive parent';

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={conn.color}
        strokeWidth={selected ? 3 : 2}
        strokeDasharray={conn.dashed ? '6 4' : undefined}
        opacity={selected ? 1 : 0.7}
      />
      {isParentChild && (
        <polygon
          points={`${toX - 6},${toY - 12} ${toX + 6},${toY - 12} ${toX},${toY}`}
          fill={conn.color}
          opacity={0.7}
        />
      )}
      {conn.label && (
        <g>
          <rect
            x={midX - conn.label.length * 3.5 - 4}
            y={midY - 9}
            width={conn.label.length * 7 + 8}
            height={18}
            rx={4}
            fill="white"
            stroke={conn.color}
            strokeWidth={1}
            opacity={0.95}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fontSize={11}
            fill="#475569"
            className="select-none"
          >
            {conn.label}
          </text>
        </g>
      )}
    </g>
  );
}

function ElementRenderer({
  element,
  selected,
  isPending,
  onPointerDown,
  onDoubleClick,
}: {
  element: CanvasElement;
  selected: boolean;
  isPending: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}) {
  if (element.type === 'person') {
    return (
      <div
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        className={`absolute rounded-xl border-2 select-none transition-shadow cursor-pointer ${
          selected
            ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
            : isPending
              ? 'border-green-500 shadow-lg ring-2 ring-green-200 animate-pulse'
              : 'border-gray-300 shadow-sm hover:shadow-md'
        }`}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          backgroundColor: element.color,
          zIndex: selected ? 100 : element.zIndex,
        }}
      >
        <div className="flex flex-col items-center justify-center h-full p-2 text-center">
          <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center mb-1.5 border border-gray-200">
            <span className="text-lg font-bold text-gray-500">
              {element.text.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">
            {element.text}
          </p>
        </div>
      </div>
    );
  }

  if (element.type === 'sticky') {
    return (
      <div
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        className={`absolute rounded-lg shadow-md p-3 select-none cursor-pointer transition-shadow ${
          selected ? 'ring-2 ring-blue-400' : ''
        }`}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          backgroundColor: element.color,
          zIndex: selected ? 100 : element.zIndex,
        }}
      >
        <textarea
          className="w-full h-full bg-transparent text-xs text-gray-800 resize-none focus:outline-none placeholder:text-gray-400"
          value={element.text}
          readOnly
          placeholder="Type a note..."
        />
      </div>
    );
  }

  // text element
  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className={`absolute select-none cursor-pointer transition-shadow ${
        selected ? 'ring-2 ring-blue-400 rounded' : ''
      }`}
      style={{
        left: element.x,
        top: element.y,
        zIndex: selected ? 100 : element.zIndex,
      }}
    >
      <p className="text-sm text-gray-700 px-1 py-0.5">{element.text}</p>
    </div>
  );
}
