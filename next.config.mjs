/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow cross-origin requests in development (for mobile testing)
  allowedDevOrigins: [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
  ],

  // Updated Turbopack configuration (no longer experimental)
  turbopack: {
    // Optional Turbopack-specific configurations
    resolveAlias: {
      // Add any necessary aliases here
    },
  },
  
  // Add these explicitly for cross-origin WebSocket support
  webpack: (config) => {
    config.externals = [
      ...(config.externals || []), 
      { 'bufferutil': 'bufferutil', 'utf-8-validate': 'utf-8-validate' }
    ];
    return config;
  },
  
  // Enable CORS for all routes in development
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,HEAD,PUT,PATCH,POST,DELETE" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ]
      }
    ];
  }
};

export default nextConfig; 