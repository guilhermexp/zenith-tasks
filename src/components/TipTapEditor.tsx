"use client";

import React, { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";

export type TipTapVariant = 'inline' | 'block' | 'input';
export type ToolbarVisibility = 'visible' | 'on-focus' | 'none';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;

  // Variant props
  variant?: TipTapVariant;
  toolbar?: ToolbarVisibility;

  // State props
  editable?: boolean;
  completed?: boolean;
  autoFocus?: boolean;

  // Appearance
  placeholder?: string;
  className?: string;
  minHeight?: string;

  // Behavior
  singleLine?: boolean;
  submitOnEnter?: boolean;
}

// Variant default settings
const variantDefaults = {
  inline: {
    defaultToolbar: 'on-focus' as ToolbarVisibility,
    minHeight: 'auto',
  },
  block: {
    defaultToolbar: 'visible' as ToolbarVisibility,
    minHeight: '120px',
  },
  input: {
    defaultToolbar: 'none' as ToolbarVisibility,
    minHeight: 'auto',
  },
};

// Get StarterKit configuration based on variant
const getStarterKitConfig = (variant: TipTapVariant, singleLine: boolean) => {
  if (variant === 'block') {
    return {
      heading: { levels: [1, 2, 3] as [1, 2, 3] },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    };
  }

  // inline or input variants - minimal config
  return {
    heading: false as const,
    codeBlock: false as const,
    blockquote: false as const,
    horizontalRule: false as const,
    bulletList: false as const,
    orderedList: false as const,
    listItem: false as const,
    ...(singleLine && { hardBreak: false as const }),
  };
};

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  onSave,
  onCancel,
  onBlur,
  onFocus,
  variant = 'block',
  toolbar,
  editable = true,
  completed = false,
  autoFocus = false,
  placeholder = "Comece a digitar...",
  className = "",
  minHeight,
  singleLine = false,
  submitOnEnter = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const defaults = variantDefaults[variant];
  const effectiveToolbar = toolbar ?? defaults.defaultToolbar;
  const effectiveMinHeight = minHeight ?? defaults.minHeight;

  const shouldShowToolbar =
    effectiveToolbar === 'visible' ||
    (effectiveToolbar === 'on-focus' && isFocused);

  const starterKitConfig = getStarterKitConfig(variant, singleLine);

  const editor = useEditor({
    extensions: [
      StarterKit.configure(starterKitConfig),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-400 hover:text-blue-300 underline cursor-pointer",
        },
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => {
      setIsFocused(true);
      onFocus?.();
    },
    onBlur: () => {
      setIsFocused(false);
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert max-w-none focus:outline-none text-sm",
          completed ? "line-through text-zinc-600" : "text-zinc-300",
          variant === 'inline' && "text-zinc-100",
        ),
      },
      handleKeyDown: (view, event) => {
        // Handle Enter key for singleLine or submitOnEnter
        if (event.key === 'Enter' && !event.shiftKey) {
          if (singleLine || submitOnEnter) {
            event.preventDefault();
            onSave?.();
            return true;
          }
        }
        return false;
      },
    },
  });

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && editor) {
      setTimeout(() => editor.commands.focus(), 0);
    }
  }, [autoFocus, editor]);

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Save on Cmd/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && onSave) {
        e.preventDefault();
        onSave();
      }
      // Cancel on Escape
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("keydown", handleKeyDown);

    return () => {
      editorElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, onSave, onCancel]);

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "tiptap-editor",
        `tiptap-${variant}`,
        completed && "tiptap-completed",
        isFocused && "tiptap-focused",
        className
      )}
    >
      {/* Toolbar */}
      {effectiveToolbar !== 'none' && editable && (
        <div
          className={cn(
            "tiptap-toolbar flex items-center gap-1 pb-2 mb-2 border-b border-white/10",
            "transition-all duration-200 ease-out",
            shouldShowToolbar ? "opacity-100 max-h-12" : "opacity-0 max-h-0 overflow-hidden pointer-events-none"
          )}
        >
          {/* Bold */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "p-1.5 rounded hover:bg-white/10 transition-colors",
              editor.isActive("bold")
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-500"
            )}
            type="button"
            title="Negrito (Cmd+B)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </button>

          {/* Italic */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "p-1.5 rounded hover:bg-white/10 transition-colors",
              editor.isActive("italic")
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-500"
            )}
            type="button"
            title="Itálico (Cmd+I)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-4 16h4M14 4l-4 16" />
            </svg>
          </button>

          {/* Lists - only for block variant */}
          {variant === 'block' && (
            <>
              <div className="w-px h-4 bg-white/10 mx-1" />

              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                  "p-1.5 rounded hover:bg-white/10 transition-colors",
                  editor.isActive("bulletList")
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-500"
                )}
                type="button"
                title="Lista com marcadores"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(
                  "p-1.5 rounded hover:bg-white/10 transition-colors",
                  editor.isActive("orderedList")
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-500"
                )}
                type="button"
                title="Lista numerada"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 12h18M3 20h18" />
                </svg>
              </button>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(
                  "p-1.5 rounded hover:bg-white/10 transition-colors",
                  editor.isActive("heading", { level: 2 })
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-500"
                )}
                type="button"
                title="Título"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>

              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={cn(
                  "p-1.5 rounded hover:bg-white/10 transition-colors",
                  editor.isActive("blockquote")
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-500"
                )}
                type="button"
                title="Citação"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}

      <EditorContent
        editor={editor}
        className="tiptap-content"
        style={{ minHeight: effectiveMinHeight !== 'auto' ? effectiveMinHeight : undefined }}
      />

      <style jsx global>{`
        /* Block variant styles */
        .tiptap-block .ProseMirror {
          min-height: ${effectiveMinHeight !== 'auto' ? effectiveMinHeight : '120px'};
          padding: 0.75rem;
          border-radius: 0.5rem;
          background: rgba(23, 23, 23, 0.4);
          border: 1px solid rgba(38, 38, 38, 0.5);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .tiptap-block .ProseMirror:focus {
          outline: none;
          border-color: rgba(64, 64, 64, 0.5);
          box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.1);
        }

        /* Inline variant styles */
        .tiptap-inline .ProseMirror {
          padding: 0;
          background: transparent;
          border: none;
          min-height: auto;
        }

        .tiptap-inline .ProseMirror:focus {
          outline: none;
        }

        /* Input variant styles */
        .tiptap-input .ProseMirror {
          padding: 0.5rem 0;
          background: transparent;
          border: none;
          min-height: auto;
        }

        .tiptap-input .ProseMirror:focus {
          outline: none;
        }

        /* Completed state */
        .tiptap-completed .ProseMirror,
        .tiptap-completed .ProseMirror * {
          text-decoration: line-through !important;
          color: rgb(82, 82, 82) !important;
        }

        /* Placeholder */
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgb(115, 115, 115);
          pointer-events: none;
          height: 0;
        }

        /* Typography styles */
        .tiptap-editor .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: rgb(212, 212, 212);
        }

        .tiptap-editor .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: rgb(212, 212, 212);
        }

        .tiptap-editor .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
          color: rgb(212, 212, 212);
        }

        .tiptap-editor .ProseMirror ul,
        .tiptap-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .tiptap-editor .ProseMirror ul {
          list-style-type: disc;
        }

        .tiptap-editor .ProseMirror ol {
          list-style-type: decimal;
        }

        .tiptap-editor .ProseMirror li {
          margin: 0.25rem 0;
        }

        .tiptap-editor .ProseMirror blockquote {
          border-left: 3px solid rgb(64, 64, 64);
          padding-left: 1rem;
          margin: 0.75rem 0;
          color: rgb(163, 163, 163);
          font-style: italic;
        }

        .tiptap-editor .ProseMirror code {
          background: rgba(38, 38, 38, 0.6);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          color: rgb(212, 212, 212);
          font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
        }

        .tiptap-editor .ProseMirror pre {
          background: rgba(23, 23, 23, 0.8);
          border: 1px solid rgba(38, 38, 38, 0.7);
          border-radius: 0.5rem;
          padding: 0.75rem;
          margin: 0.75rem 0;
          overflow-x: auto;
        }

        .tiptap-editor .ProseMirror pre code {
          background: none;
          padding: 0;
          color: rgb(212, 212, 212);
        }

        .tiptap-editor .ProseMirror strong {
          font-weight: 600;
        }

        .tiptap-editor .ProseMirror em {
          font-style: italic;
        }

        .tiptap-editor .ProseMirror p {
          margin: 0.25rem 0;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .tiptap-toolbar button {
            min-width: 44px;
            min-height: 44px;
            padding: 0.625rem;
          }

          .tiptap-editor .ProseMirror {
            font-size: 16px; /* Prevents iOS auto-zoom */
          }
        }
      `}</style>
    </div>
  );
};

export default TipTapEditor;
