/**
 * Utility functions for consistent date/time handling across the application
 * Fixes timezone issues by ensuring all date operations use local timezone
 */

/**
 * Gets the current local date in YYYY-MM-DD format
 * Avoids UTC conversion issues
 */
export const getCurrentLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Gets the current local time in HH:MM format
 * Avoids UTC conversion issues
 */
export const getCurrentLocalTime = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Converts a date string to local date components
 * Avoids timezone conversion by working with date components directly
 */
export const getLocalDateComponents = (dateString: string) => {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds()
  };
};

/**
 * Formats a date string for display, avoiding timezone issues
 * Returns relative dates (Today, Tomorrow, Yesterday) when appropriate
 */
export const formatDateForDisplay = (dateString?: string) => {
  if (!dateString) return null;
  
  const dateComponents = getLocalDateComponents(dateString);
  if (!dateComponents) return null;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  
  // Create date objects using local date components (no time)
  const sessionDateOnly = new Date(dateComponents.year, dateComponents.month, dateComponents.day);
  const currentDateOnly = new Date(currentYear, currentMonth, currentDay);
  
  // Calculate difference in days
  const diffTime = sessionDateOnly.getTime() - currentDateOnly.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return { text: 'Today', urgent: true };
  if (diffDays === 1) return { text: 'Tomorrow', urgent: true };
  if (diffDays === -1) return { text: 'Yesterday', urgent: false };
  if (diffDays > 1 && diffDays <= 7) return { text: `In ${diffDays} days`, urgent: false };
  if (diffDays < -1 && diffDays >= -7) return { text: `${Math.abs(diffDays)} days ago`, urgent: false };
  
  // For dates further away, use local date formatting
  return { 
    text: sessionDateOnly.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: dateComponents.year !== currentYear ? 'numeric' : undefined
    }), 
    urgent: false 
  };
};

/**
 * Formats a datetime string for detailed display
 * Returns both date and time in local timezone
 */
export const formatDateTimeForDisplay = (dateString?: string) => {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return null;
  
  const now = new Date();
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return {
    date: date.toLocaleDateString('en-US', dateOptions),
    time: date.toLocaleTimeString('en-US', timeOptions),
    isPast: date < now,
    isToday: date.toDateString() === now.toDateString()
  };
};

/**
 * Creates a local datetime string from date and time inputs
 * Avoids timezone conversion issues
 */
export const createLocalDateTime = (dateString: string, timeString: string): string => {
  return `${dateString}T${timeString}:00`;
};

/**
 * Formats a Date object to YYYY-MM-DD format for input fields
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a Date object to HH:MM format for input fields
 */
export const formatTimeForInput = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Validates if a datetime is in the acceptable range
 * Includes grace period for current time sessions
 */
export const validateDateTime = (
  dateString: string, 
  timeString: string, 
  gracePeriodMinutes: number = 5
): { isValid: boolean; error?: string } => {
  try {
    const dateTimeString = createLocalDateTime(dateString, timeString);
    const sessionDateTime = new Date(dateTimeString);
    
    if (isNaN(sessionDateTime.getTime())) {
      return { isValid: false, error: 'Please enter a valid date and time' };
    }

    const now = new Date();
    
    // Check if datetime is in the past (only if date is today)
    const sessionComponents = getLocalDateComponents(dateTimeString);
    const nowComponents = {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate()
    };
    
    if (sessionComponents && 
        sessionComponents.year === nowComponents.year &&
        sessionComponents.month === nowComponents.month &&
        sessionComponents.day === nowComponents.day &&
        sessionDateTime < now) {
      
      // Calculate time difference in minutes
      const timeDiffMinutes = (now.getTime() - sessionDateTime.getTime()) / (1000 * 60);
      
      if (timeDiffMinutes > gracePeriodMinutes) {
        return { 
          isValid: false, 
          error: `Session time cannot be more than ${gracePeriodMinutes} minutes in the past` 
        };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Please enter a valid date and time' };
  }
};