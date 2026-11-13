import { useState, useEffect, useCallback, useRef } from 'react';
import { api, uid } from '@/api/apiClient';
import { useRouter } from '@/lib/router';
import { useCollaboration } from '@/lib/useCollaboration';
import type { FamilyTree, FamilyMember, FamilyRelationship, Participant, CanvasDocument, CanvasElement } from '@/types/domain';
import type { RelationshipType } from '@/types/domain';

import CanvasViewport, { type ViewportState } from '@/components/canvas/CanvasViewport';
import Toolbar, { type Tool } from '@/components/canvas/Toolbar';
import TopBar from '@/components/canvas/TopBar';
import BottomControls from '@/components/canvas/BottomControls';
import PropertiesPanel from '@/components/canvas/PropertiesPanel';
import { Share2, Archive, X, AlertCircle } from 'lucide-react';

const PERSON_COLORS: Record<string, string> = {
  male: '#dbeafe',
  female: '#fce7f3',
  nonbinary: '#e0e7ff',
  unspecified: '#f1f5f9',
};

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  parent_child: 'Parent → Child',
  adopted_parent_child: 'Adoptive Parent → Child',
  spouse: 'Spouse',
  partner: 'Partner',
  sibling: 'Sibling',
  step_parent: 'Step-Parent → Child',
  other: 'Other',
};

