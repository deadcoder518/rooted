import type {
  FamilyTree,
  InvitationLink,
  Participant,
  FamilyMember,
  FamilyRelationship,
  CanvasDocument,
  User,
  ParticipantRole,
  RelationshipType,
  TreeState,
  PrivacyLevel,
  CanvasElement,
  CanvasConnection,
  Gender,
  ConnectorStyle,
} from '@/types/domain';
import { createMockDB, type MockDB } from './mockBackend';

const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let db: MockDB = createMockDB();

export function resetMockDB() {
  db = createMockDB();
}

function requireTree(treeId: string): FamilyTree {
  const tree = db.trees[treeId];
  if (!tree) throw new Error('Family tree not found');
  return tree;
}

function ensureParticipant(treeId: string, role?: ParticipantRole): Participant {
  const parts = Object.values(db.participants).filter(
    (p) => p.family_tree_id === treeId && p.active,
  );
  const me = parts.find((p) => p.user_id === db.currentUser.id);
  if (me) return me;
  const p: Participant = {
    id: uid('part'),
    family_tree_id: treeId,
    user_id: db.currentUser.id,
    display_name: db.currentUser.display_name,
    role: role ?? 'owner',
    joined_at: now(),
    left_at: null,
    color: ['#2563eb', '#dc2626', '#16a34a', '#d97706'][parts.length % 4],
    active: true,
  };
  db.participants[p.id] = p;
  return p;
}

export interface DashboardTree {
  tree: FamilyTree;
  peopleCount: number;
  participantNames: string[];
  ownerName: string;
}

