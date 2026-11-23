import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as featureFlagActions from "@/app/actions/feature-flag-actions";
import * as featureFlagsHook from "@/hooks/use-feature-flags";
import * as rolesHook from "@/hooks/use-roles";
import { FeatureFlagsClient } from "./feature-flags-client";
import { FlagDialog } from "./flag-dialog";

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    triggerSync: vi.fn(),
  };
});

describe("FeatureFlagsClient & FlagDialog", () => {
  const mockFlags = [
    {
      id: "youtube_marquee",
      name: "YouTube Marquee",
      description: "Infinite scrolling video showcase",
      is_enabled: true,
      is_ga: true,
      allowed_roles: [],
      allowed_emails: [],
      updated_at: null,
    },
    {
      id: "beta_feature",
      name: "Beta Feature",
      description: "Targeted feature",
      is_enabled: false,
      is_ga: false,
      allowed_roles: [1],
      allowed_emails: ["tester@example.com"],
      updated_at: null,
    },
  ];

  const mockRoles = [
    { id: 1, name: "Admin" },
    { id: 2, name: "Editor" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(featureFlagsHook, "useFeatureFlags").mockReturnValue({
      data: mockFlags,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(rolesHook, "useRoles").mockReturnValue({
      data: mockRoles,
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders feature flags list with status and targeting", () => {
    render(<FeatureFlagsClient />);
    expect(screen.getByText("Feature Flags")).toBeDefined();
    expect(screen.getByText("YouTube Marquee")).toBeDefined();
    expect(screen.getByText("youtube_marquee")).toBeDefined();
    expect(screen.getByText("General Availability (All Users)")).toBeDefined();
    expect(screen.getByText("Beta Feature")).toBeDefined();
    expect(screen.getByText("Targeted Rollout")).toBeDefined();
  });

  it("toggles feature flag when switch checkbox is clicked", async () => {
    const toggleSpy = vi
      .spyOn(featureFlagActions, "toggleFeatureFlag")
      .mockResolvedValue({ success: true } as any);

    render(<FeatureFlagsClient />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(toggleSpy).toHaveBeenCalledWith("youtube_marquee", false);
  });

  it("opens flag dialog for editing and saving changes", async () => {
    const updateSpy = vi
      .spyOn(featureFlagActions, "updateFeatureFlag")
      .mockResolvedValue({ success: true } as any);

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <FlagDialog
        open={true}
        onOpenChange={onOpenChange}
        flag={mockFlags[0]}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText("Edit Feature Flag")).toBeDefined();
    const nameInput = screen.getByDisplayValue("YouTube Marquee");
    fireEvent.change(nameInput, {
      target: { value: "YouTube Marquee Updated" },
    });

    const submitBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        "youtube_marquee",
        expect.objectContaining({
          name: "YouTube Marquee Updated",
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("creates a new flag from empty dialog", async () => {
    const createSpy = vi
      .spyOn(featureFlagActions, "createFeatureFlag")
      .mockResolvedValue({ success: true } as any);

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <FlagDialog
        open={true}
        onOpenChange={onOpenChange}
        flag={null}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText("New Feature Flag")).toBeDefined();
    const keyInput = screen.getByPlaceholderText(/e\.g\. youtube_marquee/i);
    fireEvent.change(keyInput, { target: { value: "video_hub" } });

    const nameInput = screen.getByPlaceholderText(
      /e\.g\. YouTube Video Marquee/i,
    );
    fireEvent.change(nameInput, { target: { value: "Video Sanctuary Hub" } });

    const submitBtn = screen.getByRole("button", { name: /Create Flag/i });
    fireEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "video_hub",
          name: "Video Sanctuary Hub",
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
