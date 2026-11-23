import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as faqActions from "@/app/actions/faq-actions";
import { createQueryWrapper } from "@/test-utils";
import { FaqCategoryDialog } from "./faq-category-dialog";
import { FaqDialog } from "./faq-dialog";
import { FaqsClient } from "./faqs-client";

describe("FaqCategoryDialog", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders create category dialog and submits", async () => {
    vi.spyOn(faqActions, "createFaqCategory").mockResolvedValue({
      success: true,
    } as any);
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <FaqCategoryDialog
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText("Add FAQ Category")).toBeDefined();

    const nameInput = screen.getByPlaceholderText("e.g. General Information");
    fireEvent.change(nameInput, { target: { value: "General" } });

    const submitBtn = screen.getByRole("button", { name: "Create Category" });
    fireEvent.click(submitBtn);

    expect(faqActions.createFaqCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "General",
        slug: "general",
      }),
    );
  });

  it("renders edit category dialog with existing values", async () => {
    vi.spyOn(faqActions, "updateFaqCategory").mockResolvedValue({
      success: true,
    } as any);
    const onSuccess = vi.fn();

    render(
      <FaqCategoryDialog
        open={true}
        onOpenChange={vi.fn()}
        category={{
          id: 5,
          name: "Audio",
          slug: "audio",
          order_ind: 1,
        }}
        onSuccess={onSuccess}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText("Edit FAQ Category")).toBeDefined();

    const nameInput = screen.getByDisplayValue("Audio");
    fireEvent.change(nameInput, { target: { value: "Updated Audio" } });

    const submitBtn = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitBtn);

    expect(faqActions.updateFaqCategory).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        name: "Updated Audio",
      }),
    );
  });
});

describe("FaqDialog", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const categories = [
    { id: 1, name: "General", slug: "general", order_ind: 1 },
    { id: 2, name: "Technical", slug: "technical", order_ind: 2 },
  ];

  it("renders create FAQ dialog and submits", async () => {
    vi.spyOn(faqActions, "createFaq").mockResolvedValue({
      success: true,
    } as any);
    const onSuccess = vi.fn();

    render(
      <FaqDialog
        open={true}
        onOpenChange={vi.fn()}
        categoryId={1}
        categories={categories}
        onSuccess={onSuccess}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText("Add FAQ Item")).toBeDefined();

    const qInput = screen.getByPlaceholderText(
      "e.g. How do I access recorded lectures?",
    );
    fireEvent.change(qInput, { target: { value: "How do I download?" } });

    const aInput = screen.getByPlaceholderText("Detailed answer text...");
    fireEvent.change(aInput, {
      target: { value: "Click the download button." },
    });

    const submitBtn = screen.getByRole("button", { name: "Create FAQ" });
    fireEvent.click(submitBtn);

    expect(faqActions.createFaq).toHaveBeenCalledWith(
      expect.objectContaining({
        category_id: 1,
        question: "How do I download?",
        answer: "Click the download button.",
      }),
    );
  });

  it("renders edit FAQ dialog and updates", async () => {
    vi.spyOn(faqActions, "updateFaq").mockResolvedValue({
      success: true,
    } as any);
    const onSuccess = vi.fn();

    const existingFaq = {
      id: 42,
      category_id: 1,
      question: "Original Question",
      answer: "Original Answer",
      order_ind: 1,
      is_published: true,
      created_at: null,
      updated_at: null,
    };

    render(
      <FaqDialog
        open={true}
        onOpenChange={vi.fn()}
        faq={existingFaq}
        categoryId={1}
        categories={categories}
        onSuccess={onSuccess}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText("Edit FAQ Item")).toBeDefined();

    const qInput = screen.getByDisplayValue("Original Question");
    fireEvent.change(qInput, { target: { value: "Updated Question" } });

    const submitBtn = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitBtn);

    expect(faqActions.updateFaq).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        question: "Updated Question",
      }),
    );
  });
});

describe("FaqsClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockCategories = [
    {
      id: 1,
      name: "General Questions",
      slug: "general",
      order_ind: 1,
      created_at: null,
      updated_at: null,
    },
  ];

  const mockFaqs = [
    {
      id: 10,
      category_id: 1,
      question: "What is this service?",
      answer: "This is a digital library.",
      order_ind: 1,
      is_published: true,
      created_at: null,
      updated_at: null,
    },
  ];

  it("renders categories and FAQs list", () => {
    render(<FaqsClient categories={mockCategories} faqs={mockFaqs} />, {
      wrapper: createQueryWrapper(),
    });

    expect(screen.getAllByText("General Questions")[0]).toBeDefined();
    expect(screen.getByText("What is this service?")).toBeDefined();
    expect(screen.getByText("This is a digital library.")).toBeDefined();
  });

  it("shows empty state when no categories exist", () => {
    render(<FaqsClient categories={[]} faqs={[]} />, {
      wrapper: createQueryWrapper(),
    });

    expect(screen.getByText("No categories found")).toBeDefined();
  });
});
