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
      console.error('❌ Invalid token format');
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
    
    console.log('✅ Token decoded successfully:', {
      type: parsed.type,
      studentId: parsed.studentId || 'N/A',
      schoolId: parsed.schoolId || 'N/A',
      countryId: parsed.countryId || 'N/A',
    });
    
    return parsed;
  } catch (error: any) {
    console.error('❌ Token decode error:', error.message);
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
    
    if (isExpired) {
      console.warn('⚠️ Token is expired');
    }
    
    return isExpired;
  } catch (error) {
    console.error('❌ Token expiration check error:', error);
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
    
    if (!userType) {
      console.warn('⚠️ User type not found in token');
    }
    
    return userType || null;
  } catch (error) {
    console.error('❌ Error getting user type:', error);
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
    
    if (!userId) {
      console.warn('⚠️ User ID not found in token');
    }
    
    return userId || null;
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
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
    
    if (!schoolId) {
      console.warn('⚠️ School ID not found in token');
    }
    
    return schoolId || null;
  } catch (error) {
    console.error('❌ Error getting school ID:', error);
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
    
    if (!countryId) {
      console.warn('⚠️ Country ID not found in token');
    }
    
    return countryId || null;
  } catch (error) {
    console.error('❌ Error getting country ID:', error);
    return null;
  }
};
