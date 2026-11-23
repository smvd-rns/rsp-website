import { type IDBPDatabase, openDB } from "idb";
import { DB_NAME, DB_VERSION, INDEX, STORE } from "@/constants";
import type {
  Announcement,
  AudioCacheLedgerEntry,
  Category,
  ContentType,
  Event,
  Faq,
  FaqCategory,
  FeaturedItem,
  FeaturedSection,
  Language,
  Material,
  QueryReply,
  Recording,
  Redirect,
  Service,
  Speaker,
  UserEditRequest,
  UserProfile,
  UserQuery,
  UserServiceInterest,
  Venue,
} from "@/types";

type StoreName = Exclude<
  (typeof STORE)[keyof typeof STORE],
  "deleted_records" | "restricted_records"
>;

export interface RSP_IDB {
  categories: {
    key: number;
    value: Category;
    indexes: {
      [INDEX.BY_URL]: string;
      [INDEX.BY_PATH]: string;
    };
  };
  recordings: {
    key: number;
    value: Recording;
    indexes: {
      [INDEX.BY_CATEGORY_ID]: number;
    };
  };
  materials: {
    key: number;
    value: Material;
    indexes: {
      [INDEX.BY_RECORDING_ID]: number;
    };
  };
  speakers: {
    key: number;
    value: Speaker;
  };
  languages: {
    key: number;
    value: Language;
  };
  content_types: {
    key: number;
    value: ContentType;
  };
  venues: {
    key: number;
    value: Venue;
  };
  services: {
    key: number;
    value: Service;
  };
  redirects: {
    key: string;
    value: Redirect;
  };
  events: {
    key: number;
    value: Event;
  };
  faq_categories: {
    key: number;
    value: FaqCategory;
  };
  faqs: {
    key: number;
    value: Faq;
    indexes: { [INDEX.BY_CATEGORY_ID]: number };
  };
  announcements: {
    key: number;
    value: Announcement;
  };
  featured_sections: {
    key: number;
    value: FeaturedSection;
  };
  featured_items: {
    key: number;
    value: FeaturedItem;
    indexes: { [INDEX.BY_SECTION_ID]: number };
  };
  users: {
    key: string;
    value: UserProfile;
  };
  user_edit_requests: {
    key: string;
    value: UserEditRequest;
  };
  user_service_interests: {
    key: string;
    value: UserServiceInterest;
  };
  user_queries: {
    key: string;
    value: UserQuery;
  };
  query_replies: {
    key: string;
    value: QueryReply;
    indexes: {
      [INDEX.BY_QUERY_ID]: string;
    };
  };
  sync_meta: {
    key: StoreName;
    value: { id: string; updated_at: string };
  };
  role_sync_meta: {
    key: StoreName;
    value: { id: string; updated_at: string };
  };
  role_meta: {
    key: string;
    value: string | number | undefined;
  };
  [STORE.CACHE_LEDGER]: {
    key: string;
    value: AudioCacheLedgerEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<RSP_IDB>> | null = null;

const IDB_SCHEMA: Record<
  StoreName,
  { keyPath?: string; indexes?: { name: string; keyPath: string }[] }
> = {
  [STORE.ANNOUNCEMENTS]: {
    keyPath: "id",
  },
  [STORE.CATEGORIES]: {
    keyPath: "id",
    indexes: [
      { name: INDEX.BY_URL, keyPath: "url_path" },
      { name: INDEX.BY_PATH, keyPath: "path" },
    ],
  },
  [STORE.RECORDINGS]: {
    keyPath: "id",
    indexes: [{ name: INDEX.BY_CATEGORY_ID, keyPath: "category_id" }],
  },
  [STORE.MATERIALS]: {
    keyPath: "id",
    indexes: [{ name: INDEX.BY_RECORDING_ID, keyPath: "recording_id" }],
  },
  [STORE.SPEAKERS]: {
    keyPath: "id",
  },
  [STORE.LANGUAGES]: {
    keyPath: "id",
  },
  [STORE.CONTENT_TYPES]: {
    keyPath: "id",
  },
  [STORE.VENUES]: {
    keyPath: "id",
  },
  [STORE.SERVICES]: {
    keyPath: "id",
  },
  [STORE.REDIRECTS]: {
    keyPath: "id",
  },
  [STORE.EVENTS]: {
    keyPath: "id",
  },
  [STORE.FAQ_CATEGORIES]: {
    keyPath: "id",
  },
  [STORE.FAQS]: {
    keyPath: "id",
    indexes: [{ name: INDEX.BY_CATEGORY_ID, keyPath: "category_id" }],
  },
  [STORE.FEATURED_SECTIONS]: {
    keyPath: "id",
  },
  [STORE.FEATURED_ITEMS]: {
    keyPath: "id",
    indexes: [{ name: INDEX.BY_SECTION_ID, keyPath: "section_id" }],
  },
  [STORE.SYNC_META]: {
    keyPath: "id",
  },
  [STORE.ROLE_SYNC_META]: {
    keyPath: "id",
  },
  [STORE.ROLE_META]: {},
  [STORE.CACHE_LEDGER]: {
    keyPath: "id",
    // indexes: [{ name: INDEX.BY_ACCESSED_AT, keyPath: "accessedAt" }],
  },
  [STORE.USERS]: {
    keyPath: "id",
  },
  [STORE.USER_EDIT_REQUESTS]: {
    keyPath: "id",
  },
  [STORE.USER_SERVICE_INTERESTS]: {
    keyPath: "id",
  },
  [STORE.USER_QUERIES]: {
    keyPath: "id",
  },
  [STORE.QUERY_REPLIES]: {
    keyPath: "id",
    indexes: [{ name: INDEX.BY_QUERY_ID, keyPath: "query_id" }],
  },
};

export const getDB = () => {
  if (typeof indexedDB === "undefined") return null;

  if (dbPromise) return dbPromise;

  dbPromise = openDB<RSP_IDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion !== newVersion) {
        Object.values(STORE).forEach((store) => {
          try {
            db.deleteObjectStore(store);
          } catch {
            // Ignore error if store doesn't exist
          }
        });
      }

      Object.entries(IDB_SCHEMA).forEach(
        ([storeName, { keyPath, indexes }]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath,
            });
            indexes?.forEach((index) => {
              store.createIndex(index.name, index.keyPath);
            });
          } else {
            const store = transaction.objectStore(storeName);
            indexes?.forEach((index) => {
              if (!store.indexNames.contains(index.name)) {
                store.createIndex(index.name, index.keyPath);
              }
            });
          }
        },
      );
    },
  });

  return dbPromise;
};

