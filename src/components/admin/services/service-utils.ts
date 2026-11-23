export const matchesServiceUser = (
  item: {
    users?: { email: string; name?: string | null } | null;
    services?: { name: string } | null;
  },
  search: string,
  extraField?: string | null,
) => {
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    (item.users?.email || "").toLowerCase().includes(q) ||
    (item.users?.name || "").toLowerCase().includes(q) ||
    (item.services?.name || "").toLowerCase().includes(q) ||
    (extraField || "").toLowerCase().includes(q)
  );
};
