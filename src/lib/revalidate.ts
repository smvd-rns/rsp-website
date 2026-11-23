import { RSP_PUBLIC_SITE } from "@/constants";
import { generateM2MToken } from "./jwt";

const audience = process.env.RSP_PUBLIC_AUDIENCE ?? "";

export const revalidateCategoryPaths = async (
  urlPaths: (string | null | undefined)[],
  options?: { tag?: string },
) => {
  const uniquePaths = Array.from(
    new Set(
      urlPaths
        .filter((p): p is string => !!p)
        .map((p) => {
          const path = p.replace(/\./g, "/").replace(/_/g, "-");
          return path.startsWith("/") ? path : `/${path}`;
        }),
    ),
  );

  if (uniquePaths.length === 0 && !options?.tag) return;

  try {
    const token = await generateM2MToken(audience);

    const publicSites = RSP_PUBLIC_SITE.split(",").map((s) => s.trim());

    await Promise.all(
      publicSites.map(async (site) => {
        const url = new URL("api/revalidate", site).toString();

        console.log(
          `[Revalidation] Triggering POST ${url} for paths:`,
          uniquePaths,
          options?.tag ? `with tag: ${options.tag}` : "",
        );

        const body: { paths?: string[]; tag?: string } = {};
        if (uniquePaths.length > 0) {
          body.paths = uniquePaths;
        }
        if (options?.tag) {
          body.tag = options.tag;
        }

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(
            `[Revalidation] Failed to revalidate paths: ${response.status} ${response.statusText} - ${text}`,
          );
        } else {
          console.log(
            `[Revalidation] Successfully revalidated paths:`,
            uniquePaths,
          );
        }
      }),
    );
  } catch (error) {
    console.error("[Revalidation] Error triggering path revalidation:", error);
  }
};

export const revalidateUrlPaths = async (
  urlPaths: (string | null | undefined)[] = [],
) => {
  await revalidateCategoryPaths(urlPaths, { tag: "url-paths" });
};

export const revalidateFeatureFlags = async () => {
  try {
    const token = await generateM2MToken(audience);

    const publicSites = RSP_PUBLIC_SITE.split(",").map((s) => s.trim());

    await Promise.all(
      publicSites.map(async (site) => {
        const url = new URL("api/revalidate", site).toString();

        console.log(`[Revalidation] Triggering POST ${url} for feature-flags`);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tag: "feature-flags" }),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(
            `[Revalidation] Failed to revalidate feature flags: ${response.status} ${response.statusText} - ${text}`,
          );
        } else {
          console.log("[Revalidation] Successfully revalidated feature flags");
        }
      }),
    );
  } catch (error) {
    console.error(
      "[Revalidation] Error triggering feature flags revalidation:",
      error,
    );
  }
};

export const revalidateQueries = async () => {
  try {
    const token = await generateM2MToken(audience);

    const publicSites = RSP_PUBLIC_SITE.split(",").map((s) => s.trim());

    await Promise.all(
      publicSites.map(async (site) => {
        const url = new URL("api/revalidate", site).toString();

        console.log(`[Revalidation] Triggering POST ${url} for queries`);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paths: ["/queries"],
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(
            `[Revalidation] Failed to revalidate queries: ${response.status} ${response.statusText} - ${text}`,
          );
        } else {
          console.log("[Revalidation] Successfully revalidated queries");
        }
      }),
    );
  } catch (error) {
    console.error(
      "[Revalidation] Error triggering queries revalidation:",
      error,
    );
  }
};
