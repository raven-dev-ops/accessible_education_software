/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.NEXT_PUBLIC_ALLOW_SAMPLE_FALLBACKS === "true"
    ) {
      throw new Error(
        "Sample fallbacks are disabled in production. Remove NEXT_PUBLIC_ALLOW_SAMPLE_FALLBACKS or set it to false."
      );
    }
    return config;
  }
};

export default nextConfig;
