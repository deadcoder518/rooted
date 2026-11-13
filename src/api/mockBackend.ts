import type {
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
  ConnectorStyle,
} from '@/types/domain';

const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const now = () => new Date().toISOString();

const PARTICIPANT_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#d97706',
  '#0891b2',
  '#7c3aed',
  '#db2777',
  '#65a30d',
  '#ea580c',
  '#0d9488',
];

function colorForIndex(i: number) {
  return PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length];
}

export interface MockDB {
  currentUser: User;
  users: Record<string, User>;
  trees: Record<string, FamilyTree>;
  invitations: Record<string, InvitationLink>;
  participants: Record<string, Participant>;
  members: Record<string, FamilyMember>;
  relationships: Record<string, FamilyRelationship>;
  canvases: Record<string, CanvasDocument>;
}

function seedTree(
  db: MockDB,
  title: string,
  description: string | null,
  state: 'draft' | 'active' | 'archived',
  daysAgo: number,
): FamilyTree {
  const treeId = uid('tree');
  const owner = db.currentUser;
  const created = new Date();
  created.setDate(created.getDate() - daysAgo);

  const tree: FamilyTree = {
    id: treeId,
    owner_user_id: owner.id,
    title,
    description,
    state,
    editing_enabled: true,
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
    archived_at: state === 'archived' ? created.toISOString() : null,
  };

  db.trees[treeId] = tree;

  const canvasId = uid('canvas');
  db.canvases[treeId] = {
    id: canvasId,
    family_tree_id: treeId,
    elements: [],
    connections: [],
    strokes: [],
    updated_at: created.toISOString(),
  };

  const ownerParticipant: Participant = {
    id: uid('part'),
    family_tree_id: treeId,
    user_id: owner.id,
    display_name: owner.display_name,
    role: 'owner',
    joined_at: created.toISOString(),
    left_at: null,
    color: colorForIndex(0),
    active: true,
  };
  db.participants[ownerParticipant.id] = ownerParticipant;

  if (state !== 'draft') {
    const invite: InvitationLink = {
      id: uid('inv'),
      family_tree_id: treeId,
      token: uid('tok'),
      role_granted: 'member',
      expires_at: null,
      max_uses: null,
      revoked_at: null,
      created_at: created.toISOString(),
    };
    db.invitations[invite.id] = invite;

    if (state === 'active') {
      seedMembers(db, treeId);
    }
  }

  return tree;
}

function seedMembers(db: MockDB, treeId: string) {
  const make = (
    first: string,
    last: string,
    gender: FamilyMember['gender'],
    birth: string | null,
    death: string | null,
    x: number,
    y: number,
  ): { member: FamilyMember; element: CanvasElement } => {
    const mid = uid('person');
    const eid = uid('el');
    const member: FamilyMember = {
      id: mid,
      family_tree_id: treeId,
      display_name: `${first} ${last}`,
      first_name: first,
      middle_name: null,
      last_name: last,
      maiden_name: null,
      gender,
      birth_date: birth,
      death_date: death,
      birth_place: null,
      death_place: null,
      biography: null,
      profile_photo_url: null,
      privacy_level: death ? 'public' : 'restricted',
      created_at: now(),
      updated_at: now(),
    };
    db.members[mid] = member;
    const element: CanvasElement = {
      id: eid,
      type: 'person',
      x,
      y,
      width: 180,
      height: 120,
      rotation: 0,
      zIndex: 1,
      family_member_id: mid,
      text: member.display_name,
      color:
        gender === 'male'
          ? '#dbeafe'
          : gender === 'female'
            ? '#fce7f3'
            : '#e0e7ff',
      createdBy: 'seed',
    };
    db.canvases[treeId].elements.push(element);
    return { member, element };
  };

  const connect = (
    fromId: string,
    toId: string,
    relType: RelationshipType,
    label: string,
  ) => {
    const relId = uid('rel');
    const rel: FamilyRelationship = {
      id: relId,
      family_tree_id: treeId,
      person_a_id: fromId,
      person_b_id: toId,
      relationship_type: relType,
      relationship_details: null,
      start_date: null,
      end_date: null,
      created_at: now(),
      updated_at: now(),
    };
    db.relationships[relId] = rel;
    const conn: CanvasConnection = {
      id: uid('conn'),
      from_element_id: fromId,
      to_element_id: toId,
      relationship_id: relId,
      style: 'elbow' as ConnectorStyle,
      label,
      dashed: false,
      color: '#64748b',
    };
    db.canvases[treeId].connections.push(conn);
  };

  const grandpa = make('William', 'Hartley', 'male', '1935-03-12', '2018-09-01', 0, 0);
  const grandma = make('Margaret', 'Hartley', 'female', '1938-07-22', null, 260, 0);
  const dad = make('Robert', 'Hartley', 'male', '1965-01-15', null, 130, 280);
  const mom = make('Diane', 'Hartley', 'female', '1967-05-30', null, 430, 280);
  const child1 = make('Emily', 'Hartley', 'female', '1992-11-08', null, 280, 560);
  const child2 = make('James', 'Hartley', 'male', '1995-04-17', null, 500, 560);

  connect(grandpa.element.id, grandma.element.id, 'spouse', 'married');
  connect(grandpa.element.id, dad.element.id, 'parent_child', 'father');
  connect(grandma.element.id, dad.element.id, 'parent_child', 'mother');
  connect(dad.element.id, mom.element.id, 'spouse', 'married');
  connect(dad.element.id, child1.element.id, 'parent_child', 'father');
  connect(mom.element.id, child1.element.id, 'parent_child', 'mother');
  connect(dad.element.id, child2.element.id, 'parent_child', 'father');
  connect(mom.element.id, child2.element.id, 'parent_child', 'mother');
}

export function createMockDB(): MockDB {
  const user: User = {
    id: uid('user'),
    email: 'you@example.com',
    display_name: 'You',
    created_at: new Date().toISOString(),
  };

  const db: MockDB = {
    currentUser: user,
    users: { [user.id]: user },
    trees: {},
    invitations: {},
    participants: {},
    members: {},
    relationships: {},
    canvases: {},
  };

  seedTree(db, 'Hartley Family', 'Three generations of the Hartley family', 'active', 5);
  seedTree(db, 'My New Tree', 'Just started — not yet shared', 'draft', 0);
  seedTree(db, 'Reunion 2020', 'Archived after the family reunion', 'archived', 60);

  return db;
}
