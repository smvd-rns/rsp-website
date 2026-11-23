"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Loader2, Send } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Markdown } from "tiptap-markdown";
import { Button } from "@/components/ui/button";
import type { MentionEntity } from "@/hooks/use-mention-search";
import { CustomLinkDialog } from "./custom-link-dialog";
import { MentionDialog } from "./mention-dialog";
import { QueryReplyToolbar } from "./query-reply-toolbar";

export type { MentionEntity };

export interface QueryReplyEditorRef {
  openMentionDialog: () => void;
  openLinkDialog: () => void;
}

interface QueryReplyEditorProps {
  onSend: (markdown: string) => Promise<void> | void;
  sending: boolean;
  hasAttachments?: boolean;
  placeholder?: string;
}

export const QueryReplyEditor = forwardRef<
  QueryReplyEditorRef,
  QueryReplyEditorProps
>(
  (
    {
      onSend,
      sending,
      hasAttachments = false,
      placeholder = "Type your response to the user here...",
    },
    ref,
  ) => {
    const [isEmpty, setIsEmpty] = useState(true);
    const [mentionDialogOpen, setMentionDialogOpen] = useState(false);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);

    // Tracks if mention dialog was triggered by typing '@' so dismissing it can insert literal '@'
    const openedViaAtRef = useRef(false);

    useImperativeHandle(ref, () => ({
      openMentionDialog: () => {
        openedViaAtRef.current = false;
        setMentionDialogOpen(true);
      },
      openLinkDialog: () => {
        setLinkDialogOpen(true);
      },
    }));

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [2, 3],
          },
          link: {
            openOnClick: false,
            HTMLAttributes: {
              class: "text-primary font-medium underline underline-offset-2",
            },
          },
        }),
        Markdown.configure({
          html: false,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      editorProps: {
        attributes: {
          placeholder,
          class:
            "min-h-[110px] max-h-[260px] overflow-y-auto p-3 text-sm focus:outline-none text-foreground leading-relaxed",
        },
        handleKeyDown: (_view, event) => {
          // Ctrl+Enter or Cmd+Enter to send
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            handleSend();
            return true;
          }
          // If user types '@', check whether it's preceded by whitespace or start of document
          if (event.key === "@") {
            const { selection, doc } = _view.state;
            const { from } = selection;
            const charBefore = from > 1 ? doc.textBetween(from - 1, from) : "";

            // If preceded by a non-whitespace character (e.g. typing email "contact@domain.com"),
            // allow natural literal '@' typing without intercepting or opening dialog
            if (charBefore && !/\s/.test(charBefore)) {
              return false;
            }

            event.preventDefault();
            openedViaAtRef.current = true;
            setMentionDialogOpen(true);
            return true;
          }
          return false;
        },
      },
      immediatelyRender: false,
      onUpdate: ({ editor: currentEditor }) => {
        setIsEmpty(currentEditor.getText().trim().length === 0);
      },
    });

    const handleDismissLiteralAt = useCallback(() => {
      const shouldInsert = openedViaAtRef.current;
      openedViaAtRef.current = false;
      setMentionDialogOpen(false);

      if (editor) {
        if (shouldInsert) {
          editor.chain().focus().insertContent("@").run();
        } else {
          editor.commands.focus();
        }
      }
    }, [editor]);

    const handleDismissSpaceAt = useCallback(() => {
      openedViaAtRef.current = false;
      setMentionDialogOpen(false);
      editor?.chain().focus().insertContent("@ ").run();
    }, [editor]);

    const handleCancelMention = useCallback(() => {
      openedViaAtRef.current = false;
      setMentionDialogOpen(false);
      editor?.commands.focus();
    }, [editor]);

    const handleSelectMention = useCallback(
      (entity: MentionEntity) => {
        if (!editor) return;

        openedViaAtRef.current = false;
        const label = `${entity.type === "recording" ? "Lecture" : entity.type === "category" ? "Category" : "Material"}: ${entity.name}`;

        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: "text",
              text: label,
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: entity.url,
                  },
                },
              ],
            },
            {
              type: "text",
              text: " ",
            },
          ])
          .run();

        setMentionDialogOpen(false);
      },
      [editor],
    );

    const handleInsertCustomLink = useCallback(
      (url: string, text?: string) => {
        if (!editor) return;

        const displayText = text || url;
        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: "text",
              text: displayText,
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: url,
                  },
                },
              ],
            },
            {
              type: "text",
              text: " ",
            },
          ])
          .run();
      },
      [editor],
    );

    const handleSend = useCallback(() => {
      if (!editor || sending) return;

      const storage = editor.storage as {
        markdown?: { getMarkdown?: () => string };
      };
      const markdown = storage?.markdown?.getMarkdown?.() || "";
      const trimmed = markdown.trim();
      if (!trimmed && !hasAttachments) return;

      onSend(trimmed);
      editor.commands.clearContent();
      setIsEmpty(true);
    }, [editor, sending, hasAttachments, onSend]);

    if (!editor) {
      return null;
    }

    return (
      <div className="flex flex-col border border-border rounded-lg bg-background overflow-hidden focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary transition-all">
        {/* Top Editor Toolbar */}
        <QueryReplyToolbar
          editor={editor}
          onOpenLinkDialog={() => setLinkDialogOpen(true)}
          onOpenMentionDialog={() => {
            openedViaAtRef.current = false;
            setMentionDialogOpen(true);
          }}
        />

        {/* TipTap Editable Surface */}
        <EditorContent editor={editor} />

        {/* Bottom Bar: Help hint + Send button */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 bg-muted/10 text-xs">
          <span className="text-muted-foreground text-xxs flex items-center gap-1">
            <span>Press</span>
            <kbd className="px-1 py-0.5 bg-muted rounded border border-border text-xxs font-mono">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-1 py-0.5 bg-muted rounded border border-border text-xxs font-mono">
              Enter
            </kbd>
            <span>to send</span>
          </span>

          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={sending || (isEmpty && !hasAttachments)}
            className="gap-1.5 cursor-pointer px-4 font-semibold text-xs"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Post Reply</span>
          </Button>
        </div>

        {/* Mention Dialog (Orama Search over Lectures, Categories, Materials) */}
        <MentionDialog
          open={mentionDialogOpen}
          onOpenChange={setMentionDialogOpen}
          onSelectMention={handleSelectMention}
          onDismissLiteralAt={handleDismissLiteralAt}
          onDismissSpaceAt={handleDismissSpaceAt}
          onCancel={handleCancelMention}
          isOpenViaAt={openedViaAtRef.current}
        />

        {/* Custom Link Dialog */}
        <CustomLinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          onInsertLink={handleInsertCustomLink}
        />
      </div>
    );
  },
);

QueryReplyEditor.displayName = "QueryReplyEditor";
