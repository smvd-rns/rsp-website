import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { FaqsClient } from "./faqs/faqs-client";
import { QueriesClient } from "./queries/queries-client";
import { ServiceCatalogTab } from "./services/service-catalog-tab";
import { ActiveUsersTab } from "./users/active-users-tab";
import { WhitelistTab } from "./users/whitelist-tab";

describe("Subsections and tabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";

    const mockDb = {
      getAll: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("should render FaqsClient and show empty/ready state", () => {
    const { container } = render(<FaqsClient categories={[]} faqs={[]} />, {
      wrapper: createQueryWrapper(),
    });
    expect(container.textContent).toContain("FAQ");
  });

  it("should render QueriesClient and show queries container", () => {
    const { container } = render(<QueriesClient queries={[]} />, {
      wrapper: createQueryWrapper(),
    });
    expect(container.textContent).toContain("Active");
  });

  it("should render ServiceCatalogTab", () => {
    const { container } = render(
      <ServiceCatalogTab services={[]} setServices={vi.fn()} />,
      {
        wrapper: createQueryWrapper(),
      },
    );
    expect(container.textContent).toContain("All Services");
  });

  it("should render ActiveUsersTab", () => {
    const mockActiveUsersHook = {
      activeUsers: [],
      activeCount: 0,
      activePage: 1,
      setActivePage: vi.fn(),
      activeSearch: "",
      setActiveSearch: vi.fn(),
      isActiveLoading: false,
      activeLimit: 10,
      fetchActiveUsers: vi.fn(),
      handleActiveSearchSubmit: vi.fn(),
    } as any;

    const { container } = render(
      <ActiveUsersTab activeUsersHook={mockActiveUsersHook} />,
      {
        wrapper: createQueryWrapper(),
      },
    );
    expect(container.textContent).toContain("Active Application Users");
  });

  it("should render WhitelistTab", () => {
    const mockWhitelistHook = {
      whitelistUsers: [],
      whitelistCount: 0,
      whitelistPage: 1,
      setWhitelistPage: vi.fn(),
      whitelistSearch: "",
      setWhitelistSearch: vi.fn(),
      isWhitelistLoading: false,
      userToDelete: null,
      setUserToDelete: vi.fn(),
      whitelistLimit: 10,
      handleSearchSubmit: vi.fn(),
      confirmDeleteWhitelist: vi.fn(),
    } as any;

    const { container } = render(
      <WhitelistTab whitelistHook={mockWhitelistHook} />,
      {
        wrapper: createQueryWrapper(),
      },
    );
    expect(container.textContent).toContain("Whitelisted Users");
  });
});
