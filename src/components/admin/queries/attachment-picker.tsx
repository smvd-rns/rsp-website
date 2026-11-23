import {
  AlertTriangle,
  FileText,
  Folder,
  Globe,
  Headphones,
  ImageIcon,
  Loader2,
  Paperclip,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadQueryAttachmentToDrive } from "@/lib/drive-upload";
import { toast } from "@/lib/toast";
import type { QueryAttachment } from "@/types";

interface AttachmentPickerProps {
  attachments: QueryAttachment[];
  onChange: (attachments: QueryAttachment[]) => void;
  disabled?: boolean;
  onTriggerMention?: () => void;
  onTriggerLink?: () => void;
}

export const AttachmentPicker = ({
  attachments,
  onChange,
  disabled = false,
  onTriggerMention,
  onTriggerLink,
}: AttachmentPickerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be selected again if needed
    e.target.value = "";

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      toast.error("Only images and PDF documents are allowed as attachments.");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uri = await uploadQueryAttachmentToDrive(file, (percent) => {
        setUploadProgress(percent);
      });

      const newAttachment: QueryAttachment = isImage
        ? {
            type: "image",
            name: file.name,
            uri,
            mime_type: file.type,
            size: file.size,
          }
        : {
            type: "pdf",
            name: file.name,
            uri,
            mime_type: file.type,
            size: file.size,
          };

      onChange([...attachments, newAttachment]);
      toast.success(`${file.name} uploaded successfully!`);
    } catch (err) {
      console.error("Failed to upload query attachment:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to upload file to Google Drive.",
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    onChange(attachments.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileUpload}
        disabled={disabled || uploading}
      />

      {/* Action Buttons Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          <span>Attach File (Image / PDF)</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs cursor-pointer"
          onClick={onTriggerLink}
          disabled={disabled || uploading}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Add Link</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs cursor-pointer"
          onClick={onTriggerMention}
          disabled={disabled || uploading}
        >
          <Headphones className="h-3.5 w-3.5" />
          <span>Reference Lecture / Content</span>
        </Button>
      </div>

      {/* Public accessibility warning for uploaded files */}
      <p className="text-xxs text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        <span>
          Note: Uploaded files will be publicly accessible via direct link.
        </span>
      </p>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="space-y-1 py-1 max-w-sm">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading to Google Drive...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      {/* Pending Attachments Badges */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {attachments.map((att, idx) => {
            let icon = <Paperclip className="h-3.5 w-3.5" />;
            let label = "";

            switch (att.type) {
              case "image":
                icon = <ImageIcon className="h-3.5 w-3.5 text-blue-500" />;
                label = att.name;
                break;
              case "pdf":
                icon = <FileText className="h-3.5 w-3.5 text-red-500" />;
                label = att.name;
                break;
              case "link":
                icon = <Globe className="h-3.5 w-3.5 text-emerald-500" />;
                label = att.title || att.uri;
                break;
              case "recording":
                icon = <Headphones className="h-3.5 w-3.5 text-amber-500" />;
                label = `Lecture: ${att.name}`;
                break;
              case "category":
                icon = <Folder className="h-3.5 w-3.5 text-purple-500" />;
                label = `Category: ${att.name}`;
                break;
              case "material":
                icon = <Paperclip className="h-3.5 w-3.5 text-cyan-500" />;
                label = `Material: ${att.name}`;
                break;
              default:
                break;
            }

            return (
              <Badge
                // biome-ignore lint/suspicious/noArrayIndexKey: attachments can have duplicate types without unique IDs
                key={`${att.type}-${idx}`}
                variant="secondary"
                className="gap-1.5 py-1 px-2.5 font-normal flex items-center pr-1.5"
              >
                {icon}
                <span className="max-w-[180px] truncate text-xs">{label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  disabled={disabled || uploading}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove</span>
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
