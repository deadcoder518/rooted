import { useState, useEffect } from 'react';
import {
  TreePine,
  Users,
  Share2,
  Archive,
  Lock,
  Unlock,
  ChevronLeft,
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import type { FamilyTree, Participant } from '@/types/domain';

interface TopBarProps {
  tree: FamilyTree;
  participants: Participant[];
  connected: boolean;
  connectionState: 'connected' | 'reconnecting' | 'offline';
  saveStatus: 'idle' | 'saving' | 'saved';
  editingEnabled: boolean;
  onToggleLock: () => void;
  onArchive: () => void;
  onShare: () => void;
  onBack: () => void;
}

export default function TopBar(props: TopBarProps) {
  const {
    tree,
    participants,
    connectionState,
    saveStatus,
    editingEnabled,
    onToggleLock,
    onArchive,
    onShare,
    onBack,
  } = props;

  const activeParticipants = participants.filter((p) => p.active);
  const [showParticipants, setShowParticipants] = useState(false);

  return (
    <div className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4">
      {/* Left: back + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          title="Back to dashboard"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center flex-shrink-0">
            <TreePine className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {tree.title}
            </h1>
            {tree.state === 'archived' ? (
              <span className="text-xs text-gray-400">Archived — read only</span>
            ) : saveStatus === 'saving' ? (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" /> Saved
              </span>
            ) : (
              <span className="text-xs text-gray-400">All changes saved</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50">
          {connectionState === 'connected' ? (
            <>
              <Cloud className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-gray-600 hidden sm:inline">Connected</span>
            </>
          ) : connectionState === 'reconnecting' ? (
            <>
              <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
              <span className="text-xs text-gray-600 hidden sm:inline">Reconnecting</span>
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-600 hidden sm:inline">Offline</span>
            </>
          )}
        </div>

        {/* Participants */}
        <div className="relative">
          <button
            onClick={() => setShowParticipants((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex -space-x-2">
              {activeParticipants.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: p.color }}
                  title={p.display_name}
                >
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">
              {activeParticipants.length}
            </span>
          </button>
          {showParticipants && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowParticipants(false)}
              />
              <div className="absolute right-0 top-12 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-56">
                <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Active Participants
                </p>
                {activeParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {p.display_name}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{p.role}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Lock toggle */}
        {tree.state !== 'archived' && (
          <button
            onClick={onToggleLock}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              editingEnabled
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
            }`}
            title={editingEnabled ? 'Lock editing' : 'Unlock editing'}
          >
            {editingEnabled ? (
              <>
                <Unlock className="w-4 h-4" />
                <span className="hidden sm:inline">Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Locked</span>
              </>
            )}
          </button>
        )}

        {/* Share */}
        {tree.state !== 'archived' && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Archive */}
        {tree.state !== 'archived' && (
          <button
            onClick={onArchive}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Archive family tree"
          >
            <Archive className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
