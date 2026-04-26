/**
 * JWT Token Decoder Utility
 * Decodes JWT tokens without verification (front-end only)
 * Used to determine user type and role for routing
 */

interface DecodedToken {
  studentId?: number;
  registrationNumber?: string;
  schoolId?: number;
  id?: number;
  type?: 'student' | 'school';
  countryId?: number;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Decode a JWT token without verification
 * Note: This is only for determining user type client-side.
 * Token validation should always happen server-side!
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    if (!token) return null;

    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed (JWT uses URL-safe base64)
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    
    // Decode from base64
    const decoded = atob(padded);
    
    // Parse JSON
    const parsed: DecodedToken = JSON.parse(decoded);
    

    
    return parsed;
  } catch (error: any) {

    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const now = Date.now() / 1000; // Convert to seconds
    const isExpired = decoded.exp < now;
    

    
    return isExpired;
  } catch (error) {

    return true;
  }
};

/**
 * Get user type from token
 * Returns 'student', 'school', or null
 */
export const getUserTypeFromToken = (token: string): 'student' | 'school' | null => {
  try {
    const decoded = decodeToken(token);
    const userType = decoded?.type as 'student' | 'school' | null;
    

    
    return userType || null;
  } catch (error) {

    return null;
  }
};

/**
 * Extract user ID from token (works for both student and school)
 */
export const getUserIdFromToken = (token: string): number | null => {
  try {
    const decoded = decodeToken(token);
    
    // For students: use studentId
    // For schools: use id or schoolId
    const userId = decoded?.studentId || decoded?.id || decoded?.schoolId;
    

    
    return userId || null;
  } catch (error) {

    return null;
  }
};

/**
 * Extract school ID from token
 */
export const getSchoolIdFromToken = (token: string): number | null => {
  try {
    const decoded = decodeToken(token);
    const schoolId = decoded?.schoolId || decoded?.id;
    

    
    return schoolId || null;
  } catch (error) {

    return null;
  }
};

/**
 * Extract country ID from token
 */
export const getCountryIdFromToken = (token: string): number | null => {
  try {
    const decoded = decodeToken(token);
    const countryId = decoded?.countryId;
    

    
    return countryId || null;
  } catch (error) {

    return null;
  }
};
