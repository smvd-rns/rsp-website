"use client";

import type { Editor } from "@tiptap/react";
import {
  AtSign,
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryReplyToolbarProps {
  editor: Editor;
  onOpenLinkDialog: () => void;
  onOpenMentionDialog: () => void;
}

export const QueryReplyToolbar = ({
  editor,
  onOpenLinkDialog,
  onOpenMentionDialog,
}: QueryReplyToolbarProps) => {
  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isStrike = editor.isActive("strike");
  const isHeading2 = editor.isActive("heading", { level: 2 });
  const isHeading3 = editor.isActive("heading", { level: 3 });
  const isBulletList = editor.isActive("bulletList");
  const isOrderedList = editor.isActive("orderedList");
  const isBlockquote = editor.isActive("blockquote");
  const isCodeBlock = editor.isActive("codeBlock");

  return (
    <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-border/50 bg-muted/20 text-muted-foreground">
      <Button
        type="button"
        variant={isBold ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant={isItalic ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant={isStrike ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      <Button
        type="button"
        variant={isHeading2 ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant={isHeading3 ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Heading 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      <Button
        type="button"
        variant={isBulletList ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant={isOrderedList ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Ordered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant={isBlockquote ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Quote"
      >
        <Quote className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant={isCodeBlock ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Code Block"
      >
        <Code className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      {/* Link Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onOpenLinkDialog}
        className="h-7 w-7 p-0 cursor-pointer"
        title="Insert Link"
      >
        <Link2 className="h-3.5 w-3.5" />
      </Button>

      {/* Mention Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onOpenMentionDialog}
        className="h-7 px-2 gap-1.5 cursor-pointer text-xs font-semibold text-primary hover:text-primary"
        title="Mention & Attach Content (@)"
      >
        <AtSign className="h-3.5 w-3.5" />
        <span>Mention</span>
      </Button>
    </div>
  );
};
