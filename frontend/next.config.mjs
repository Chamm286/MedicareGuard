/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL || "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
