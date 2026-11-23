import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type {
  Announcement,
  Category,
  EnrichedFeaturedItem,
  EnrichedFeaturedSection,
  EnrichedRecording,
  FeaturedItem,
  FeaturedSection,
  Material,
} from "@/types";

export async function GET() {
  try {
    const [annRes, secRes, itemRes, catRes] = await Promise.all([
      pool.query(
        `SELECT * FROM prod.announcements WHERE is_active = true ORDER BY orderind ASC NULLS LAST`,
      ),
      pool.query(
        `SELECT * FROM prod.featured_sections WHERE is_active = true ORDER BY orderind ASC NULLS LAST`,
      ),
      pool.query(
        `SELECT * FROM prod.featured_items ORDER BY orderind ASC NULLS LAST`,
      ),
      pool.query(
        `SELECT id, name, img, image_url, path, orderind, parentid, allowed_roles, url_path FROM rsp.categories WHERE url_path != 'trash' AND url_path NOT LIKE 'trash.%'`,
      ),
    ]);

    const announcementsRaw = annRes.rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      title: String(r.title || ""),
      subtitle: (r.subtitle as string) || null,
      description: (r.description as string) || null,
      category: (r.category as string) || null,
      is_active: Boolean(r.is_active),
      is_annual_recurring: Boolean(r.is_annual_recurring),
      start_date: (r.start_date as string) || null,
      end_date: (r.end_date as string) || null,
      order_ind: Number(r.orderind ?? 0),
      ui_props: r.ui_props,
    })) as Announcement[];

    const sectionsRaw = secRes.rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      title: String(r.title || ""),
      subtitle: (r.subtitle as string) || null,
      description: (r.description as string) || null,
      is_active: Boolean(r.is_active),
      order_ind: Number(r.orderind ?? 0),
    })) as FeaturedSection[];

    const itemsRaw = itemRes.rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      section_id: Number(r.section_id),
      entity_type: String(r.entity_type) as "recording" | "category",
      entity_id: Number(r.entity_id),
      order_ind: Number(r.orderind ?? 0),
    })) as FeaturedItem[];

    const categoryMap = new Map<number, Category>();
    for (const r of catRes.rows) {
      const base36 = r.img ? Number(r.img).toString(36) : "";
      categoryMap.set(Number(r.id), {
        id: Number(r.id),
        name: String(r.name || ""),
        img: r.img ? Number(r.img) : null,
        image_url:
          (r.image_url as string) ||
          (base36 ? `/category-images/${base36}.webp` : "/rsp.webp"),
        path: String(r.path || ""),
        url_path: String(r.url_path || ""),
        parent_id:
          r.parentid !== null && r.parentid !== undefined
            ? Number(r.parentid)
            : null,
        order_ind: Number(r.orderind ?? 0),
        allowed_roles: Array.isArray(r.allowed_roles)
          ? (r.allowed_roles as number[]).map(Number)
          : [0],
      });
    }

    // Fetch featured recordings if needed
    const recordingIds = itemsRaw
      .filter((i) => i.entity_type === "recording")
      .map((i) => i.entity_id);

    const recordingMap = new Map<number, EnrichedRecording>();
    if (recordingIds.length > 0) {
      const recRes = await pool.query(
        `SELECT r.*, e.name AS event_name, e.shortname AS event_short_name
         FROM rsp.recordings r
         LEFT JOIN rsp.events e ON e.id = r.eventid::bigint
         WHERE r.id = ANY($1)`,
        [recordingIds],
      );

      const matRes = await pool.query(
        `SELECT * FROM rsp.materials WHERE recordingid = ANY($1)`,
        [recordingIds],
      );
      const materialsMap = new Map<number, Material[]>();
      for (const m of matRes.rows) {
        const recId = Number(m.recordingid);
        const list = materialsMap.get(recId) || [];
        list.push({
          id: Number(m.id),
          recording_id: recId,
          name: String(m.name || ""),
          type:
            (m.type as string) ||
            (String(m.name || "").endsWith(".pdf") ? "pdf" : "doc"),
          uri: (m.gdriveid as string) || "",
          size: "1 MB",
          order_ind: 0,
          created_at: null,
          updated_at: null,
        });
        materialsMap.set(recId, list);
      }

      for (const r of recRes.rows) {
        const id = Number(r.id);
        const rawVenue = r.venue || "";
        const normalizedVenue =
          rawVenue.toLowerCase() === "hyd" ? "Hyderabad" : rawVenue || "NVCC";
        const normalizedSpeaker = r.speaker || "Radheshyam Das";
        const speakerName = normalizedSpeaker.startsWith("HG ")
          ? normalizedSpeaker
          : `HG ${normalizedSpeaker}`;
        const catId = r.parentid ? Number(r.parentid) : null;

        recordingMap.set(id, {
          id,
          name: String(r.name || ""),
          path: String(r.path || ""),
          event_id: r.eventid ? Number(r.eventid) : null,
          event_name: (r.event_name as string) || null,
          event_short_name: (r.event_short_name as string) || null,
          recdatetime: r.recdatetime
            ? new Date(r.recdatetime).toISOString()
            : null,
          recorded_at: r.recdatetime
            ? new Date(r.recdatetime).toISOString()
            : null,
          language: (r.language as string) || "English",
          venue: normalizedVenue,
          speaker: speakerName,
          recmedia: (r.recmedia as string) || "Audio",
          audio_id: (r.audioid as string) || null,
          video_id: (r.videoid as string) || null,
          yt_id: (r.videoid as string) || null,
          order_ind: Number(r.orderind ?? 0),
          category_id: catId,
          category: catId ? categoryMap.get(catId) || null : null,
          gdrive_id: (r.gdriveid as string) || null,
          video_gdrive_id: (r.videogdriveid as string) || null,
          materials: materialsMap.get(id) || [],
          allowed_roles:
            Array.isArray(r.allowed_roles) && r.allowed_roles.length > 0
              ? r.allowed_roles
              : [0],
          created_at: r.recdatetime
            ? new Date(r.recdatetime).toISOString()
            : null,
          updated_at: null,
          size: null,
          type_id: null,
          speaker_ids: [],
          lang_ids: [],
          venues_id: null,
        } as unknown as EnrichedRecording);
      }
    }

    // Filter announcements
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentDay = String(now.getDate()).padStart(2, "0");
    const currentMMDD = `${currentMonth}-${currentDay}`;
    const currentYYYYMMDD = `${currentYear}-${currentMMDD}`;

    const isAnnouncementActive = (item: Announcement): boolean => {
      if (item.is_active === false) return false;
      if (!item.start_date && !item.end_date) return true;
      if (item.is_annual_recurring) {
        const extractMMDD = (dateStr?: string | null) => {
          if (!dateStr) return "";
          const parts = dateStr.split("-");
          if (parts.length >= 3)
            return `${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
          if (parts.length === 2)
            return `${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
          return dateStr;
        };
        const startMMDD = extractMMDD(item.start_date);
        const endMMDD = extractMMDD(item.end_date);
        if (startMMDD && endMMDD) {
          if (startMMDD <= endMMDD)
            return currentMMDD >= startMMDD && currentMMDD <= endMMDD;
          return currentMMDD >= startMMDD || currentMMDD <= endMMDD;
        }
        if (startMMDD) return currentMMDD >= startMMDD;
        if (endMMDD) return currentMMDD <= endMMDD;
        return true;
      }
      if (item.start_date && currentYYYYMMDD < item.start_date) return false;
      if (item.end_date && currentYYYYMMDD > item.end_date) return false;
      return true;
    };

    const activeAnnouncements = announcementsRaw
      .filter(isAnnouncementActive)
      .sort((a, b) => (a.order_ind ?? 0) - (b.order_ind ?? 0));

    const spotlights = activeAnnouncements.filter(
      (a) => a.category === "guidance_spotlight",
    );
    const banners = activeAnnouncements.filter(
      (a) => a.category !== "guidance_spotlight",
    );

    const enrichedSections: EnrichedFeaturedSection[] = sectionsRaw
      .filter((s) => s.is_active !== false)
      .sort((a, b) => (a.order_ind ?? 0) - (b.order_ind ?? 0))
      .map((section) => {
        const sectionItems = itemsRaw
          .filter((item) => item.section_id === section.id)
          .sort((a, b) => (a.order_ind ?? 0) - (b.order_ind ?? 0))
          .map((item): EnrichedFeaturedItem => {
            if (item.entity_type === "category") {
              return {
                ...item,
                category: categoryMap.get(item.entity_id) || null,
              };
            }
            return {
              ...item,
              recording: recordingMap.get(item.entity_id) || null,
            };
          })
          .filter((item) => !!item.category || !!item.recording);

        return {
          ...section,
          items: sectionItems,
        };
      })
      .filter((s) => s.items.length > 0);

    return NextResponse.json(
      {
        announcements: banners,
        spotlights,
        featuredSections: enrichedSections,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (err: unknown) {
    console.error("[Homepage API] DB error:", err);
    return NextResponse.json(
      { announcements: [], spotlights: [], featuredSections: [] },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  }
}
