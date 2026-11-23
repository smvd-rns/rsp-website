import { create, insertMultiple, type Orama, search } from "@orama/orama";
import type { UserQueryWithUser } from "@/types";

export interface MentionEntity {
  id: string;
  name: string;
  type: "recording" | "category" | "material";
  subtitle: string;
  url: string;
}

const queriesSchema = {
  id: "string",
  subject: "string",
  message: "string",
  requester_name: "string",
  requester_email: "string",
  category: "string",
  status: "string",
} as const;

export type QueriesOramaDB = Orama<typeof queriesSchema>;

export const createQueriesIndex = async (
  queries: UserQueryWithUser[],
): Promise<QueriesOramaDB> => {
  const db = await create({
    schema: queriesSchema,
  });

  if (queries.length === 0) return db;

  const docs = queries.map((q) => ({
    id: q.id,
    subject: q.subject || "",
    message: q.message || "",
    requester_name: q.users?.name || q.guest_name || "",
    requester_email: q.users?.email || q.guest_email || "",
    category: q.category || "",
    status: q.status || "",
  }));

  await insertMultiple(db, docs);
  return db;
};

export const searchQueriesWithOrama = async (
  db: QueriesOramaDB,
  term: string,
): Promise<Set<string>> => {
  const trimmed = term.trim();
  if (!trimmed) return new Set();

  const results = await search(db, {
    term: trimmed,
    tolerance: 1,
    boost: {
      subject: 2,
      requester_name: 1.5,
      requester_email: 1.2,
      message: 1,
    },
    limit: 50,
  });

  return new Set(results.hits.map((h) => h.document.id));
};
