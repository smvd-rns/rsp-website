import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactCompiler: true,
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    days: {
      stale: 86400,
      revalidate: 86400,
      expire: 604800,
    },
    month: {
      stale: 2592000,
      revalidate: 2592000,
      expire: 5184000,
    },
  },
  experimental: {
    agentUpgrade: "security",
    optimizeCss: true,
    optimizePackageImports: ["@/components"],
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    unoptimized: true,
  },

  async redirects() {
    return [
      {
        source: "/sitemap-index.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/sitemap_index.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/sitemap-index/xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/library/sitemap-index/xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/search",
        destination: "/library",
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/health",
        destination: "/api/health",
      },
      {
        source: "/healthz",
        destination: "/api/health",
      },
      {
        source: "/live",
        destination: "/api/health",
      },
      {
        source: "/android-icon-192x192.png",
        destination: "/icon-192x192.webp",
      },
      {
        source: "/android-icon-:size(.*).png",
        destination: "/icon-192x192.webp",
      },
      {
        source: "/favicon-:size(.*).png",
        destination: "/favicon.ico",
      },
      {
        source: "/apple-icon-:size(.*).png",
        destination: "/apple-touch-icon.png",
      },
      {
        source: "/apple-icon.png",
        destination: "/apple-touch-icon.png",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, s-maxage=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              [
                "script-src",
                "'self'",
                process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "",
                "'unsafe-inline'",
                "https://*.radheshyamdas.com",
                "https://static.cloudflareinsights.com",
              ]
                .filter(Boolean)
                .join(" "),
              "style-src 'self' 'unsafe-inline'",
              [
                "img-src",
                "'self'",
                "data:",
                "blob:",
                "https://lh3.googleusercontent.com",
                "https://*.ytimg.com",
                "https://i.ytimg.com",
                "https://img.youtube.com",
                "https://*.youtube-nocookie.com",
                "https://*.youtube.com",
                process.env["NEXT_PUBLIC_ASSET_PROXY"],
              ]
                .filter(Boolean)
                .join(" "),
              `media-src 'self' blob: https://drive.usercontent.google.com https://*.googleusercontent.com https://*.google.com ${process.env["NEXT_PUBLIC_ASSET_PROXY"] || ""}`,
              [
                "connect-src",
                "'self'",
                "https://bfiyqzcnmkpczkmgounm.supabase.co",
                "https://cloudflareinsights.com",
                "wss://bfiyqzcnmkpczkmgounm.supabase.co",
                "https://*.radheshyamdas.com",
                process.env["NEXT_PUBLIC_ASSET_PROXY"],
                "https://*.google.com",
                "https://*.googleusercontent.com",
              ]
                .filter(Boolean)
                .join(" "),
              "font-src 'self' data:",
              "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://*.google.com",
              "frame-ancestors 'self'",
              "object-src 'none'",
            ].join("; "),
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "node:module": false,
        module: false,
      };
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:/,
          (resource: { request: string }) => {
            resource.request = resource.request.replace(/^node:/, "");
          },
        ),
      );
    }
    return config;
  },
};

export default nextConfig;
