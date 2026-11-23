import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as queryActions from "@/app/actions/query-actions";
import { createQueryWrapper } from "@/test-utils";
import type { QueryReplyWithUser, UserQueryWithUser } from "@/types";
import { AttachmentList } from "./attachment-list";
import { QueriesClient } from "./queries-client";
import { QueryDetailClient } from "./query-detail-client";

vi.mock("./query-reply-editor", () => ({
  QueryReplyEditor: ({
    onSend,
    sending,
    hasAttachments = false,
    placeholder = "Type your response to the user here...",
  }: {
    onSend: (val: string) => void;
    sending: boolean;
    hasAttachments?: boolean;
    placeholder?: string;
  }) => {
    const [val, setVal] = useState("");
    return (
      <div>
        <textarea
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button
          type="button"
          disabled={sending || (!val.trim() && !hasAttachments)}
          onClick={() => {
            onSend(val);
            setVal("");
          }}
        >
          Post Reply
        </button>
      </div>
    );
  },
}));

describe("QueriesClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockQueries: UserQueryWithUser[] = [
    {
      id: "q-1",
      subject: "Audio not playing",
      message: "I cannot play audio on mobile",
      status: "open",
      category: "technical",
      guest_name: "Guest User",
      guest_email: "guest@example.com",
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: null,
      users: null,
    },
    {
      id: "q-2",
      subject: "Another audio issue",
      message: "Volume is too low",
      status: "open",
      category: "technical",
      guest_name: null,
      guest_email: null,
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: "u-1",
      users: {
        email: "user@example.com",
        name: "Alice",
      },
    },
  ];

  it("renders open queries and searches", () => {
    render(<QueriesClient queries={mockQueries} />, {
      wrapper: createQueryWrapper(),
    });

    expect(screen.getByText("Audio not playing")).toBeDefined();
    expect(screen.getByText("Another audio issue")).toBeDefined();

    const searchInput = screen.getByPlaceholderText(
      "Search subject, name, email...",
    );
    fireEvent.change(searchInput, { target: { value: "playing" } });

    expect(screen.getByText("Audio not playing")).toBeDefined();
  });

  it("renders closed queries when provided", () => {
    const closedQueries: UserQueryWithUser[] = [
      {
        id: "q-3",
        subject: "Content question",
        message: "Where can I find chapter 2?",
        status: "closed",
        category: "content",
        guest_name: null,
        guest_email: null,
        attachments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "u-1",
        users: {
          email: "user@example.com",
          name: "Alice",
        },
      },
    ];

    render(<QueriesClient queries={closedQueries} />, {
      wrapper: createQueryWrapper(),
    });

    expect(screen.getByText(/no support tickets match/i)).toBeDefined();
  });

  it("automatically opens closed tab and displays ticket when deep linked to closed query", () => {
    const mixedQueries: UserQueryWithUser[] = [
      {
        id: "q-open",
        subject: "Open query subject",
        message: "Need help",
        status: "open",
        category: "technical_issue",
        guest_name: "Guest",
        guest_email: "guest@example.com",
        attachments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: null,
        users: null,
      },
      {
        id: "q-closed",
        subject: "Closed query subject",
        message: "Resolved inquiry",
        status: "closed",
        category: "content_feedback",
        guest_name: "Devotee",
        guest_email: "devotee@example.com",
        attachments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: null,
        users: null,
      },
    ];

    render(
      <QueriesClient queries={mixedQueries} initialSelectedId="q-closed" />,
      {
        wrapper: createQueryWrapper(),
      },
    );

    expect(screen.getByText("Closed query subject")).toBeDefined();
  });
});

describe("ForwardQueryDialog", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockQuery: UserQueryWithUser = {
    id: "q-fwd",
    subject: "Help with initiation",
    message: "What are the four regulative principles?",
    status: "open",
    category: "spiritual_query",
    guest_name: "Seeker",
    guest_email: "seeker@example.com",
    attachments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: null,
    users: null,
  };

  it("renders recipient input and forwards query via email", async () => {
    const forwardSpy = vi
      .spyOn(queryActions, "forwardQueryEmailAction")
      .mockResolvedValue({
        success: true,
      });

    const { ForwardQueryDialog } = await import("./forward-query-dialog");

    render(
      <ForwardQueryDialog
        query={mockQuery}
        open={true}
        onOpenChange={vi.fn()}
      />,
      {
        wrapper: createQueryWrapper(),
      },
    );

    expect(screen.getByText(/Forward Query via Email/i)).toBeDefined();
    expect(screen.getAllByText(/seeker@example.com/i).length).toBeGreaterThan(
      0,
    );

    const recipientInput = screen.getByLabelText(/Recipient Email Address/i);
    fireEvent.change(recipientInput, {
      target: { value: "counselor@iskcon.org" },
    });

    const noteInput = screen.getByLabelText(/Administrator Note/i);
    fireEvent.change(noteInput, {
      target: { value: "Please respond to this question." },
    });

    const submitBtn = screen.getByRole("button", { name: /forward email/i });
    fireEvent.click(submitBtn);

    expect(forwardSpy).toHaveBeenCalledWith({
      query: mockQuery,
      recipientEmails: ["counselor@iskcon.org"],
      note: "Please respond to this question.",
    });
  });
});

