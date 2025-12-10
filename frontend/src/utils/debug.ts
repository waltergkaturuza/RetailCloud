/**
 * Debug utilities for troubleshooting
 */

export const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data || '');
  }
};

export const logError = (error: Error, context?: string) => {
  console.error(`[ERROR]${context ? ` [${context}]` : ''}`, error);
  // In production, you might want to send this to an error tracking service
};