export const api = {
  async getCurrentUser(): Promise<User> {
    await delay(150);
    return db.currentUser;
  },

  async listTrees(): Promise<DashboardTree[]> {
    await delay(300);
    return Object.values(db.trees)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((tree) => {
        const people = Object.values(db.members).filter(
          (m) => m.family_tree_id === tree.id,
        );
        const parts = Object.values(db.participants).filter(
          (p) => p.family_tree_id === tree.id,
        );
        const owner = db.users[tree.owner_user_id];
        return {
          tree,
          peopleCount: people.length,
          participantNames: parts.map((p) => p.display_name),
          ownerName: owner?.display_name ?? 'Unknown',
        };
      });
  },

  async createTree(title: string, description: string | null): Promise<FamilyTree> {
    await delay(400);
    const tree: FamilyTree = {
      id: uid('tree'),
      owner_user_id: db.currentUser.id,
      title,
      description,
      state: 'draft',
      editing_enabled: true,
      created_at: now(),
      updated_at: now(),
      archived_at: null,
    };
    db.trees[tree.id] = tree;
    db.canvases[tree.id] = {
      id: uid('canvas'),
      family_tree_id: tree.id,
      elements: [],
      connections: [],
      strokes: [],
      updated_at: now(),
    };
    ensureParticipant(tree.id, 'owner');
    return tree;
  },

  async getTree(treeId: string): Promise<FamilyTree> {
    await delay(200);
    return requireTree(treeId);
  },

  async updateTree(
    treeId: string,
    patch: Partial<Pick<FamilyTree, 'title' | 'description' | 'editing_enabled' | 'state'>>,
  ): Promise<FamilyTree> {
    await delay(300);
    const tree = requireTree(treeId);
    Object.assign(tree, patch);
    tree.updated_at = now();
    if (patch.state === 'archived' && !tree.archived_at) {
      tree.archived_at = now();
      tree.editing_enabled = false;
    }
    return tree;
  },

  async archiveTree(treeId: string): Promise<FamilyTree> {
    return this.updateTree(treeId, { state: 'archived' });
  },

  async duplicateTree(treeId: string): Promise<FamilyTree> {
    await delay(500);
    const src = requireTree(treeId);
    const copy: FamilyTree = {
      ...src,
      id: uid('tree'),
      title: `${src.title} (Copy)`,
      state: 'draft',
      created_at: now(),
      updated_at: now(),
      archived_at: null,
      editing_enabled: true,
    };
    db.trees[copy.id] = copy;

    const srcCanvas = db.canvases[treeId];
    db.canvases[copy.id] = {
      ...srcCanvas,
      id: uid('canvas'),
      family_tree_id: copy.id,
      elements: srcCanvas.elements.map((e) => ({ ...e, id: uid('el') })),
      connections: srcCanvas.connections.map((c) => ({ ...c, id: uid('conn') })),
      strokes: srcCanvas.strokes.map((s) => ({ ...s, id: uid('stroke') })),
      updated_at: now(),
    };
    ensureParticipant(copy.id, 'owner');
    return copy;
  },

  async listInvitations(treeId: string): Promise<InvitationLink[]> {
    await delay(200);
    return Object.values(db.invitations)
      .filter((i) => i.family_tree_id === treeId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createInvitation(
    treeId: string,
    role: ParticipantRole,
  ): Promise<InvitationLink> {
    await delay(300);
    const invite: InvitationLink = {
      id: uid('inv'),
      family_tree_id: treeId,
      token: uid('tok') + uid('tok'),
      role_granted: role,
      expires_at: null,
      max_uses: null,
      revoked_at: null,
      created_at: now(),
    };
    db.invitations[invite.id] = invite;
    return invite;
  },

  async revokeInvitation(treeId: string, linkId: string): Promise<void> {
    await delay(200);
    const invite = db.invitations[linkId];
    if (invite && invite.family_tree_id === treeId) {
      invite.revoked_at = now();
    }
  },

  async validateToken(
    token: string,
  ): Promise<{ tree: FamilyTree; role: ParticipantRole } | null> {
    await delay(400);
    const invite = Object.values(db.invitations).find(
      (i) => i.token === token && !i.revoked_at,
    );
    if (!invite) return null;
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;
    const tree = db.trees[invite.family_tree_id];
    if (!tree) return null;
    return { tree, role: invite.role_granted };
  },

  async joinTree(
    treeId: string,
    displayName: string,
    role: ParticipantRole,
  ): Promise<Participant> {
    await delay(500);
    const tree = requireTree(treeId);
    if (tree.state === 'archived') throw new Error('This family tree is archived');
    const existing = Object.values(db.participants).find(
      (p) =>
        p.family_tree_id === treeId &&
        p.user_id === db.currentUser.id &&
        p.active,
    );
    if (existing) return existing;
    const count = Object.values(db.participants).filter(
      (p) => p.family_tree_id === treeId && p.active,
    ).length;
    const participant: Participant = {
      id: uid('part'),
      family_tree_id: treeId,
      user_id: db.currentUser.id,
      display_name: displayName,
      role,
      joined_at: now(),
      left_at: null,
      color: ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#0891b2'][count % 5],
      active: true,
    };
    db.participants[participant.id] = participant;
    return participant;
  },

  async listParticipants(treeId: string): Promise<Participant[]> {
    await delay(200);
    return Object.values(db.participants)
      .filter((p) => p.family_tree_id === treeId)
      .sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  },

  async removeParticipant(treeId: string, participantId: string): Promise<void> {
    await delay(200);
    const p = db.participants[participantId];
    if (p && p.family_tree_id === treeId) {
      p.active = false;
      p.left_at = now();
    }
  },

  async getCanvas(treeId: string): Promise<CanvasDocument> {
    await delay(300);
    const canvas = db.canvases[treeId];
    if (!canvas) throw new Error('Canvas not found');
    return JSON.parse(JSON.stringify(canvas));
  },

  async saveCanvas(treeId: string, canvas: CanvasDocument): Promise<void> {
    await delay(100);
    db.canvases[treeId] = { ...canvas, updated_at: now() };
  },

  async listMembers(treeId: string): Promise<FamilyMember[]> {
    await delay(200);
    return Object.values(db.members)
      .filter((m) => m.family_tree_id === treeId)
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  },

  async createMember(
    treeId: string,
    data: Partial<FamilyMember>,
  ): Promise<FamilyMember> {
    await delay(300);
    const member: FamilyMember = {
      id: uid('person'),
      family_tree_id: treeId,
      display_name: data.display_name ?? 'New Person',
      first_name: data.first_name ?? null,
      middle_name: data.middle_name ?? null,
      last_name: data.last_name ?? null,
      maiden_name: data.maiden_name ?? null,
      gender: data.gender ?? null,
      birth_date: data.birth_date ?? null,
      death_date: data.death_date ?? null,
      birth_place: data.birth_place ?? null,
      death_place: data.death_place ?? null,
      biography: data.biography ?? null,
      profile_photo_url: data.profile_photo_url ?? null,
      privacy_level: data.privacy_level ?? 'restricted',
      created_at: now(),
      updated_at: now(),
    };
    db.members[member.id] = member;
    return member;
  },

  async updateMember(
    treeId: string,
    memberId: string,
    patch: Partial<FamilyMember>,
  ): Promise<FamilyMember> {
    await delay(250);
    const member = db.members[memberId];
    if (!member || member.family_tree_id !== treeId)
      throw new Error('Member not found');
    Object.assign(member, patch, { updated_at: now() });
    return member;
  },

  async deleteMember(treeId: string, memberId: string): Promise<void> {
    await delay(200);
    delete db.members[memberId];
  },

  async listRelationships(treeId: string): Promise<FamilyRelationship[]> {
    await delay(200);
    return Object.values(db.relationships).filter(
      (r) => r.family_tree_id === treeId,
    );
  },

  async createRelationship(
    treeId: string,
    data: Partial<FamilyRelationship>,
  ): Promise<FamilyRelationship> {
    await delay(300);
    const rel: FamilyRelationship = {
      id: uid('rel'),
      family_tree_id: treeId,
      person_a_id: data.person_a_id ?? '',
      person_b_id: data.person_b_id ?? '',
      relationship_type: data.relationship_type ?? 'parent_child',
      relationship_details: data.relationship_details ?? null,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      created_at: now(),
      updated_at: now(),
    };
    db.relationships[rel.id] = rel;
    return rel;
  },

  async updateRelationship(
    treeId: string,
    relId: string,
    patch: Partial<FamilyRelationship>,
  ): Promise<FamilyRelationship> {
    await delay(250);
    const rel = db.relationships[relId];
    if (!rel || rel.family_tree_id !== treeId)
      throw new Error('Relationship not found');
    Object.assign(rel, patch, { updated_at: now() });
    return rel;
  },

  async deleteRelationship(treeId: string, relId: string): Promise<void> {
    await delay(200);
    delete db.relationships[relId];
  },
};

export { uid };
export type {
  FamilyTree,
  InvitationLink,
  Participant,
  FamilyMember,
  FamilyRelationship,
  CanvasDocument,
  CanvasElement,
  CanvasConnection,
  User,
  ParticipantRole,
  RelationshipType,
  TreeState,
  PrivacyLevel,
  Gender,
  ConnectorStyle,
};
