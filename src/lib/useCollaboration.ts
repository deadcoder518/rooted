import { useEffect, useRef, useState, useCallback } from 'react';
import type { CanvasDocument, CanvasElement, CanvasConnection, PresenceState } from '@/types/domain';
import { api } from '@/api/apiClient';
import { uid } from '@/api/apiClient';

const SIM_PART_NAMES = ['Aunt Pat', 'Uncle Bob', 'Cousin Jen', 'Grandpa Joe'];
const SIM_PART_COLORS = ['#dc2626', '#16a34a', '#d97706', '#0891b2'];

export interface CollaborationState {
  canvas: CanvasDocument | null;
  connected: boolean;
  connectionState: 'connected' | 'reconnecting' | 'offline';
  presences: PresenceState[];
  saveStatus: 'idle' | 'saving' | 'saved';
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  addElement: (el: Omit<CanvasElement, 'id'>) => string;
  removeElement: (id: string) => void;
  addConnection: (conn: Omit<CanvasConnection, 'id'>) => string;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, patch: Partial<CanvasConnection>) => void;
  setCanvas: (doc: CanvasDocument) => void;
}

export function useCollaboration(treeId: string): CollaborationState {
  const [canvas, setCanvasState] = useState<CanvasDocument | null>(null);
  const [connectionState, setConnectionState] =
    useState<'connected' | 'reconnecting' | 'offline'>('reconnecting');
  const [presences, setPresences] = useState<PresenceState[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<CanvasDocument | null>(null);

  const scheduleSave = useCallback((doc: CanvasDocument) => {
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.saveCanvas(treeId, doc);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 800);
  }, [treeId]);

  const commitCanvas = useCallback((doc: CanvasDocument) => {
    canvasRef.current = doc;
    setCanvasState(doc);
    scheduleSave(doc);
  }, [scheduleSave]);

  const loadCanvas = useCallback(async () => {
    const doc = await api.getCanvas(treeId);
    canvasRef.current = doc;
    setCanvasState(doc);
    setConnectionState('connected');
  }, [treeId]);

  useEffect(() => {
    loadCanvas();
  }, [loadCanvas]);

  // Simulated presence: other participants moving cursors
  useEffect(() => {
    if (!canvas) return;
    const simParts: PresenceState[] = SIM_PART_NAMES.slice(0, 2).map((name, i) => ({
      participantId: `sim_${i}`,
      displayName: name,
      color: SIM_PART_COLORS[i],
      cursor: { x: 100 + i * 200, y: 100 + i * 150 },
      selectedIds: [],
      connectionState: 'connected',
    }));
    setPresences(simParts);

    const interval = setInterval(() => {
      setPresences((prev) =>
        prev.map((p) => {
          if (p.participantId.startsWith('sim_')) {
            const cur = p.cursor ?? { x: 0, y: 0 };
            return {
              ...p,
              cursor: {
                x: cur.x + (Math.random() - 0.5) * 80,
                y: cur.y + (Math.random() - 0.5) * 80,
              },
            };
          }
          return p;
        }),
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [canvas]);

  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    const doc = canvasRef.current;
    if (!doc) return;
    const newDoc: CanvasDocument = {
      ...doc,
      elements: doc.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    };
    commitCanvas(newDoc);
  }, [commitCanvas]);

  const addElement = useCallback((el: Omit<CanvasElement, 'id'>): string => {
    const doc = canvasRef.current;
    if (!doc) return '';
    const id = uid('el');
    const newDoc: CanvasDocument = {
      ...doc,
      elements: [...doc.elements, { ...el, id }],
    };
    commitCanvas(newDoc);
    return id;
  }, [commitCanvas]);

  const removeElement = useCallback((id: string) => {
    const doc = canvasRef.current;
    if (!doc) return;
    commitCanvas({
      ...doc,
      elements: doc.elements.filter((e) => e.id !== id),
      connections: doc.connections.filter(
        (c) => c.from_element_id !== id && c.to_element_id !== id,
      ),
    });
  }, [commitCanvas]);

  const addConnection = useCallback((conn: Omit<CanvasConnection, 'id'>): string => {
    const doc = canvasRef.current;
    if (!doc) return '';
    const id = uid('conn');
    commitCanvas({
      ...doc,
      connections: [...doc.connections, { ...conn, id }],
    });
    return id;
  }, [commitCanvas]);

  const removeConnection = useCallback((id: string) => {
    const doc = canvasRef.current;
    if (!doc) return;
    commitCanvas({
      ...doc,
      connections: doc.connections.filter((c) => c.id !== id),
    });
  }, [commitCanvas]);

  const updateConnection = useCallback((id: string, patch: Partial<CanvasConnection>) => {
    const doc = canvasRef.current;
    if (!doc) return;
    commitCanvas({
      ...doc,
      connections: doc.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }, [commitCanvas]);

  const setCanvas = useCallback((doc: CanvasDocument) => {
    commitCanvas(doc);
  }, [commitCanvas]);

  return {
    canvas,
    connected: connectionState === 'connected',
    connectionState,
    presences,
    saveStatus,
    updateElement,
    addElement,
    removeElement,
    addConnection,
    removeConnection,
    updateConnection,
    setCanvas,
  };
}
