/**
 * Tests for session validation utilities
 */

import {
  validateSessionName,
  validateSessionDescription,
  validateSessionDate,
  validateSessionDateTime,
  validateSessionCreate,
  validateSessionUpdate,
  validateSessionNotes,
  validateFieldRealTime,
  getFieldErrors,
  hasFieldError,
  DEFAULT_SESSION_VALIDATION_RULES
} from '../sessionValidation';

describe('Session Validation', () => {
  describe('validateSessionName', () => {
    it('should pass for valid session names', () => {
      const validNames = [
        'Session 1',
        'Math Class - Chapter 5',
        'Test Session (Final)',
        'Session_2024',
        'Advanced Topics!'
      ];

      validNames.forEach(name => {
        const errors = validateSessionName(name);
        expect(errors).toHaveLength(0);
      });
    });

    it('should fail for invalid session names', () => {
      const invalidCases = [
        { name: 'A'.repeat(101), expectedError: 'MAX_LENGTH' }, // Too long
        { name: 'Session<script>', expectedError: 'INVALID_PATTERN' }, // Invalid characters
        { name: 'Session@#$%^&*', expectedError: 'INVALID_PATTERN' } // Invalid characters
      ];

      invalidCases.forEach(({ name, expectedError }) => {
        const errors = validateSessionName(name);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].code).toBe(expectedError);
      });

      // Test empty names with required rule
      const emptyErrors = validateSessionName('', { required: true });
      expect(emptyErrors.length).toBeGreaterThan(0);
      expect(emptyErrors[0].code).toBe('REQUIRED');

      // Test spaces-only names with required rule
      const spacesErrors = validateSessionName('   ', { required: true });
      expect(spacesErrors.length).toBeGreaterThan(0);
      expect(spacesErrors[0].code).toBe('REQUIRED');
    });

    it('should handle undefined/null names when not required', () => {
      const errors = validateSessionName(undefined, { required: false });
      expect(errors).toHaveLength(0);
    });

    it('should fail for undefined names when required', () => {
      const errors = validateSessionName(undefined, { required: true });
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('REQUIRED');
    });
  });

  describe('validateSessionDescription', () => {
    it('should pass for valid descriptions', () => {
      const validDescriptions = [
        'This is a test session',
        '', // Empty is valid
        undefined, // Undefined is valid
        'A'.repeat(500) // Max length
      ];

      validDescriptions.forEach(description => {
        const errors = validateSessionDescription(description);
        expect(errors).toHaveLength(0);
      });
    });

    it('should fail for descriptions that are too long', () => {
      const longDescription = 'A'.repeat(501);
      const errors = validateSessionDescription(longDescription);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MAX_LENGTH');
    });
  });

  describe('validateSessionDate', () => {
    it('should pass for valid future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      const errors = validateSessionDate(dateString);
      expect(errors).toHaveLength(0);
    });

    it('should fail for past dates when not allowed', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];

      const errors = validateSessionDate(dateString, { allowPastDates: false });
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('PAST_DATE');
    });

    it('should fail for invalid date strings', () => {
      const errors = validateSessionDate('invalid-date');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_DATE');
    });

    it('should handle undefined dates when not required', () => {
      const errors = validateSessionDate(undefined, { required: false });
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateSessionDateTime', () => {
    it('should pass for valid future datetime', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      const timeString = '10:00';

      const errors = validateSessionDateTime(dateString, timeString);
      expect(errors).toHaveLength(0);
    });

    it('should fail for past datetime on same day', () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const dateString = now.toISOString().split('T')[0];
      const timeString = pastTime.toTimeString().slice(0, 5);

      const errors = validateSessionDateTime(dateString, timeString);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('PAST_TIME');
    });

    it('should handle missing date or time', () => {
      const errors1 = validateSessionDateTime(undefined, '10:00');
      const errors2 = validateSessionDateTime('2024-12-01', undefined);
      
      expect(errors1).toHaveLength(0);
      expect(errors2).toHaveLength(0);
    });
  });

  describe('validateSessionCreate', () => {
    it('should pass for valid session creation data', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const sessionData = {
        name: 'Test Session',
        description: 'A test session',
        session_date: tomorrow.toISOString()
      };

      const result = validateSessionCreate(sessionData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for minimal session data', () => {
      const sessionData = {}; // All fields optional for creation

      const result = validateSessionCreate(sessionData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for invalid session data', () => {
      const sessionData = {
        name: 'A'.repeat(101), // Too long
        description: 'B'.repeat(501), // Too long
        session_date: 'invalid-date'
      };

      const result = validateSessionCreate(sessionData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSessionUpdate', () => {
    it('should pass for valid update data', () => {
      const sessionData = {
        name: 'Updated Session',
        description: 'Updated description'
      };

      const result = validateSessionUpdate(sessionData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for invalid update data', () => {
      const sessionData = {
        name: '', // Empty name not allowed for updates
        description: 'C'.repeat(501) // Too long
      };

      const result = validateSessionUpdate(sessionData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSessionNotes', () => {
    it('should pass for valid notes', () => {
      const validNotes = [
        'These are some notes',
        '', // Empty is valid
        undefined, // Undefined is valid
        'A'.repeat(2000) // Max length
      ];

      validNotes.forEach(notes => {
        const errors = validateSessionNotes(notes);
        expect(errors).toHaveLength(0);
      });
    });

    it('should fail for notes that are too long', () => {
      const longNotes = 'A'.repeat(2001);
      const errors = validateSessionNotes(longNotes);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MAX_LENGTH');
    });
  });

  describe('validateFieldRealTime', () => {
    it('should validate different field types correctly', () => {
      const nameErrors = validateFieldRealTime('name', 'Valid Name');
      const descErrors = validateFieldRealTime('description', 'Valid description');
      const notesErrors = validateFieldRealTime('notes', 'Valid notes');

      expect(nameErrors).toHaveLength(0);
      expect(descErrors).toHaveLength(0);
      expect(notesErrors).toHaveLength(0);
    });

    it('should return empty array for unknown fields', () => {
      const errors = validateFieldRealTime('unknown_field', 'value');
      expect(errors).toHaveLength(0);
    });
  });

  describe('Helper functions', () => {
    it('should get field errors correctly', () => {
      const errors = [
        { field: 'name', message: 'Name error', code: 'ERROR' },
        { field: 'description', message: 'Description error', code: 'ERROR' },
        { field: 'name', message: 'Another name error', code: 'ERROR2' }
      ];

      const nameErrors = getFieldErrors(errors, 'name');
      const descErrors = getFieldErrors(errors, 'description');
      const unknownErrors = getFieldErrors(errors, 'unknown');

      expect(nameErrors).toHaveLength(2);
      expect(descErrors).toHaveLength(1);
      expect(unknownErrors).toHaveLength(0);
    });

    it('should check field errors correctly', () => {
      const errors = [
        { field: 'name', message: 'Name error', code: 'ERROR' }
      ];

      expect(hasFieldError(errors, 'name')).toBe(true);
      expect(hasFieldError(errors, 'description')).toBe(false);
    });
  });
});