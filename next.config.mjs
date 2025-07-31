/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Webpack configuration for PDF.js
  webpack: (config, { isServer, dev }) => {
    // Disable webpack caching to prevent snapshot issues
    if (dev) {
      config.cache = false;
    }
    
    // Don't resolve 'fs', 'net' and 'tls' on client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      };
    }
    
    // Handle PDF.js worker more explicitly
    config.externals = config.externals || [];
    config.externals.push({
      'pdfjs-dist/build/pdf.worker.js': 'pdfjs-dist/build/pdf.worker.js',
    });

    // Add specific rules for PDF.js to prevent caching conflicts
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]'
      }
    });

    return config;
  },
  // Ensure PDF worker file is properly served
  async headers() {
    return [
      {
        source: '/pdf.worker.min.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ]
  },
}

export default nextConfig
