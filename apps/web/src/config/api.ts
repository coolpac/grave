/**
 * Centralized API configuration
 * Uses relative path in production, absolute URL in development
 */

// Determine if we're in development mode
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'

// Get API URL from environment or use relative path in production
export const API_URL = import.meta.env.VITE_API_URL || 
  (isDevelopment ? 'http://localhost:3000/api' : '/api')

// Export for use in other files
export default API_URL