const mutateStoreItem = async <T>(
  storeName: any,
  id: number,
  mutator: (item: T) => void,
) => {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction([storeName as any], "readwrite");
  const store = tx.objectStore(storeName as any);
  const item = (await store.get(id)) as T | undefined;
  if (item) {
    mutator(item);
    await store.put(item);
  }
  await tx.done;
};

const deleteStoreItem = async (storeName: any, id: number) => {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction([storeName as any], "readwrite");
  const store = tx.objectStore(storeName as any);
  await store.delete(id);
  await tx.done;
};

interface LocalCategoryItem {
  path?: string;
  url_path?: string;
  name: string;
}

interface LocalRecordingItem {
  category_id?: number | null;
}

export const localTrashCategory = async (id: number) => {
  await mutateStoreItem<LocalCategoryItem>(STORE.CATEGORIES, id, (cat) => {
    cat.path = "1";
    cat.url_path = `trash.${cat.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]+/g, "")}`;
  });
};

export const localRestoreCategory = async (
  id: number,
  parentPath = "",
  urlPath = "",
) => {
  await mutateStoreItem<LocalCategoryItem>(STORE.CATEGORIES, id, (cat) => {
    cat.path = parentPath;
    cat.url_path = urlPath;
  });
};

export const localDeleteCategory = async (id: number) => {
  await deleteStoreItem(STORE.CATEGORIES, id);
};

export const localTrashRecording = async (id: number) => {
  await mutateStoreItem<LocalRecordingItem>(STORE.RECORDINGS, id, (rec) => {
    rec.category_id = 1;
  });
};

export const localRestoreRecording = async (id: number, categoryId: number) => {
  await mutateStoreItem<LocalRecordingItem>(STORE.RECORDINGS, id, (rec) => {
    rec.category_id = categoryId;
  });
};

export const localDeleteRecording = async (id: number) => {
  await deleteStoreItem(STORE.RECORDINGS, id);
};

export const localClearTrash = async () => {
  const db = await getDB();
  if (!db) return;

  const [allCategories, allRecordings] = await Promise.all([
    db.getAll(STORE.CATEGORIES),
    db.getAll(STORE.RECORDINGS),
  ]);

  const trashCat = allCategories.find((c) => c.url_path === "trash");
  const trashCatId = trashCat?.id ?? 1;

  const categoryIdsToDelete = allCategories
    .filter(
      (c) =>
        c.id !== trashCatId &&
        (c.path === String(trashCatId) ||
          c.path.startsWith(`${trashCatId}.`) ||
          c.url_path?.startsWith("trash.")),
    )
    .map((c) => c.id);

  const recordingIdsToDelete = allRecordings
    .filter((r) => r.category_id === trashCatId)
    .map((r) => r.id);

  const tx = db.transaction([STORE.CATEGORIES, STORE.RECORDINGS], "readwrite");
  const catStore = tx.objectStore(STORE.CATEGORIES);
  const recStore = tx.objectStore(STORE.RECORDINGS);

  for (const id of categoryIdsToDelete) {
    await catStore.delete(id);
  }
  for (const id of recordingIdsToDelete) {
    await recStore.delete(id);
  }

  await tx.done;
};
