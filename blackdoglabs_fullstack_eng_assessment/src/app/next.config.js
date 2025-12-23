const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile SDK package (TypeScript files outside app directory)
  transpilePackages: ['@acme/analytics-sdk'],
  
  webpack: (config) => {
    // Resolve SDK imports from parent directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@sdk': path.resolve(__dirname, '../sdk/src'),
    };
    
    // Allow importing TypeScript files from SDK
    config.resolve.extensions = [
      ...config.resolve.extensions,
      '.ts',
      '.tsx',
    ];
    
    return config;
  },
};

module.exports = nextConfig;