describe("QueryDetailClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockQuery: UserQueryWithUser = {
    id: "q-10",
    subject: "Missing recording link",
    message: "The link on lecture 5 is broken.",
    status: "in_progress",
    category: "content",
    guest_name: null,
    guest_email: null,
    attachments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "u-2",
    users: {
      email: "student@example.com",
      name: "Student",
    },
  };

  const mockReplies: QueryReplyWithUser[] = [
    {
      id: "r-1",
      query_id: "q-10",
      message: "We are fixing the link now.",
      attachments: [],
      user_id: "admin-1",
      updated_at: new Date().toISOString(),
      users: {
        email: "admin@example.com",
        name: "Admin",
      },
    },
  ];

  it("renders query details and message list", () => {
    render(<QueryDetailClient query={mockQuery} replies={mockReplies} />, {
      wrapper: createQueryWrapper(),
    });

    expect(screen.getByText("Missing recording link")).toBeDefined();
    expect(screen.getByText("The link on lecture 5 is broken.")).toBeDefined();
    expect(screen.getByText("We are fixing the link now.")).toBeDefined();
  });

  it("renders forwarding history when present on query", () => {
    const queryWithForwardHistory: UserQueryWithUser = {
      ...mockQuery,
      forward_history: [
        {
          forwarded_by: "admin-1",
          forwarded_by_name: "Admin Prabhu",
          forwarded_by_email: "admin@example.com",
          forwarded_to: ["counselor@example.com"],
          forwarded_at: new Date().toISOString(),
          note: "Please follow up with student",
        },
      ],
    };

    render(
      <QueryDetailClient
        query={queryWithForwardHistory}
        replies={mockReplies}
      />,
      {
        wrapper: createQueryWrapper(),
      },
    );

    const badge = screen.getByText(/Forwarded 1 time/i);
    expect(badge).toBeDefined();

    // Click/hover badge to reveal popover details
    fireEvent.click(badge);

    expect(screen.getByText(/Forwarding History \(1\)/i)).toBeDefined();
    expect(screen.getByText("Admin Prabhu")).toBeDefined();
    expect(screen.getByText("counselor@example.com")).toBeDefined();
    expect(screen.getByText("Please follow up with student")).toBeDefined();
  });

  it("allows submitting a reply", async () => {
    vi.spyOn(queryActions, "createQueryReply").mockResolvedValue({
      success: true,
    } as any);

    render(<QueryDetailClient query={mockQuery} replies={mockReplies} />, {
      wrapper: createQueryWrapper(),
    });

    const replyTextarea = screen.getByPlaceholderText(
      "Type your response to the user here...",
    );
    fireEvent.change(replyTextarea, {
      target: { value: "Link has been fixed!" },
    });

    const sendBtn = screen.getByRole("button", { name: /post reply/i });
    fireEvent.click(sendBtn);

    expect(queryActions.createQueryReply).toHaveBeenCalledWith(
      "q-10",
      "Link has been fixed!",
      [],
      "in_progress",
    );
  });
});

describe("TipTap mention and link insertion", () => {
  it("inserts mention as a link and serializes to markdown", async () => {
    const { Editor } = await import("@tiptap/core");
    const StarterKit = (await import("@tiptap/starter-kit")).default;
    const { Markdown } = await import("tiptap-markdown");

    const editor = new Editor({
      extensions: [
        StarterKit.configure({
          link: {
            openOnClick: false,
          },
        }),
        Markdown.configure({
          html: false,
        }),
      ],
    });

    const entity = {
      name: "Gita Chapter 1",
      type: "category",
      url: "/content/gita-chapter-1",
    };
    const label = `Category: ${entity.name}`;

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
              attrs: { href: entity.url },
            },
          ],
        },
        {
          type: "text",
          text: " ",
        },
      ])
      .run();

    const html = editor.getHTML();
    expect(html).toContain('href="/content/gita-chapter-1"');
    expect(html).toContain("Category: Gita Chapter 1");

    const storage = editor.storage as {
      markdown?: { getMarkdown?: () => string };
    };
    const md = storage?.markdown?.getMarkdown?.() || "";
    expect(md).toContain("[Category: Gita Chapter 1](/content/gita-chapter-1)");
  });

  describe("AttachmentList", () => {
    it("renders nothing when attachments is empty or null", () => {
      const { container: c1 } = render(<AttachmentList attachments={[]} />);
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(<AttachmentList attachments={null} />);
      expect(c2.firstChild).toBeNull();

      const { container: c3 } = render(<AttachmentList attachments="" />);
      expect(c3.firstChild).toBeNull();
    });

    it("renders image and link attachments from array", () => {
      render(
        <AttachmentList
          attachments={[
            {
              type: "image",
              name: "radha.png",
              uri: "drive-img-1",
              mime_type: "image/png",
            },
            {
              type: "link",
              title: "ISKCON News",
              uri: "https://iskconnews.org",
            },
          ]}
        />,
      );

      expect(screen.getByText("radha.png")).toBeDefined();
      expect(screen.getByText("ISKCON News")).toBeDefined();
    });

    it("renders attachments when passed as a JSON string", () => {
      const jsonStr = JSON.stringify([
        {
          type: "pdf",
          name: "handbook.pdf",
          uri: "drive-pdf-1",
          mime_type: "application/pdf",
        },
      ]);

      render(<AttachmentList attachments={jsonStr} />);
      expect(screen.getByText("handbook.pdf")).toBeDefined();
    });
  });
});
