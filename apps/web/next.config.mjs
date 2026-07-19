/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? '/open-fire-wx' : '';

const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: [
    '@openfirewx/map',
    '@openfirewx/ui',
    '@openfirewx/shared',
    '@openfirewx/fire',
    '@openfirewx/weather',
    '@openfirewx/plugin-aqi',
    '@openfirewx/plugin-fire-perimeters',
    '@openfirewx/plugin-firms-hotspots',
    '@openfirewx/plugin-noaa-weather',
    '@openfirewx/plugin-smoke',
  ],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
