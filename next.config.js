/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'nodemailer', 'web-push', '@vercel/blob'] },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
    dangerouslyAllowSVG: true,
  },
  typescript: { ignoreBuildErrors: false },
  eslint:     { ignoreDuringBuilds: true },
}
module.exports = nextConfig
