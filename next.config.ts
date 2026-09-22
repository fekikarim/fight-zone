import type { NextConfig } from "next";

const supabaseOrigin =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${supabaseOrigin}`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/events",
        permanent: true,
      },
      {
        source: "/member/subscription",
        destination: "/member/events",
        permanent: true,
      },
      {
        source: "/member/payments",
        destination: "/member/events",
        permanent: true,
      },
      {
        source: "/member/sessions",
        destination: "/member/events",
        permanent: true,
      },
      {
        source: "/member/sessions/:path*",
        destination: "/member/events",
        permanent: true,
      },
      {
        source: "/member/bookings",
        destination: "/member/events",
        permanent: true,
      },
      {
        source: "/member/bookings/:path*",
        destination: "/member/events",
        permanent: true,
      },
      {
        source: "/admin/memberships",
        destination: "/admin/events",
        permanent: true,
      },
      {
        source: "/admin/memberships/:path*",
        destination: "/admin/events",
        permanent: true,
      },
      {
        source: "/admin/bookings",
        destination: "/admin/events",
        permanent: true,
      },
      {
        source: "/admin/bookings/:path*",
        destination: "/admin/events",
        permanent: true,
      },
      {
        source: "/coaches",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/coaches/:path*",
        destination: "/about",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
