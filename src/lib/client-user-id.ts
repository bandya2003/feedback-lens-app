
'use client';

/**
 * @fileOverview Utility to get or generate a client-side user ID.
 * This ID is stored in localStorage to provide basic data segregation for a prototype.
 * It is NOT a secure authentication system.
 */

const USER_ID_KEY = 'feedbackLensUserId_v1'; // Added _v1 for potential future changes

export function getClientUserId(): string | null {
  // localStorage is only available in the browser environment.
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    // This might happen during SSR or in environments without localStorage.
    // For a prototype, we might return null and let the calling code handle it,
    // or log a warning. For now, returning null and letting flows potentially
    // error out if a userId is strictly required might be okay for dev.
    // console.warn("localStorage is not available. Cannot retrieve or generate client user ID.");
    return null; 
  }

  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Basic UUID v4-like generator
    userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}
