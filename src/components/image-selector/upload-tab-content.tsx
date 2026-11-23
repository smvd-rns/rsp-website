"use client";

import { Upload } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";

interface UploadTabContentProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadTabContent = ({ onFileChange }: UploadTabContentProps) => {
  return (
    <TabsContent
      value="upload"
      className="flex-1 flex flex-col items-center justify-center p-6 m-0"
    >
      <div className="max-w-md w-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors cursor-pointer relative">
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          accept="image/webp,image/png,image/jpeg"
          onChange={onFileChange}
        />
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="font-medium">Click to upload or drag and drop</p>
          <p className="text-sm text-muted-foreground">
            Max 1MB. We'll convert it to WebP for you.
          </p>
        </div>
      </div>
    </TabsContent>
  );
};
