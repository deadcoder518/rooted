import {
  MousePointer2,
  Hand,
  Pen,
  Highlighter,
  Eraser,
  Type,
  StickyNote,
  GitBranch,
  UserPlus,
} from 'lucide-react';

export type Tool =
  | 'select'
  | 'pan'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'text'
  | 'sticky'
  | 'connect'
  | 'addPerson';

interface ToolbarProps {
  tool: Tool;
  setTool: (t: Tool) => void;
  editingEnabled: boolean;
}

const TOOLS: { id: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { id: 'addPerson', icon: UserPlus, label: 'Add Person', shortcut: 'P' },
  { id: 'connect', icon: GitBranch, label: 'Connect', shortcut: 'C' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'sticky', icon: StickyNote, label: 'Sticky Note', shortcut: 'N' },
  { id: 'pen', icon: Pen, label: 'Pen', shortcut: 'D' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlighter', shortcut: 'L' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
];

export default function Toolbar({ tool, setTool, editingEnabled }: ToolbarProps) {
  const disabled = !editingEnabled;
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-0.5">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const isActive = tool === t.id;
        const isDisabled = disabled && t.id !== 'select' && t.id !== 'pan';
        return (
          <button
            key={t.id}
            onClick={() => !isDisabled && setTool(t.id)}
            disabled={isDisabled}
            title={`${t.label} (${t.shortcut})`}
            className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              isActive
                ? 'bg-blue-600 text-white'
                : isDisabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-30">
              {t.label} <span className="text-gray-400 ml-1">{t.shortcut}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
