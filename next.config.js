/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'nodemailer', 'web-push'],
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
    dangerouslyAllowSVG: true,
  },
  typescript: { ignoreBuildErrors: false },
  eslint:     { ignoreDuringBuilds: true },
}
module.exports = nextConfig
