import { useEffect, useState } from 'react';
import {
  TreePine,
  AlertCircle,
  Loader2,
  Shield,
  Users,
} from 'lucide-react';
import { api } from '@/api/apiClient';
import { useRouter } from '@/lib/router';
import type { FamilyTree, ParticipantRole } from '@/types/domain';

export default function JoinLobby({ token }: { token: string }) {
  const { navigate } = useRouter();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [role, setRole] = useState<ParticipantRole>('member');
  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid'>('validating');
  const [displayName, setDisplayName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.validateToken(token).then((result) => {
      if (result) {
        setTree(result.tree);
        setRole(result.role);
        setStatus('valid');
      } else {
        setStatus('invalid');
      }
    });
  }, [token]);

  const handleJoin = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    if (!accepted) {
      setError('Please accept the privacy notice to continue');
      return;
    }
    setJoining(true);
    setError('');
    try {
      await api.joinTree(tree!.id, displayName.trim(), role);
      navigate(`/tree/${tree!.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join');
      setJoining(false);
    }
  };

  if (status === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Invitation no longer valid
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            This link may have been revoked, expired, or the family tree may have been archived.
            Please contact the person who shared it with you.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center shadow-sm">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Rooted</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1">
              You've been invited to join
            </p>
            <h2 className="text-lg font-semibold text-gray-900">{tree!.title}</h2>
            {tree!.description && (
              <p className="text-sm text-gray-500 mt-1">{tree!.description}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How others will see you..."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3.5 flex gap-3">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Privacy notice</p>
                <p>
                  Family tree activity is saved and visible to all participants.
                  Personal information about living family members may be restricted
                  by the tree owner. Your display name will be visible to others.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">
                I accept the privacy notice and understand my activity is saved.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Joining...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" /> Join Family Tree
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Canvas activity is automatically saved for later review.
        </p>
      </div>
    </div>
  );
}
