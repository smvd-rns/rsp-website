"use client";

import {
  FileText,
  Link2,
  Plus,
  RotateCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMaterials } from "@/hooks/use-materials";
import { toast } from "@/lib/toast";
import { cleanFilenameToTitle, cn, formatBytes } from "@/lib/utils";

export interface MaterialFile {
  id?: number | string;
  name: string;
  storage_key: string;
  mime_type?: string;
  size?: number;
  deleted?: boolean;
  is_generic?: boolean;
  is_link?: boolean;
  localFile?: File;
}

interface MaterialsUploadProps {
  materials: MaterialFile[];
  onChange: (
    materials: MaterialFile[] | ((prev: MaterialFile[]) => MaterialFile[]),
  ) => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
}

export const MaterialsUpload = ({
  materials,
  onChange,
  isUploading,
}: MaterialsUploadProps) => {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Form states for adding link
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);

  // Get shared pool of materials
  const { data: allMaterials = [] } = useMaterials();
  const commonMaterials = allMaterials.filter((m) => m.is_generic);
  const uniqueCommonMaterials = Array.from(
    new Map(commonMaterials.map((m) => [m.uri, m])).values(),
  );

  const addFiles = (files: File[]) => {
    if (!files || files.length === 0) return;

    const newMaterials: MaterialFile[] = files.map((file) => ({
      name: cleanFilenameToTitle(file.name),
      storage_key: "",
      mime_type: file.type || "application/octet-stream",
      size: file.size,
      is_generic: false,
      deleted: false,
      localFile: file,
    }));

    onChange([...safeMaterials, ...newMaterials]);
    toast.success(
      `Added ${files.length} material file(s) locally. Uploads when you submit.`,
    );
  };

  const handleMaterialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFiles(Array.from(files));
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleNameChange = (idx: number, newName: string) => {
    onChange(
      safeMaterials.map((m, i) => (i === idx ? { ...m, name: newName } : m)),
    );
  };

  const handleToggleGeneric = (idx: number, checked: boolean) => {
    onChange(
      safeMaterials.map((m, i) =>
        i === idx ? { ...m, is_generic: checked } : m,
      ),
    );
  };

  const handleDelete = (idx: number) => {
    const mat = safeMaterials[idx];
    if (!mat) return;

    if (mat.localFile || !mat.id) {
      // Local or unsaved item: immediately remove completely from the list
      onChange(safeMaterials.filter((_, i) => i !== idx));
      toast.info(`Removed "${mat.name || "material"}"`);
    } else {
      // Existing persisted item: mark for deletion on submit
      onChange(
        safeMaterials.map((m, i) => (i === idx ? { ...m, deleted: true } : m)),
      );
      toast.info(
        `Marked "${mat.name}" for deletion. Click Update/Save to apply.`,
      );
    }
  };

  const handleRecycle = (idx: number) => {
    const mat = safeMaterials[idx];
    onChange(
      safeMaterials.map((m, i) => (i === idx ? { ...m, deleted: false } : m)),
    );
    if (mat) {
      toast.success(`Restored "${mat.name}"`);
    }
  };

  const handleAddLink = () => {
    if (!linkName || !linkUrl) {
      toast.error("Please fill in both fields");
      return;
    }
    if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    const newMat: MaterialFile = {
      name: linkName,
      storage_key: linkUrl,
      is_link: true,
      is_generic: false,
      deleted: false,
    };
    onChange([...safeMaterials, newMat]);
    setLinkName("");
    setLinkUrl("");
    setShowAddLinkForm(false);
    toast.success("Link added!");
  };

  const handleAttachCommonMaterial = (uri: string) => {
    const original = commonMaterials.find((m) => m.uri === uri);
    if (!original) return;

    const exists = safeMaterials.some(
      (m) => m.storage_key === uri && !m.deleted,
    );
    if (exists) {
      toast.error("This material is already attached.");
      return;
    }

    const newMat: MaterialFile = {
      name: original.name,
      storage_key: original.uri,
      mime_type: original.type || undefined,
      is_generic: true,
      deleted: false,
    };
    onChange([...safeMaterials, newMat]);
    toast.success(`Attached "${original.name}"!`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Drag & Drop Dropzone Area */}
      <button
        type="button"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "w-full group relative flex flex-col items-center justify-center p-6 sm:p-7 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 text-center select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/50",
          isDraggingOver
            ? "border-emerald-500 bg-emerald-500/15 scale-[1.008] ring-4 ring-emerald-500/20"
            : "border-emerald-500/35 hover:border-emerald-500/70 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]",
        )}
      >
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform border shadow-2xs",
            isDraggingOver
              ? "bg-emerald-500 text-white scale-110 border-emerald-600 shadow-md shadow-emerald-500/25"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 group-hover:scale-105",
          )}
        >
          <UploadCloud className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">
            {isDraggingOver
              ? "Drop study material files here..."
              : "Drag & drop study materials or notes here, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Attach PDF lecture notes, Word documents, presentation slides, or
            reference material. Files will be uploaded to Google Drive upon form
            submission.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
            PDF
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
            PPT / PPTX
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
            DOC / DOCX
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
            TXT
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
            Images
          </span>
        </div>
      </button>

      <Input
        ref={fileInputRef}
        id="material-upload"
        type="file"
        multiple
        className="hidden"
        onChange={handleMaterialUpload}
        disabled={isUploading}
      />

      {/* 2. Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-9 px-3.5 rounded-xl border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer shadow-2xs"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          <span>Upload Files</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddLinkForm(true)}
          className="h-9 px-3.5 rounded-xl border-sky-500/30 hover:border-sky-500/60 bg-sky-500/10 hover:bg-sky-500/15 text-sky-700 dark:text-sky-300 text-xs font-semibold cursor-pointer shadow-2xs"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Link
        </Button>

        <div className="w-56">
          <Select
            disabled={uniqueCommonMaterials.length === 0}
            onValueChange={handleAttachCommonMaterial}
          >
            <SelectTrigger
              id="attach-shared-pool-trigger"
              className="h-9 rounded-xl border-border/80 text-xs font-medium bg-background shadow-2xs"
            >
              <SelectValue
                placeholder={
                  uniqueCommonMaterials.length > 0
                    ? "Attach shared pool..."
                    : "No shared materials yet"
                }
              />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/80 shadow-lg">
              {uniqueCommonMaterials.map((m) => (
                <SelectItem key={m.uri} value={m.uri} className="text-xs">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Link inputs panel */}
      {showAddLinkForm && (
        <div className="p-4 border border-sky-500/30 bg-sky-500/[0.04] rounded-2xl space-y-3 shadow-xs">
          <h4 className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            <span>Add Web Link Material</span>
          </h4>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <Label htmlFor="link-name" className="text-xs font-medium">
                Name
              </Label>
              <Input
                id="link-name"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="e.g. Reference Presentation Slides"
                className="h-9 mt-1 bg-background text-xs"
              />
            </div>
            <div>
              <Label htmlFor="link-url" className="text-xs font-medium">
                URL
              </Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/slides.pdf"
                className="h-9 mt-1 bg-background text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddLinkForm(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              id="save-link-btn"
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddLink}
              className="h-8 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
            >
              Save Link
            </Button>
          </div>
        </div>
      )}

      {/* 4. Attached Materials List */}
      {safeMaterials.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Attached Materials (
              {safeMaterials.filter((m) => !m.deleted).length})
            </span>
          </div>
          <div className="grid gap-3">
            {safeMaterials.map((mat, idx) => {
              const isDeleted = mat.deleted;
              const isLink = mat.is_link || mat.storage_key.startsWith("http");
              return (
                <div
                  key={mat.id || `mat-${mat.storage_key || mat.name}-${idx}`}
                  className={`flex flex-col gap-2 rounded-2xl border p-3.5 transition-all shadow-2xs ${
                    isDeleted
                      ? "border-destructive/40 bg-destructive/5 text-muted-foreground"
                      : "border-border/80 bg-card hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isLink ? (
                      <div
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs",
                          isDeleted
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
                        )}
                      >
                        <Link2 className="h-4 w-4" />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs",
                          isDeleted
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                        )}
                      >
                        <FileText className="h-4 w-4" />
                      </div>
                    )}
                    <Input
                      value={mat.name}
                      onChange={(e) => handleNameChange(idx, e.target.value)}
                      disabled={isDeleted}
                      placeholder="Material name"
                      className={`h-9 flex-1 rounded-xl bg-background border-border/80 text-xs font-medium ${
                        isDeleted
                          ? "line-through opacity-60 cursor-not-allowed bg-muted/50"
                          : ""
                      }`}
                    />
                    {isDeleted ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecycle(idx)}
                        className="h-8 gap-1.5 rounded-xl border-border hover:bg-muted text-xs font-semibold cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(idx)}
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                        title="Delete material"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {isDeleted ? (
                    <div className="flex items-center gap-2 pl-11 text-[11px] text-destructive font-medium">
                      <span>
                        Marked for removal — will be permanently deleted from
                        database & Drive upon saving.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pl-11 mt-1">
                      <Checkbox
                        id={`generic-${idx}`}
                        checked={mat.is_generic || false}
                        onCheckedChange={(checked) =>
                          handleToggleGeneric(idx, !!checked)
                        }
                        disabled={
                          isDeleted ||
                          isLink ||
                          uniqueCommonMaterials.some(
                            (m) => m.uri === mat.storage_key,
                          )
                        }
                      />
                      <Label
                        htmlFor={`generic-${idx}`}
                        className="text-xs text-muted-foreground cursor-pointer select-none"
                      >
                        Save to Shared Pool
                      </Label>
                      {mat.localFile ? (
                        <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                          Local ({formatBytes(mat.size || 0)})
                        </span>
                      ) : isLink ? (
                        <span className="ml-auto text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-semibold">
                          Link
                        </span>
                      ) : (
                        <span className="ml-auto text-[10px] bg-muted text-muted-foreground border border-border/60 px-2 py-0.5 rounded-full font-semibold">
                          Drive Attached
                        </span>
                      )}
                      {mat.is_generic && !isLink && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-semibold">
                          Shared
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
