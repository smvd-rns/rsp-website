"use client";

import { useEffect, useState, useTransition } from "react";
import { createFaq, updateFaq } from "@/app/actions/faq-actions";
import { AdminDialogShell } from "@/components/admin/admin-dialog-shell";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

interface FaqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq?: {
    id: number;
    category_id: number;
    question: string;
    answer: string;
    order_ind: number | null;
    is_published: boolean | null;
  } | null;
  categoryId: number;
  categories: { id: number; name: string }[];
  onSuccess: () => void;
}

export const FaqDialog = ({
  open,
  onOpenChange,
  faq,
  categoryId,
  categories,
  onSuccess,
}: FaqDialogProps) => {
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (faq) {
      setSelectedCatId(String(faq.category_id));
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setIsPublished(faq.is_published ?? true);
    } else {
      setSelectedCatId(String(categoryId || ""));
      setQuestion("");
      setAnswer("");
      setIsPublished(true);
    }
  }, [faq, categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !question.trim() || !answer.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      const catId = Number(selectedCatId);
      const res = faq
        ? await updateFaq(faq.id, {
            category_id: catId,
            question,
            answer,
            is_published: isPublished,
          })
        : await createFaq({
            category_id: catId,
            question,
            answer,
            is_published: isPublished,
          });

      if (res.success) {
        toast.success(
          faq ? "FAQ updated successfully" : "FAQ created successfully",
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Something went wrong");
      }
    });
  };

  return (
    <AdminDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={faq ? "Edit FAQ Item" : "Add FAQ Item"}
      description={
        faq
          ? "Update this question and answer."
          : "Create a new frequently asked question and answer."
      }
      onSubmit={handleSubmit}
      submitText={faq ? "Save Changes" : "Create FAQ"}
      isPending={isPending}
      maxWidthClass="sm:max-w-[500px]"
    >
      <div className="grid gap-2">
        <Label htmlFor="faq-category">Category</Label>
        <Select
          value={selectedCatId}
          onValueChange={setSelectedCatId}
          disabled={isPending}
        >
          <SelectTrigger id="faq-category">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="faq-question">Question</Label>
        <Input
          id="faq-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How do I access recorded lectures?"
          disabled={isPending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="faq-answer">Answer</Label>
        <Textarea
          id="faq-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Detailed answer text..."
          rows={4}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="faq-published"
          checked={isPublished}
          onCheckedChange={(c) => setIsPublished(!!c)}
          disabled={isPending}
        />
        <Label htmlFor="faq-published" className="cursor-pointer">
          Published (visible to users)
        </Label>
      </div>
    </AdminDialogShell>
  );
};
