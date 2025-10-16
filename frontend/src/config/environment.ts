/**
 * Environment configuration for Acadion frontend
 * Handles environment variables and provides type-safe configuration
 */

export type Environment = 'development' | 'staging' | 'production';

interface Config {
  // Environment
  environment: Environment;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  
  // API Configuration
  apiUrl: string;
  apiBasePath: string;
  
  // Supabase Configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  
  // App Configuration
  appName: string;
  appVersion: string;
  
  // Feature Flags
  enableAnalytics: boolean;
  enableDebug: boolean;
  enableFaceRecognition: boolean;
  
  // Performance
  bundleAnalyzer: boolean;
}

// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create configuration object
const environment = (import.meta.env.VITE_ENVIRONMENT as Environment) || 'development';

export const config: Config = {
  // Environment
  environment,
  isDevelopment: environment === 'development',
  isStaging: environment === 'staging',
  isProduction: environment === 'production',
  
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  apiBasePath: import.meta.env.VITE_API_BASE_PATH || '/api',
  
  // Supabase Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL!,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
  
  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'Acadion',
  appVersion: import.meta.env.VITE_APP_VERSION || '2.0.0',
  
  // Feature Flags
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  enableFaceRecognition: import.meta.env.VITE_ENABLE_FACE_RECOGNITION !== 'false',
  
  // Performance
  bundleAnalyzer: import.meta.env.VITE_BUNDLE_ANALYZER === 'true'
};

// Log configuration in development
if (config.isDevelopment && config.enableDebug) {
  console.log('🔧 Environment Configuration:', {
    environment: config.environment,
    apiUrl: config.apiUrl,
    enableDebug: config.enableDebug,
    enableAnalytics: config.enableAnalytics
  });
}

export default config;