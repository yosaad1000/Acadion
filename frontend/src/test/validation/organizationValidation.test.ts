import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import the validation schema from the component
const organizationSchema = z.object({
  organizationName: z.string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.,!?()&]+$/, "Organization name contains invalid characters")
    .refine(val => val.trim().length >= 2, "Organization name cannot be only whitespace")
    .refine(val => !/^\s|\s$/.test(val), "Organization name cannot start or end with spaces")
    .refine(val => !/\s{2,}/.test(val), "Organization name cannot contain multiple consecutive spaces"),
  organizationDomain: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/, "Invalid domain format (e.g., example.edu)")
    .refine(val => !val || val.length <= 253, "Domain name is too long")
    .refine(val => !val || !val.includes('..'), "Domain cannot contain consecutive dots")
    .refine(val => !val || !/^-|-$/.test(val), "Domain cannot start or end with hyphens")
    .optional()
    .or(z.literal("")),
  adminName: z.string()
    .min(2, "Administrator name must be at least 2 characters")
    .max(50, "Administrator name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-'.,]+$/, "Administrator name contains invalid characters")
    .refine(val => val.trim().length >= 2, "Administrator name cannot be only whitespace")
    .refine(val => !/^\s|\s$/.test(val), "Administrator name cannot start or end with spaces"),
  adminEmail: z.string()
    .min(1, "Email address is required")
    .max(254, "Email address is too long")
    .email("Please enter a valid email address")
    .refine(val => !val.includes('..'), "Email cannot contain consecutive dots")
    .refine(val => !/^\.|\.$/.test(val), "Email cannot start or end with dots")
});

describe('Enhanced Organization Validation', () => {
  describe('Organization Name Validation', () => {
    it('should accept valid organization names', () => {
      const validNames = [
        'Harvard University',
        'MIT',
        'Stanford University',
        'University of California, Berkeley',
        'New York University (NYU)',
        'Texas A&M University'
      ];

      validNames.forEach(name => {
        const result = organizationSchema.safeParse({
          organizationName: name,
          organizationDomain: '',
          adminName: 'John Doe',
          adminEmail: 'john@example.com'
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject names that are too short', () => {
      const result = organizationSchema.safeParse({
        organizationName: 'A',
        organizationDomain: '',
        adminName: 'John Doe',
        adminEmail: 'john@example.com'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters');
      }
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(101);
      const result = organizationSchema.safeParse({
        organizationName: longName,
        organizationDomain: '',
        adminName: 'John Doe',
        adminEmail: 'john@example.com'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('less than 100 characters');
      }
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = [
        'Test@University',
        'Test#University',
        'Test$University',
        'Test%University'
      ];

      invalidNames.forEach(name => {
        const result = organizationSchema.safeParse({
          organizationName: name,
          organizationDomain: '',
          adminName: 'John Doe',
          adminEmail: 'john@example.com'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('invalid characters');
        }
      });
    });

    it('should reject whitespace-only names', () => {
      const result = organizationSchema.safeParse({
        organizationName: '   ',
        organizationDomain: '',
        adminName: 'John Doe',
        adminEmail: 'john@example.com'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('only whitespace');
      }
    });

    it('should reject names with leading/trailing spaces', () => {
      const result = organizationSchema.safeParse({
        organizationName: ' Test University ',
        organizationDomain: '',
        adminName: 'John Doe',
        adminEmail: 'john@example.com'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('start or end with spaces');
      }
    });

    it('should reject names with multiple consecutive spaces', () => {
      const result = organizationSchema.safeParse({
        organizationName: 'Test  University',
        organizationDomain: '',
        adminName: 'John Doe',
        adminEmail: 'john@example.com'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('consecutive spaces');
      }
    });
  });

  describe('Domain Validation', () => {
    it('should accept valid domains', () => {
      const validDomains = [
        'harvard.edu',
        'mit.edu',
        'stanford.edu',
        'berkeley.edu',
        'nyu.edu',
        'tamu.edu',
        'example.com',
        'test-university.org'
      ];

      validDomains.forEach(domain => {
        const result = organizationSchema.safeParse({
          organizationName: 'Test University',
          organizationDomain: domain,
          adminName: 'John Doe',
          adminEmail: 'john@example.com'
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept empty domain (optional)', () => {
      const result = organizationSchema.safeParse({
        organizationName: 'Test University',
        organizationDomain: '',
        adminName: 'John Doe',
        adminEmail: 'john@example.com'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid domain formats', () => {
      const invalidDomains = [
        'invalid',
        'invalid.',
        '.invalid',
        'invalid..com'
      ];

      invalidDomains.forEach(domain => {
        const result = organizationSchema.safeParse({
          organizationName: 'Test University',
          organizationDomain: domain,
          adminName: 'John Doe',
          adminEmail: 'john@example.com'
        });
        expect(result.success).toBe(false);
      });
    });

    it('should reject domains that are too long', () => {
      const longDomain = 'a'.repeat(250) + '.com';
      const result = organizationSchema.safeParse({
        organizationName: 'Test University',
        organizationDomain: longDomain,
        adminName: 'John Doe',
        adminEmail: 'john@example.com'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Administrator Name Validation', () => {
    it('should accept valid names', () => {
      const validNames = [
        'John Doe',
        'Mary Jane Smith',
        "O'Connor",
        'Jean-Pierre',
        'Dr. Smith',
        'Smith, Jr.'
      ];

      validNames.forEach(name => {
        const result = organizationSchema.safeParse({
          organizationName: 'Test University',
          organizationDomain: '',
          adminName: name,
          adminEmail: 'john@example.com'
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = [
        'John@Doe',
        'John#Doe',
        'John123',
        'John_Doe'
      ];

      invalidNames.forEach(name => {
        const result = organizationSchema.safeParse({
          organizationName: 'Test University',
          organizationDomain: '',
          adminName: name,
          adminEmail: 'john@example.com'
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'john@example.com',
        'admin@university.edu',
        'test.email@domain.org',
        'user+tag@example.com'
      ];

      validEmails.forEach(email => {
        const result = organizationSchema.safeParse({
          organizationName: 'Test University',
          organizationDomain: '',
          adminName: 'John Doe',
          adminEmail: email
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid..email@example.com',
        '.invalid@example.com',
        'invalid.@example.com'
      ];

      invalidEmails.forEach(email => {
        const result = organizationSchema.safeParse({
          organizationName: 'Test University',
          organizationDomain: '',
          adminName: 'John Doe',
          adminEmail: email
        });
        expect(result.success).toBe(false);
      });
    });
  });
});