import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value, onChange,
  placeholder = 'Write something...',
  minHeight = '120px',
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onContentError: ({ error }) => {
      console.error('[RichTextEditor] content parse error:', error);
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    try {
      if (value !== editor.getHTML()) {
        editor.commands.setContent(value || '', { emitUpdate: false });
      }
    } catch (err) {
      console.error('[RichTextEditor] setContent threw:', err);
    }
  }, [editor, value]);

  if (!editor) return null;

  const Btn = ({ onClick, active, children }: {
    onClick: () => void; active?: boolean; children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        'p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
        active && 'bg-accent text-foreground'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn(
      'border border-input rounded-md bg-background text-sm',
      disabled && 'opacity-50 pointer-events-none'
    )}>
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-input">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Btn>
        <div className="w-px h-3.5 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Btn>
      </div>
      <EditorContent
        editor={editor}
        className="px-3 py-2 prose prose-sm prose-invert max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5"
        style={{ minHeight }}
      />
    </div>
  );
}
