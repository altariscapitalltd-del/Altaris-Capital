/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'nodemailer', '@vercel/blob'] },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
    dangerouslyAllowSVG: true,
  },
  typescript: { ignoreBuildErrors: false },
  eslint:     { ignoreDuringBuilds: true },
  async headers() {
    return [
      { source: '/build-id.txt', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] },
    ]
  },
}
module.exports = nextConfig
