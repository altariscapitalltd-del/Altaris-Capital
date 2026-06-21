/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'nodemailer', '@pusher/push-notifications-server', '@vercel/blob'] },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
    dangerouslyAllowSVG: true,
  },
  typescript: { ignoreBuildErrors: false },
  eslint:     { ignoreDuringBuilds: true },
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ]
    return [
      { source: '/build-id.txt', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] },
      { source: '/:path*', headers: securityHeaders },
    ]
  },
}
module.exports = nextConfig
