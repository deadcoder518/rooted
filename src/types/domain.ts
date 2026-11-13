export type TreeState = 'draft' | 'active' | 'archived';
export type ParticipantRole = 'owner' | 'admin' | 'member' | 'viewer';
export type Gender = 'male' | 'female' | 'nonbinary' | 'unspecified';
export type PrivacyLevel = 'public' | 'restricted' | 'private';

export type RelationshipType =
  | 'parent_child'
  | 'adopted_parent_child'
  | 'spouse'
  | 'partner'
  | 'sibling'
  | 'step_parent'
  | 'other';

export type ConnectorStyle = 'straight' | 'elbow' | 'curved';

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface FamilyTree {
  id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  state: TreeState;
  editing_enabled: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface InvitationLink {
  id: string;
  family_tree_id: string;
  token: string;
  role_granted: ParticipantRole;
  expires_at: string | null;
  max_uses: number | null;
  revoked_at: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  family_tree_id: string;
  user_id: string | null;
  display_name: string;
  role: ParticipantRole;
  joined_at: string;
  left_at: string | null;
  color: string;
  active: boolean;
}

export interface FamilyMember {
  id: string;
  family_tree_id: string;
  display_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  maiden_name: string | null;
  gender: Gender | null;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  death_place: string | null;
  biography: string | null;
  profile_photo_url: string | null;
  privacy_level: PrivacyLevel;
  created_at: string;
  updated_at: string;
}

export interface FamilyRelationship {
  id: string;
  family_tree_id: string;
  person_a_id: string;
  person_b_id: string;
  relationship_type: RelationshipType;
  relationship_details: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type CanvasElementType = 'person' | 'text' | 'sticky' | 'note';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  family_member_id: string | null;
  text: string;
  color: string;
  createdBy: string;
}

export interface CanvasConnection {
  id: string;
  from_element_id: string;
  to_element_id: string;
  relationship_id: string;
  style: ConnectorStyle;
  label: string;
  dashed: boolean;
  color: string;
}

export interface CanvasStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  highlighter: boolean;
  createdBy: string;
}

export interface CanvasDocument {
  id: string;
  family_tree_id: string;
  elements: CanvasElement[];
  connections: CanvasConnection[];
  strokes: CanvasStroke[];
  updated_at: string;
}

export interface PresenceState {
  participantId: string;
  displayName: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedIds: string[];
  connectionState: 'connected' | 'reconnecting' | 'offline';
}
