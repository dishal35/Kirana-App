// Environment configuration for the application

export const config = {
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Shopkeeper UPI Tracker',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    isDev: import.meta.env.VITE_DEV_MODE === 'true',
  },
} as const;

// Validation function to check if required environment variables are set
export const validateConfig = (): { isValid: boolean; missingVars: string[] } => {
  const missingVars: string[] = [];

  if (!config.gemini.apiKey) {
    missingVars.push('VITE_GEMINI_API_KEY');
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

// Helper function to get API key with validation
export const getGeminiApiKey = (): string => {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your environment variables.');
  }
  return apiKey;
};