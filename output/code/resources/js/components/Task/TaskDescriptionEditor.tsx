import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';

interface Props {
    content: string;
    onChange: (html: string) => void;
    canEdit: boolean;
}

const TaskDescriptionEditor = ({ content, onChange, canEdit }: Props) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            LinkExtension.configure({ openOnClick: false }),
        ],
        content: content,
        editable: canEdit,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync editor content when props change (e.g. switching tasks)
    React.useEffect(() => {
        if (editor && content !== undefined) {
            if (editor.getHTML() !== content) {
                editor.commands.setContent(content || '');
            }
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            
            {canEdit && (
                <div className="flex flex-wrap items-center gap-1 mb-2 bg-background border border-border rounded-sm p-1">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('bold') ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                        <span className="material-icons text-[16px]">format_bold</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                        <span className="material-icons text-[16px]">format_italic</span>
                    </button>
                    <div className="w-[1px] h-4 bg-border mx-1"></div>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground font-bold text-xs ${editor.isActive('heading', { level: 1 }) ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                        H1
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground font-bold text-xs ${editor.isActive('heading', { level: 2 }) ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                        H2
                    </button>
                    <div className="w-[1px] h-4 bg-border mx-1"></div>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                        <span className="material-icons text-[16px]">format_list_bulleted</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                        <span className="material-icons text-[16px]">format_list_numbered</span>
                    </button>
                    <div className="w-[1px] h-4 bg-border mx-1"></div>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('blockquote') ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                        <span className="material-icons text-[16px]">format_quote</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('codeBlock') ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                        <span className="material-icons text-[16px]">code</span>
                    </button>
                </div>
            )}
            
            <div className="w-full bg-background border border-border rounded-sm p-3 text-sm text-foreground focus-within:border-ring transition-colors min-h-[200px] overflow-y-auto prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 max-w-none">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default TaskDescriptionEditor;
