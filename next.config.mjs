/** @type {import('next').NextConfig} */
const nextConfig = {
  // The map/UI runtime is imperative and initialises MapLibre once on mount,
  // so we disable double-invoked effects in dev to avoid a duplicate map.
  reactStrictMode: false,
};
export default nextConfig;
