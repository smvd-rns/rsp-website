import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as homepageActions from "@/app/actions/homepage-actions";
import { createQueryWrapper } from "@/test-utils";
import type { Announcement, FeaturedItem, FeaturedSection } from "@/types";
import { AnnouncementBannerContent } from "./announcement-banner-content";
import { AnnouncementDialog } from "./announcement-dialog";
import { AnnouncementLayoutFields } from "./announcement-layout-fields";
import { AnnouncementsManager } from "./announcements-manager";
import { FeaturedItemDialog } from "./featured-item-dialog";
import { FeaturedSectionDialog } from "./featured-section-dialog";
import { HomepageClient } from "./homepage-client";

describe("Homepage Admin Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockAnnouncement: Announcement = {
    id: 1,
    title: "Upcoming Festival",
    subtitle: "Join us this Sunday",
    is_active: true,
    badge_text: "event",
    bg_gradient: null,
    category: "event",
    cta_label: "Learn More",
    cta_url: "https://example.com",
    start_date: null,
    end_date: null,
    is_annual_recurring: false,
    allowed_roles: [],
    media_path: null,
    media_type: null,
    order_ind: 1,
    updated_at: new Date().toISOString(),
  };

  const mockSection: FeaturedSection = {
    id: 10,
    title: "Weekly Highlights",
    order_ind: 1,
    is_active: true,
    layout: "grid",
    updated_at: new Date().toISOString(),
    allowed_roles: [],
  };

  const mockItem: FeaturedItem = {
    id: 100,
    section_id: 10,
    entity_type: "recording",
    entity_id: 50,
    order_ind: 1,
    updated_at: new Date().toISOString(),
    allowed_roles: [],
  };

  it("renders AnnouncementDialog in create and edit modes", () => {
    vi.spyOn(homepageActions, "createAnnouncement").mockResolvedValue({
      success: true,
      data: mockAnnouncement,
    } as any);

    const { rerender } = render(
      <AnnouncementDialog
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText("New Announcement Banner")).toBeDefined();

    rerender(
      <AnnouncementDialog
        open={true}
        onOpenChange={vi.fn()}
        announcement={mockAnnouncement}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("Upcoming Festival")).toBeDefined();
  });

  it("renders AnnouncementsManager with announcements", () => {
    render(<AnnouncementsManager announcements={[mockAnnouncement]} />, {
      wrapper: createQueryWrapper(),
    });

    expect(screen.getByText("Upcoming Festival")).toBeDefined();
    expect(screen.getByText(/top banner announcements/i)).toBeDefined();
  });

  it("renders FeaturedSectionDialog in create and edit modes", () => {
    const { rerender } = render(
      <FeaturedSectionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Add Featured Section")).toBeDefined();

    rerender(
      <FeaturedSectionDialog
        open={true}
        onOpenChange={vi.fn()}
        section={mockSection}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit Featured Section")).toBeDefined();
    expect(screen.getByDisplayValue("Weekly Highlights")).toBeDefined();
  });

  it("renders FeaturedItemDialog", () => {
    render(
      <FeaturedItemDialog
        open={true}
        onOpenChange={vi.fn()}
        sectionId={10}
        categories={[]}
        recordings={[]}
        onSuccess={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText("Add Featured Item")).toBeDefined();
  });

  it("renders HomepageClient overview", () => {
    render(
      <HomepageClient
        sections={[mockSection]}
        items={[mockItem]}
        announcements={[mockAnnouncement]}
        categories={[]}
        recordings={[]}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText(/top banners/i)).toBeDefined();
    expect(screen.getByText("Upcoming Festival")).toBeDefined();
  });

  it("renders AnnouncementBannerContent with right flank + bottom CTA alignment", () => {
    const { container } = render(
      <AnnouncementBannerContent
        title="Janmashtami Mahotsav"
        subtitle="Divine celebration"
        badgeText="Festival"
        ctaLabel="Register Now"
        layoutAlign="left"
        layoutValign="bottom"
        layoutCta="bottom_right"
      />,
    );

    expect(screen.getByText("Janmashtami Mahotsav")).toBeDefined();
    expect(screen.getByText(/Divine celebration/)).toBeDefined();
    expect(screen.getByText("Festival")).toBeDefined();
    expect(screen.getByText("Register Now")).toBeDefined();

    const ctaContainer = container.querySelector(".absolute");
    expect(ctaContainer).not.toBeNull();
  });

  it("renders AnnouncementLayoutFields with stack toggle and boundary selector", () => {
    render(
      <AnnouncementLayoutFields
        layoutStack={false}
        onLayoutStackChange={vi.fn()}
        layoutMaxWidth="full"
        onLayoutMaxWidthChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Multi-line Stack (Title over Subtitle)"),
    ).toBeDefined();
    expect(screen.getByText("Content Text Safe Boundary")).toBeDefined();
  });
});
