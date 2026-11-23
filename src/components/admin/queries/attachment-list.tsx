"use client";

import {
  ExternalLink,
  FileText,
  Folder,
  Headphones,
  ImageIcon,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { categoryPath, normalizeQueryAttachments } from "@/lib/utils";
import type { QueryAttachment } from "@/types";

interface AttachmentListProps {
  attachments?: QueryAttachment[] | unknown;
}

export const AttachmentList = ({ attachments }: AttachmentListProps) => {
  const items = normalizeQueryAttachments(attachments);
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/40">
      {items.map((att, idx) => {
        const key = `${att.type}-${idx}`;

        switch (att.type) {
          case "image": {
            const driveViewUrl = `https://drive.google.com/file/d/${att.uri}/view`;
            return (
              <a
                key={key}
                href={driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-2.5 hover:bg-secondary/80 transition-colors font-normal cursor-pointer"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                  <span className="max-w-[200px] truncate text-xs">
                    {att.name}
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                </Badge>
              </a>
            );
          }

          case "pdf": {
            const drivePreviewUrl = `https://drive.google.com/file/d/${att.uri}/preview`;
            return (
              <a
                key={key}
                href={drivePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-2.5 hover:bg-secondary/80 transition-colors font-normal cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-red-500" />
                  <span className="max-w-[200px] truncate text-xs">
                    {att.name}
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                </Badge>
              </a>
            );
          }

          case "link": {
            return (
              <a
                key={key}
                href={att.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-2.5 hover:bg-muted transition-colors font-normal cursor-pointer text-primary border-primary/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="max-w-[200px] truncate text-xs">
                    {att.title || att.uri}
                  </span>
                </Badge>
              </a>
            );
          }

          case "category": {
            const catSlug = att.url_path ? categoryPath(att.url_path) : "";
            const href = catSlug ? `/content/${catSlug}` : "/content";
            return (
              <Link key={key} href={href} className="inline-flex items-center">
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-normal hover:bg-purple-500/20 transition-colors cursor-pointer"
                >
                  <Folder className="h-3.5 w-3.5" />
                  <span className="max-w-[200px] truncate text-xs">
                    Category: {att.name}
                  </span>
                </Badge>
              </Link>
            );
          }

          case "recording": {
            const catSlug = att.category_path
              ? categoryPath(att.category_path)
              : "";
            const href = `/content/${catSlug}?q=${att.id}`;
            return (
              <Link key={key} href={href} className="inline-flex items-center">
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-normal hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  <span className="max-w-[200px] truncate text-xs">
                    Lecture: {att.name}
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                </Badge>
              </Link>
            );
          }

          case "material": {
            const catSlug = att.category_path
              ? categoryPath(att.category_path)
              : "";
            const href = catSlug
              ? `/content/${catSlug}?q=${att.recording_id || ""}&m=${att.id}`
              : `/content?q=${att.recording_id || ""}&m=${att.id}`;
            return (
              <Link key={key} href={href} className="inline-flex items-center">
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-normal hover:bg-emerald-500/20 transition-colors cursor-pointer"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="max-w-[200px] truncate text-xs">
                    Material: {att.name}
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                </Badge>
              </Link>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};
