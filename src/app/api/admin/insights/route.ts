import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // 1. Auth check: Admin role (1) or Manager role (8)
    const session = await getSessionFromRequest(req);
    const role = Number(session?.role || 0);
    const isAdmin = role === 1 || role === 8;
    if (!session || !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    // 2. Parse search parameters & filters
    const searchParams =
      req.nextUrl?.searchParams || new URL(req.url).searchParams;
    const period = searchParams.get("period") || "7d";
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(5, Number.parseInt(searchParams.get("limit") || "15", 10)),
    );
    const offset = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() || "";
    const typeFilter = searchParams.get("type") || "all"; // 'all' | 'guest' | 'member'
    const deviceFilter = searchParams.get("device") || "all"; // 'all' | 'mobile' | 'desktop' | 'tablet'
    const pathFilter = searchParams.get("path")?.trim() || "";

    let intervalClause = "NOW() - INTERVAL '7 days'";
    if (period === "today") {
      intervalClause = "DATE_TRUNC('day', NOW())";
    } else if (period === "30d") {
      intervalClause = "NOW() - INTERVAL '30 days'";
    } else if (period === "90d") {
      intervalClause = "NOW() - INTERVAL '90 days'";
    } else if (period === "all") {
      intervalClause = "'2020-01-01'::timestamp";
    }

    // 3. Overall KPI stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_bot = false) AS total_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_bot = false AND is_logged_in = false) AS guest_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_bot = false AND is_logged_in = true) AS logged_in_visitors,
        COUNT(*) FILTER (WHERE is_bot = false) AS total_pageviews,
        COUNT(DISTINCT visitor_id) FILTER (
          WHERE is_bot = false AND (
            page_path LIKE '/categories%' 
            OR page_path LIKE '/content%' 
            OR page_path LIKE '/listen%' 
            OR page_path LIKE '/recording%'
            OR page_path LIKE '/topics%'
          )
        ) AS discourse_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_bot = false AND (page_path = '/donate' OR page_path LIKE '/donate/%')) AS donate_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_bot = true) AS bot_visitors,
        COUNT(*) FILTER (WHERE is_bot = true) AS bot_pageviews,
        COUNT(DISTINCT visitor_id) AS total_all_visitors,
        COUNT(*) AS total_all_pageviews
      FROM rsp.site_visits
      WHERE created_at >= ${intervalClause};
    `;
    const statsRes = await pool.query(statsQuery);
    const stats = statsRes.rows[0] || {
      total_visitors: 0,
      guest_visitors: 0,
      logged_in_visitors: 0,
      total_pageviews: 0,
      discourse_visitors: 0,
      donate_visitors: 0,
      bot_visitors: 0,
      bot_pageviews: 0,
      total_all_visitors: 0,
      total_all_pageviews: 0,
    };

    // 4. Daily trend
    const trendQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = false) AS guest_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = true) AS logged_in_visitors,
        COUNT(*) AS pageviews
      FROM rsp.site_visits
      WHERE is_bot = false AND created_at >= ${intervalClause}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC;
    `;
    const trendRes = await pool.query(trendQuery);

    // 5. Top Visited Pages
    const pagesQuery = `
      SELECT 
        page_path,
        COUNT(*) AS views,
        COUNT(DISTINCT visitor_id) AS unique_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = false) AS guest_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = true) AS logged_in_visitors
      FROM rsp.site_visits
      WHERE is_bot = false AND created_at >= ${intervalClause}
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 15;
    `;
    const pagesRes = await pool.query(pagesQuery);

    // 6. Device Breakdown
    const devicesQuery = `
      SELECT 
        COALESCE(device_type, 'desktop') AS device,
        COUNT(DISTINCT visitor_id) AS count
      FROM rsp.site_visits
      WHERE is_bot = false AND created_at >= ${intervalClause}
      GROUP BY device_type
      ORDER BY count DESC;
    `;
    const devicesRes = await pool.query(devicesQuery);

    // 7. Filtered Live Activity Stream
    const whereClauses: string[] = ["is_bot = false"];
    const queryParams: (string | number)[] = [];
    let paramIdx = 1;

    whereClauses.push(`created_at >= ${intervalClause}`);

    if (search) {
      whereClauses.push(
        `(page_path ILIKE $${paramIdx} OR COALESCE(user_email, '') ILIKE $${paramIdx} OR COALESCE(referrer, '') ILIKE $${paramIdx})`,
      );
      queryParams.push(`%${search}%`);
      paramIdx++;
    }

    if (typeFilter === "guest") {
      whereClauses.push("is_logged_in = false");
    } else if (typeFilter === "member") {
      whereClauses.push("is_logged_in = true");
    }

    if (deviceFilter && deviceFilter !== "all") {
      whereClauses.push(`device_type = $${paramIdx}`);
      queryParams.push(deviceFilter);
      paramIdx++;
    }

    if (pathFilter) {
      whereClauses.push(`page_path = $${paramIdx}`);
      queryParams.push(pathFilter);
      paramIdx++;
    }

    const whereSql = whereClauses.join(" AND ");

    // Count filtered records
    const countSql = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_logged_in = false) AS guest_count,
        COUNT(*) FILTER (WHERE is_logged_in = true) AS member_count
      FROM rsp.site_visits 
      WHERE ${whereSql};
    `;
    const countRes = await pool.query(countSql, queryParams);
    const totalFiltered = Number.parseInt(countRes.rows[0]?.total || "0", 10);
    const guestFiltered = Number.parseInt(
      countRes.rows[0]?.guest_count || "0",
      10,
    );
    const memberFiltered = Number.parseInt(
      countRes.rows[0]?.member_count || "0",
      10,
    );
    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    // Fetch paginated rows
    const recentSql = `
      SELECT 
        id,
        created_at,
        visitor_id,
        page_path,
        page_title,
        is_logged_in,
        user_email,
        user_role,
        device_type,
        browser,
        os,
        referrer
      FROM rsp.site_visits
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;
    const recentRes = await pool.query(recentSql, [
      ...queryParams,
      limit,
      offset,
    ]);

    // 8. Disk Space Usage in PostgreSQL
    let tableSize = "under 1 MB";
    try {
      const sizeRes = await pool.query(
        "SELECT pg_size_pretty(pg_total_relation_size('rsp.site_visits')) as size;",
      );
      if (sizeRes.rows[0]?.size) {
        tableSize = sizeRes.rows[0].size;
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      period,
      tableSize,
      pagination: {
        page,
        limit,
        totalCount: totalFiltered,
        guestCount: guestFiltered,
        memberCount: memberFiltered,
        totalPages,
      },
      stats: {
        totalVisitors: Number(stats.total_visitors || 0),
        guestVisitors: Number(stats.guest_visitors || 0),
        loggedInVisitors: Number(stats.logged_in_visitors || 0),
        totalPageviews: Number(stats.total_pageviews || 0),
        discourseVisitors: Number(stats.discourse_visitors || 0),
        donateVisitors: Number(stats.donate_visitors || 0),
        botVisitors: Number(stats.bot_visitors || 0),
        botPageviews: Number(stats.bot_pageviews || 0),
        totalAllVisitors: Number(stats.total_all_visitors || 0),
        totalAllPageviews: Number(stats.total_all_pageviews || 0),
      },
      trend: trendRes.rows.map((r) => ({
        date: r.date,
        visitors: Number(r.visitors),
        guestVisitors: Number(r.guest_visitors),
        loggedInVisitors: Number(r.logged_in_visitors),
        pageviews: Number(r.pageviews),
      })),
      topPages: pagesRes.rows.map((r) => ({
        path: r.page_path,
        views: Number(r.views),
        visitors: Number(r.unique_visitors),
        guestVisitors: Number(r.guest_visitors),
        loggedInVisitors: Number(r.logged_in_visitors),
      })),
      devices: devicesRes.rows.map((r) => ({
        device: r.device,
        count: Number(r.count),
      })),
      recentVisits: recentRes.rows,
    });
  } catch (error: unknown) {
    console.error("[Admin Insights API Error]", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
