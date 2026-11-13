import { useEffect, useState } from 'react';
import {
  Users2,
  TreePine,
  Plus,
  Copy,
  Archive,
  Link as LinkIcon,
  Clock,
  Calendar,
  Search,
  MoreVertical,
  Trash2,
  FileText,
} from 'lucide-react';
import { api, type DashboardTree } from '@/api/apiClient';
import { useRouter } from '@/lib/router';
import type { InvitationLink } from '@/types/domain';

const STATE_STYLES: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700 border-amber-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  archived: 'bg-gray-200 text-gray-600 border-gray-300',
};

export default function Dashboard() {
  const { navigate } = useRouter();
  const [trees, setTrees] = useState<DashboardTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [shareTreeId, setShareTreeId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await api.listTrees();
    setTrees(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDuplicate = async (id: string) => {
    await api.duplicateTree(id);
    load();
  };

  const handleArchive = async (id: string) => {
    await api.archiveTree(id);
    load();
  };

  const filtered = trees.filter((t) =>
    t.tree.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center shadow-sm">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Rooted</h1>
              <p className="text-xs text-gray-500">Collaborative Family Trees</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Family Tree
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Family Trees</h2>
          <p className="text-gray-500 text-sm">
            Create, share, and collaborate on family trees with your relatives.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search family trees..."
            className="w-full max-w-md pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-48"
              >
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <TreePine className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No family trees yet
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Get started by creating your first family tree.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Family Tree
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => (
              <TreeCard
                key={item.tree.id}
                item={item}
                onOpen={() => navigate(`/tree/${item.tree.id}`)}
                onDuplicate={() => handleDuplicate(item.tree.id)}
                onArchive={() => handleArchive(item.tree.id)}
                onShare={() => setShareTreeId(item.tree.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateTreeModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            navigate(`/tree/${id}`);
          }}
        />
      )}

      {shareTreeId && (
        <ShareModal
          treeId={shareTreeId}
          onClose={() => setShareTreeId(null)}
        />
      )}
    </div>
  );
}

function TreeCard({
  item,
  onOpen,
  onDuplicate,
  onArchive,
  onShare,
}: {
  item: DashboardTree;
  onOpen: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onShare: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { tree } = item;

  return (
    <div
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{tree.title}</h3>
          {tree.description && (
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {tree.description}
            </p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-40"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  onDuplicate();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              {tree.state !== 'archived' && (
                <button
                  onClick={() => {
                    onArchive();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Archive className="w-4 h-4" /> Archive
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATE_STYLES[tree.state]}`}
        >
          {tree.state}
        </span>
        {tree.state !== 'archived' && !tree.editing_enabled && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
            <FileText className="w-3 h-3" /> Locked
          </span>
        )}
      </div>

      <div className="space-y-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Users2 className="w-3.5 h-3.5" />
          <span>{item.peopleCount} people</span>
          <span className="text-gray-300">·</span>
          <span>{item.participantNames.length} participants</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Created {new Date(tree.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Updated {timeAgo(tree.updated_at)}
          </span>
        </div>
      </div>

      {tree.state !== 'archived' && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" /> Share link
          </button>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CreateTreeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const tree = await api.createTree(title.trim(), description.trim() || null);
    setCreating(false);
    onCreated(tree.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-1">New Family Tree</h2>
        <p className="text-sm text-gray-500 mb-5">
          Give your family tree a name to get started.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Smith Family"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this family tree..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareModal({
  treeId,
  onClose,
}: {
  treeId: string;
  onClose: () => void;
}) {
  const [invites, setInvites] = useState<InvitationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await api.listInvitations(treeId);
    setInvites(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [treeId]);

  const handleCreate = async () => {
    await api.createInvitation(treeId, 'member');
    load();
  };

  const handleRevoke = async (id: string) => {
    await api.revokeInvitation(treeId, id);
    load();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/join/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Share Family Tree</h2>
        <p className="text-sm text-gray-500 mb-5">
          Anyone with this link can join and collaborate.
        </p>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mb-4"
        >
          <Plus className="w-4 h-4" /> Generate new link
        </button>

        {loading ? (
          <div className="text-sm text-gray-400 py-4">Loading...</div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-gray-400 py-4">
            No invitation links yet. Generate one to start sharing.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    Role: {inv.role_granted}
                  </p>
                  <p className="text-xs text-gray-400 truncate font-mono">
                    {`/join/${inv.token.slice(0, 16)}...`}
                  </p>
                </div>
                {inv.revoked_at ? (
                  <span className="text-xs text-red-500 font-medium">Revoked</span>
                ) : (
                  <>
                    <button
                      onClick={() => copyLink(inv.token)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {copied === inv.token ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
