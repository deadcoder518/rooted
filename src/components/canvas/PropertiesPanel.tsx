import { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  MapPin,
  BookOpen,
  Trash2,
  Link2,
  X,
  Info,
} from 'lucide-react';
import type { CanvasElement, CanvasDocument, FamilyMember, FamilyRelationship } from '@/types/domain';
import type { RelationshipType, PrivacyLevel, Gender } from '@/types/domain';

interface PropertiesPanelProps {
  element: CanvasElement | null;
  member: FamilyMember | null;
  relationships: FamilyRelationship[];
  allMembers: FamilyMember[];
  canvas: CanvasDocument;
  editingEnabled: boolean;
  onUpdateMember: (memberId: string, patch: Partial<FamilyMember>) => void;
  onUpdateElement: (id: string, patch: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onClose: () => void;
}

export default function PropertiesPanel(props: PropertiesPanelProps) {
  const {
    element,
    member,
    relationships,
    allMembers,
    editingEnabled,
    onUpdateMember,
    onUpdateElement,
    onDeleteElement,
    onClose,
  } = props;

  if (!element) {
    return (
      <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 z-20 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2 text-gray-400">
          <Info className="w-4 h-4" />
          <span className="text-sm">Select an element to edit its properties</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-400">
            <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No selection</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 z-20 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Properties</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {element.type === 'person' && member ? (
          <PersonProperties
            element={element}
            member={member}
            relationships={relationships}
            allMembers={allMembers}
            editingEnabled={editingEnabled}
            onUpdateMember={onUpdateMember}
            onUpdateElement={onUpdateElement}
          />
        ) : element.type === 'sticky' ? (
          <StickyProperties
            element={element}
            editingEnabled={editingEnabled}
            onUpdateElement={onUpdateElement}
          />
        ) : (
          <TextProperties
            element={element}
            editingEnabled={editingEnabled}
            onUpdateElement={onUpdateElement}
          />
        )}
      </div>

      {editingEnabled && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => onDeleteElement(element.id)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400';

function PersonProperties({
  element,
  member,
  relationships,
  allMembers,
  editingEnabled,
  onUpdateMember,
  onUpdateElement,
}: {
  element: CanvasElement;
  member: FamilyMember;
  relationships: FamilyRelationship[];
  allMembers: FamilyMember[];
  editingEnabled: boolean;
  onUpdateMember: (memberId: string, patch: Partial<FamilyMember>) => void;
  onUpdateElement: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  const [local, setLocal] = useState(member);
  useEffect(() => setLocal(member), [member]);

  const relatedRels = relationships.filter(
    (r) => r.person_a_id === member.id || r.person_b_id === member.id,
  );

  const relName = (rel: FamilyRelationship): string => {
    const otherId = rel.person_a_id === member.id ? rel.person_b_id : rel.person_a_id;
    const other = allMembers.find((m) => m.id === otherId);
    return other?.display_name ?? 'Unknown';
  };

  const REL_LABELS: Record<RelationshipType, string> = {
    parent_child: 'Parent → Child',
    adopted_parent_child: 'Adoptive Parent → Child',
    spouse: 'Spouse',
    partner: 'Partner',
    sibling: 'Sibling',
    step_parent: 'Step-Parent → Child',
    other: 'Other',
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700">
          {member.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {member.display_name}
          </p>
          <p className="text-xs text-gray-400">Family Member</p>
        </div>
      </div>

      <Field label="Display Name" icon={User}>
        <input
          type="text"
          value={local.display_name}
          disabled={!editingEnabled}
          onChange={(e) => {
            const v = e.target.value;
            setLocal({ ...local, display_name: v });
            onUpdateMember(member.id, { display_name: v });
            onUpdateElement(element.id, { text: v });
          }}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name">
          <input
            type="text"
            value={local.first_name ?? ''}
            disabled={!editingEnabled}
            onChange={(e) => {
              setLocal({ ...local, first_name: e.target.value || null });
              onUpdateMember(member.id, { first_name: e.target.value || null });
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Last Name">
          <input
            type="text"
            value={local.last_name ?? ''}
            disabled={!editingEnabled}
            onChange={(e) => {
              setLocal({ ...local, last_name: e.target.value || null });
              onUpdateMember(member.id, { last_name: e.target.value || null });
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Gender">
        <select
          value={local.gender ?? ''}
          disabled={!editingEnabled}
          onChange={(e) => {
            const v = e.target.value as Gender | null;
            setLocal({ ...local, gender: v || null });
            onUpdateMember(member.id, { gender: v || null });
          }}
          className={inputClass}
        >
          <option value="">Unspecified</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="nonbinary">Non-binary</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Birth Date" icon={Calendar}>
          <input
            type="date"
            value={local.birth_date ?? ''}
            disabled={!editingEnabled}
            onChange={(e) => {
              setLocal({ ...local, birth_date: e.target.value || null });
              onUpdateMember(member.id, { birth_date: e.target.value || null });
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Death Date">
          <input
            type="date"
            value={local.death_date ?? ''}
            disabled={!editingEnabled}
            onChange={(e) => {
              setLocal({ ...local, death_date: e.target.value || null });
              onUpdateMember(member.id, { death_date: e.target.value || null });
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Birth Place" icon={MapPin}>
          <input
            type="text"
            value={local.birth_place ?? ''}
            disabled={!editingEnabled}
            onChange={(e) => {
              setLocal({ ...local, birth_place: e.target.value || null });
              onUpdateMember(member.id, { birth_place: e.target.value || null });
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Death Place">
          <input
            type="text"
            value={local.death_place ?? ''}
            disabled={!editingEnabled}
            onChange={(e) => {
              setLocal({ ...local, death_place: e.target.value || null });
              onUpdateMember(member.id, { death_place: e.target.value || null });
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Biography" icon={BookOpen}>
        <textarea
          value={local.biography ?? ''}
          disabled={!editingEnabled}
          onChange={(e) => {
            setLocal({ ...local, biography: e.target.value || null });
            onUpdateMember(member.id, { biography: e.target.value || null });
          }}
          rows={3}
          placeholder="Brief biographical notes..."
          className={inputClass + ' resize-none'}
        />
      </Field>

      <Field label="Privacy Level">
        <select
          value={local.privacy_level}
          disabled={!editingEnabled}
          onChange={(e) => {
            const v = e.target.value as PrivacyLevel;
            setLocal({ ...local, privacy_level: v });
            onUpdateMember(member.id, { privacy_level: v });
          }}
          className={inputClass}
        >
          <option value="public">Public — visible to all participants</option>
          <option value="restricted">Restricted — visible to editors</option>
          <option value="private">Private — visible to owner only</option>
        </select>
      </Field>

      {relatedRels.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
            <Link2 className="w-3.5 h-3.5" /> Relationships ({relatedRels.length})
          </p>
          <div className="space-y-1.5">
            {relatedRels.map((rel) => (
              <div
                key={rel.id}
                className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-gray-700 truncate">{relName(rel)}</span>
                <span className="text-gray-400 ml-2 flex-shrink-0">
                  {REL_LABELS[rel.relationship_type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function StickyProperties({
  element,
  editingEnabled,
  onUpdateElement,
}: {
  element: CanvasElement;
  editingEnabled: boolean;
  onUpdateElement: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  const COLORS = ['#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3', '#fed7aa', '#e0e7ff'];

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-yellow-200 flex items-center justify-center">
          <span className="text-xs font-bold text-yellow-800">N</span>
        </div>
        <p className="font-semibold text-gray-900 text-sm">Sticky Note</p>
      </div>

      <Field label="Text">
        <textarea
          value={element.text}
          disabled={!editingEnabled}
          onChange={(e) => onUpdateElement(element.id, { text: e.target.value })}
          rows={4}
          className={inputClass + ' resize-none'}
        />
      </Field>

      <Field label="Color">
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              disabled={!editingEnabled}
              onClick={() => onUpdateElement(element.id, { color: c })}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${
                element.color === c ? 'border-blue-500 scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Width">
          <input
            type="number"
            value={Math.round(element.width)}
            disabled={!editingEnabled}
            onChange={(e) =>
              onUpdateElement(element.id, { width: Math.max(80, Number(e.target.value)) })
            }
            className={inputClass}
          />
        </Field>
        <Field label="Height">
          <input
            type="number"
            value={Math.round(element.height)}
            disabled={!editingEnabled}
            onChange={(e) =>
              onUpdateElement(element.id, { height: Math.max(60, Number(e.target.value)) })
            }
            className={inputClass}
          />
        </Field>
      </div>
    </>
  );
}

function TextProperties({
  element,
  editingEnabled,
  onUpdateElement,
}: {
  element: CanvasElement;
  editingEnabled: boolean;
  onUpdateElement: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-600">T</span>
        </div>
        <p className="font-semibold text-gray-900 text-sm">Text Label</p>
      </div>

      <Field label="Text">
        <input
          type="text"
          value={element.text}
          disabled={!editingEnabled}
          onChange={(e) => onUpdateElement(element.id, { text: e.target.value })}
          className={inputClass}
        />
      </Field>

      <Field label="Color">
        <input
          type="color"
          value={element.color}
          disabled={!editingEnabled}
          onChange={(e) => onUpdateElement(element.id, { color: e.target.value })}
          className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer"
        />
      </Field>
    </>
  );
}
