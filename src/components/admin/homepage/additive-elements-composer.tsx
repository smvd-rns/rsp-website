"use client";

import { Layers, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type BannerElement, getAssetById } from "@/lib/asset-registry";
import { ElementEditorDialog } from "./element-editor-dialog";

interface AdditiveElementsComposerProps {
  elements: BannerElement[];
  onChange: (elements: BannerElement[]) => void;
  disabled?: boolean;
  onTriggerReplay?: () => void;
}

export const AdditiveElementsComposer = ({
  elements,
  onChange,
  disabled = false,
  onTriggerReplay,
}: AdditiveElementsComposerProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<BannerElement | null>(
    null,
  );

  const openAddModal = () => {
    setEditingElement(null);
    setIsEditorOpen(true);
  };

  const openEditModal = (elem: BannerElement) => {
    setEditingElement(elem);
    setIsEditorOpen(true);
  };

  const handleSaveElement = (elementData: BannerElement) => {
    if (editingElement) {
      onChange(
        elements.map((el) => (el.id === elementData.id ? elementData : el)),
      );
    } else {
      onChange([...elements, elementData]);
    }
    if (onTriggerReplay) onTriggerReplay();
  };

  const handleDeleteElement = (id: string) => {
    onChange(elements.filter((el) => el.id !== id));
  };

  return (
    <div className="space-y-4 grayscale opacity-50 pointer-events-none">
      {/* Header with Quick Info & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary" />
            Layered Decorative Assets & Motion (Coming soon!)
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Add foreground or background motifs, conches, chakras, and sacred
            symbols.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openAddModal}
          disabled={disabled}
          className="text-xs h-8 gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Layer ({elements.length})
        </Button>
      </div>

      {/* Preset Quick-Load Bundles */}
      <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          Curated Atmospheric Themes
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7 bg-background"
            disabled={disabled}
            onClick={() => {
              const preset: BannerElement[] = [
                {
                  id: `flank_conch_${Date.now()}`,
                  assetId: "conch",
                  label: "Flanking Sacred Conches",
                  placement: "dual-opposite",
                  size: "md",
                  layer: "foreground",
                  opacity: 0.9,
                  enterAnimation: "float-in-left",
                  idleAnimation: "floating-bob",
                  animationDuration: 2.5,
                  animationDelay: 0.2,
                },
              ];
              onChange(preset);
              if (onTriggerReplay) onTriggerReplay();
            }}
          >
            🐚 Sacred Flank (Dual Conches)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7 bg-background"
            disabled={disabled}
            onClick={() => {
              const preset: BannerElement[] = [
                {
                  id: `chakra_${Date.now()}`,
                  assetId: "chakra",
                  label: "Sudarshana Watermark",
                  placement: "custom",
                  customPosition: { x: 50, y: 50 },
                  size: "xl",
                  layer: "background",
                  opacity: 0.25,
                  enterAnimation: "spin-in",
                  idleAnimation: "slow-spin",
                  animationDuration: 12,
                  animationDelay: 0,
                },
              ];
              onChange(preset);
              if (onTriggerReplay) onTriggerReplay();
            }}
          >
            ☸️ Sudarshana Watermark
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7 bg-background"
            disabled={disabled}
            onClick={() => {
              const preset: BannerElement[] = [
                {
                  id: `lotus_tl_${Date.now()}`,
                  assetId: "lotus",
                  label: "Golden Lotus Corner",
                  placement: "corner-top-left",
                  size: "sm",
                  layer: "foreground",
                  opacity: 0.85,
                  enterAnimation: "fade-scale",
                  idleAnimation: "floating-bob",
                  animationDuration: 3,
                  animationDelay: 0.1,
                },
                {
                  id: `feather_br_${Date.now()}`,
                  assetId: "peacock_feather",
                  label: "Peacock Feather Accent",
                  placement: "corner-top-right",
                  size: "md",
                  layer: "foreground",
                  opacity: 0.9,
                  enterAnimation: "float-in-right",
                  idleAnimation: "subtle-wavy",
                  animationDuration: 3.5,
                  animationDelay: 0.3,
                },
              ];
              onChange(preset);
              if (onTriggerReplay) onTriggerReplay();
            }}
          >
            🪷 Royal Festival Flair
          </Button>
        </div>
      </div>

      {/* Elements List */}
      {elements.length === 0 ? (
        <div className="text-center py-6 px-4 border border-dashed border-border rounded-lg bg-muted/20 space-y-2">
          <Wand2 className="w-8 h-8 text-muted-foreground/60 mx-auto" />
          <p className="text-xs font-medium text-foreground">
            No decorative layers added yet
          </p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            Layer sacred conches, spinning Sudarshana chakras, fluttering
            peacock feathers, dancing monks, or ornate vignettes over the
            banner.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={openAddModal}
            disabled={disabled}
            className="text-xs mt-1"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-primary" />
            Add First Decorative Element
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {elements.map((elem) => {
            const asset = getAssetById(elem.assetId);
            return (
              <div
                key={elem.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-muted/60 border border-border flex items-center justify-center shrink-0 p-1">
                    {asset?.assetPath ? (
                      <img
                        src={asset.assetPath}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Sparkles className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {asset?.name || elem.label || "Element"}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 capitalize"
                      >
                        {elem.placement.replace("-", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <span>
                        Enter:{" "}
                        <strong className="text-foreground">
                          {elem.enterAnimation || "none"}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Idle:{" "}
                        <strong className="text-foreground">
                          {elem.idleAnimation || "none"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => openEditModal(elem)}
                    disabled={disabled}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteElement(elem.id)}
                    disabled={disabled}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extracted Modal / Dialog for Adding/Editing Element */}
      <ElementEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        editingElement={editingElement}
        defaultDelay={elements.length * 0.2}
        onSave={handleSaveElement}
      />
    </div>
  );
};