export default function TreeEditor({ treeId }: { treeId: string }) {
  const { navigate } = useRouter();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState<Tool>('select');
  const [viewport, setViewport] = useState<ViewportState>({ pan: { x: 200, y: 100 }, zoom: 0.8 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingConnectionFrom, setPendingConnectionFrom] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  const collab = useCollaboration(treeId);

  // History (undo/redo) — stores canvas snapshots
  const undoStack = useRef<CanvasDocument[]>([]);
  const redoStack = useRef<CanvasDocument[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const lastPushedRef = useRef<string>('');

  const updateHistoryFlag = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  useEffect(() => {
    if (collab.canvas) {
      const snapshot = JSON.stringify(collab.canvas);
      if (lastPushedRef.current && lastPushedRef.current !== snapshot) {
        // Only push if we had a prior state and it differs
      }
      lastPushedRef.current = snapshot;
    }
  }, [collab.canvas]);

  const pushUndo = useCallback(() => {
    if (collab.canvas) {
      undoStack.current.push(JSON.parse(JSON.stringify(collab.canvas)));
      if (undoStack.current.length > 50) undoStack.current.shift();
      redoStack.current = [];
      updateHistoryFlag();
    }
  }, [collab.canvas, updateHistoryFlag]);

  const loadData = useCallback(async () => {
    const [t, m, r, p] = await Promise.all([
      api.getTree(treeId),
      api.listMembers(treeId),
      api.listRelationships(treeId),
      api.listParticipants(treeId),
    ]);
    setTree(t);
    setMembers(m);
    setRelationships(r);
    setParticipants(p);
    setLoading(false);
  }, [treeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'v' || e.key === 'V') setTool('select');
      else if (e.key === 'h' || e.key === 'H') setTool('pan');
      else if (e.key === 'p' || e.key === 'P') setTool('addPerson');
      else if (e.key === 'c' || e.key === 'C') setTool('connect');
      else if (e.key === 't' || e.key === 'T') setTool('text');
      else if (e.key === 'n' || e.key === 'N') setTool('sticky');
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && tree?.editing_enabled) {
        e.preventDefault();
        pushUndo();
        selectedIds.forEach((id) => collab.removeElement(id));
        setSelectedIds([]);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setPendingConnectionFrom(null);
        setSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds, tree, collab, pushUndo]);

  const handleUndo = () => {
    if (undoStack.current.length === 0 || !collab.canvas) return;
    redoStack.current.push(JSON.parse(JSON.stringify(collab.canvas)));
    const prev = undoStack.current.pop()!;
    collab.setCanvas(prev);
    updateHistoryFlag();
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0 || !collab.canvas) return;
    undoStack.current.push(JSON.parse(JSON.stringify(collab.canvas)));
    const next = redoStack.current.pop()!;
    collab.setCanvas(next);
    updateHistoryFlag();
  };

  const editingEnabled = tree?.editing_enabled ?? false;

  const handleAddPerson = useCallback(async () => {
    if (!collab.canvas || !editingEnabled) return;
    pushUndo();
    const center = {
      x: (-viewport.pan.x + 400) / viewport.zoom,
      y: (-viewport.pan.y + 300) / viewport.zoom,
    };
    const member = await api.createMember(treeId, {
      display_name: 'New Person',
      gender: 'unspecified',
    });
    setMembers((prev) => [...prev, member]);
    const elId = collab.addElement({
      type: 'person',
      x: center.x - 90,
      y: center.y - 60,
      width: 180,
      height: 120,
      rotation: 0,
      zIndex: 1,
      family_member_id: member.id,
      text: member.display_name,
      color: PERSON_COLORS.unspecified,
      createdBy: 'me',
    });
    setSelectedIds([elId]);
  }, [collab, editingEnabled, treeId, viewport, pushUndo]);

  const handleAddText = useCallback(() => {
    if (!collab.canvas || !editingEnabled) return;
    pushUndo();
    const center = {
      x: (-viewport.pan.x + 400) / viewport.zoom,
      y: (-viewport.pan.y + 300) / viewport.zoom,
    };
    const elId = collab.addElement({
      type: 'text',
      x: center.x,
      y: center.y,
      width: 120,
      height: 30,
      rotation: 0,
      zIndex: 1,
      family_member_id: null,
      text: 'Label',
      color: '#475569',
      createdBy: 'me',
    });
    setSelectedIds([elId]);
  }, [collab, editingEnabled, viewport, pushUndo]);

  const handleAddSticky = useCallback(() => {
    if (!collab.canvas || !editingEnabled) return;
    pushUndo();
    const center = {
      x: (-viewport.pan.x + 400) / viewport.zoom,
      y: (-viewport.pan.y + 300) / viewport.zoom,
    };
    const elId = collab.addElement({
      type: 'sticky',
      x: center.x - 80,
      y: center.y - 60,
      width: 160,
      height: 120,
      rotation: 0,
      zIndex: 1,
      family_member_id: null,
      text: '',
      color: '#fef9c3',
      createdBy: 'me',
    });
    setSelectedIds([elId]);
  }, [collab, editingEnabled, viewport, pushUndo]);

  // Handle tool changes that trigger actions
  useEffect(() => {
    if (tool === 'addPerson') {
      handleAddPerson();
      setTool('select');
    } else if (tool === 'text') {
      handleAddText();
      setTool('select');
    } else if (tool === 'sticky') {
      handleAddSticky();
      setTool('select');
    }
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartConnection = useCallback((fromId: string) => {
    if (pendingConnectionFrom === null) {
      setPendingConnectionFrom(fromId);
    } else if (pendingConnectionFrom !== fromId) {
      // Create connection
      pushUndo();
      const fromEl = collab.canvas?.elements.find((e) => e.id === pendingConnectionFrom);
      const toEl = collab.canvas?.elements.find((e) => e.id === fromId);
      if (fromEl?.family_member_id && toEl?.family_member_id) {
        api.createRelationship(treeId, {
          person_a_id: fromEl.family_member_id,
          person_b_id: toEl.family_member_id,
          relationship_type: 'parent_child',
        }).then((rel) => {
          setRelationships((prev) => [...prev, rel]);
          collab.addConnection({
            from_element_id: fromEl.id,
            to_element_id: toEl.id,
            relationship_id: rel.id,
            style: 'elbow',
            label: 'parent',
            dashed: false,
            color: '#64748b',
          });
        });
      } else {
        collab.addConnection({
          from_element_id: pendingConnectionFrom,
          to_element_id: fromId,
          relationship_id: 'none',
          style: 'curved',
          label: '',
          dashed: false,
          color: '#64748b',
        });
      }
      setPendingConnectionFrom(null);
      setTool('select');
    }
  }, [pendingConnectionFrom, collab, treeId, pushUndo]);

  const handleMoveElement = useCallback((id: string, x: number, y: number) => {
    collab.updateElement(id, { x, y });
  }, [collab]);

  const handleUpdateMember = useCallback((memberId: string, patch: Partial<FamilyMember>) => {
    api.updateMember(treeId, memberId, patch);
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, ...patch } : m)));
  }, [treeId]);

  const handleDeleteElement = useCallback((id: string) => {
    pushUndo();
    const el = collab.canvas?.elements.find((e) => e.id === id);
    if (el?.family_member_id) {
      api.deleteMember(treeId, el.family_member_id);
      setMembers((prev) => prev.filter((m) => m.id !== el.family_member_id));
    }
    collab.removeElement(id);
    setSelectedIds([]);
  }, [collab, treeId, pushUndo]);

  const handleToggleLock = async () => {
    if (!tree) return;
    const updated = await api.updateTree(treeId, { editing_enabled: !tree.editing_enabled });
    setTree(updated);
  };

  const handleArchive = async () => {
    setShowArchiveConfirm(false);
    const updated = await api.archiveTree(treeId);
    setTree(updated);
    await loadData();
  };

  const handleZoomIn = () => {
    setViewport((v) => ({ ...v, zoom: Math.min(3, v.zoom * 1.2) }));
  };
  const handleZoomOut = () => {
    setViewport((v) => ({ ...v, zoom: Math.max(0.1, v.zoom / 1.2) }));
  };
  const handleResetView = () => {
    setViewport({ pan: { x: 200, y: 100 }, zoom: 1 });
  };
  const handleZoomToFit = () => {
    if (!collab.canvas || collab.canvas.elements.length === 0) {
      handleResetView();
      return;
    }
    const els = collab.canvas.elements;
    const minX = Math.min(...els.map((e) => e.x));
    const minY = Math.min(...els.map((e) => e.y));
    const maxX = Math.max(...els.map((e) => e.x + e.width));
    const maxY = Math.max(...els.map((e) => e.y + e.height));
    const w = maxX - minX + 100;
    const h = maxY - minY + 100;
    const containerW = window.innerWidth - (selectedIds.length > 0 ? 288 : 0);
    const containerH = window.innerHeight - 56 - 60;
    const zoom = Math.min(containerW / w, containerH / h, 1.5);
    setViewport({
      zoom,
      pan: {
        x: -(minX - 50) * zoom + (containerW - w * zoom) / 2,
        y: -(minY - 50) * zoom + (containerH - h * zoom) / 2 + 56,
      },
    });
  };

  if (loading || !tree) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading family tree...</p>
        </div>
      </div>
    );
  }

  const selectedElement = collab.canvas?.elements.find((e) => e.id === selectedIds[0]) ?? null;
  const selectedMember = selectedElement?.family_member_id
    ? members.find((m) => m.id === selectedElement.family_member_id) ?? null
    : null;

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden select-none">
      <TopBar
        tree={tree}
        participants={participants}
        connected={collab.connected}
        connectionState={collab.connectionState}
        saveStatus={collab.saveStatus}
        editingEnabled={editingEnabled}
        onToggleLock={handleToggleLock}
        onArchive={() => setShowArchiveConfirm(true)}
        onShare={() => setShowShare(true)}
        onBack={() => navigate('/')}
      />

      <Toolbar
        tool={tool}
        setTool={setTool}
        editingEnabled={editingEnabled}
      />

      {collab.canvas && (
        <CanvasViewport
          canvas={collab.canvas}
          viewport={viewport}
          setViewport={setViewport}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          tool={tool}
          editingEnabled={editingEnabled}
          presences={collab.presences}
          onElementPointerDown={() => {}}
          onElementDoubleClick={() => {}}
          onCanvasClick={() => {
            if (tool === 'select') setSelectedIds([]);
          }}
          onStartConnection={handleStartConnection}
          pendingConnectionFrom={pendingConnectionFrom}
          onMoveElement={handleMoveElement}
        />
      )}

      {pendingConnectionFrom && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
          <span>Select a second person to connect</span>
          <button
            onClick={() => setPendingConnectionFrom(null)}
            className="p-0.5 hover:bg-green-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!editingEnabled && tree.state !== 'archived' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Editing is locked by the owner
        </div>
      )}

      {selectedElement && (
        <PropertiesPanel
          element={selectedElement}
          member={selectedMember}
          relationships={relationships}
          allMembers={members}
          canvas={collab.canvas!}
          editingEnabled={editingEnabled}
          onUpdateMember={handleUpdateMember}
          onUpdateElement={collab.updateElement}
          onDeleteElement={handleDeleteElement}
          onClose={() => setSelectedIds([])}
        />
      )}

      <BottomControls
        zoom={viewport.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomToFit={handleZoomToFit}
        onResetView={handleResetView}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {showShare && (
        <ShareDialog treeId={treeId} onClose={() => setShowShare(false)} />
      )}

      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowArchiveConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Archive className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Archive Family Tree?</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              The tree will become read-only for all participants. A final snapshot will be saved. You can still view it from the dashboard.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareDialog({ treeId, onClose }: { treeId: string; onClose: () => void }) {
  const [invites, setInvites] = useState<{ id: string; token: string; role_granted: string; revoked_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.listInvitations(treeId).then((data) => {
      setInvites(data);
      setLoading(false);
    });
  }, [treeId]);

  const handleCreate = async () => {
    await api.createInvitation(treeId, 'member');
    const data = await api.listInvitations(treeId);
    setInvites(data);
  };

  const handleRevoke = async (id: string) => {
    await api.revokeInvitation(treeId, id);
    const data = await api.listInvitations(treeId);
    setInvites(data);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/join/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Share2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Share Family Tree</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Anyone with this link can join and collaborate.
        </p>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mb-4"
        >
          Generate new link
        </button>

        {loading ? (
          <div className="text-sm text-gray-400 py-4">Loading...</div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-gray-400 py-4">No invitation links yet.</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 capitalize">Role: {inv.role_granted}</p>
                  <p className="text-xs text-gray-400 truncate font-mono">/join/{inv.token.slice(0, 16)}...</p>
                </div>
                {inv.revoked_at ? (
                  <span className="text-xs text-red-500 font-medium">Revoked</span>
                ) : (
                  <>
                    <button
                      onClick={() => copyLink(inv.token)}
                      className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {copied === inv.token ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
