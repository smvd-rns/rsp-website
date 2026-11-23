const getKvConfig = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  return { accountId, namespaceId, apiToken };
};

export const setKvKey = async (
  key: string,
  value: string | object,
): Promise<{ success: boolean; error?: string }> => {
  const { accountId, namespaceId, apiToken } = getKvConfig();

  if (!apiToken) {
    console.warn(
      "[Cloudflare KV] CLOUDFLARE_API_TOKEN is not set; skipping KV sync.",
    );
    return { success: false, error: "CLOUDFLARE_API_TOKEN not configured" };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  const body = typeof value === "string" ? value : JSON.stringify(value);

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `[Cloudflare KV] Error setting key ${key} (${res.status}): ${errText}`,
      );
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Cloudflare KV] Exception setting key ${key}:`, error);
    return { success: false, error: errMsg };
  }
};

export const deleteKvKey = async (
  key: string,
): Promise<{ success: boolean; error?: string }> => {
  const { accountId, namespaceId, apiToken } = getKvConfig();

  if (!apiToken) {
    console.warn(
      "[Cloudflare KV] CLOUDFLARE_API_TOKEN is not set; skipping KV deletion.",
    );
    return { success: false, error: "CLOUDFLARE_API_TOKEN not configured" };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `[Cloudflare KV] Error deleting key ${key} (${res.status}): ${errText}`,
      );
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Cloudflare KV] Exception deleting key ${key}:`, error);
    return { success: false, error: errMsg };
  }
};
