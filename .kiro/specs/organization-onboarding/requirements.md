# Requirements Document

## Introduction

This feature creates a dedicated organization onboarding page that allows new organizations to register and set up their tenant authentication system. The page will be accessible from the landing page and will handle the complete organization setup process, including creating the organization record, verifying the administrator via email, and establishing tenant-scoped authentication. The enhanced flow includes an email verification step to ensure the administrator's email is valid before proceeding to organization details.

## Requirements

### Requirement 1

**User Story:** As a new organization administrator, I want to access an organization registration page from the landing page, so that I can create my organization's account and begin using the platform.

#### Acceptance Criteria

1. WHEN a user clicks "Get Started" or "Create Organization" on the landing page THEN the system SHALL redirect them to the organization onboarding page
2. WHEN the organization onboarding page loads THEN the system SHALL display a clean, professional form for organization registration
3. WHEN the page is accessed THEN the system SHALL not require any existing authentication

### Requirement 2

**User Story:** As a new organization administrator, I want to provide my administrator details through a simple form first, so that I can verify my identity before creating the organization.

#### Acceptance Criteria

1. WHEN the admin form is displayed THEN the system SHALL include fields for:
   - Administrator name (required)
   - Administrator email (required, will be used for verification and OAuth authentication)
2. WHEN a user enters administrator information THEN the system SHALL validate all required fields in real-time
3. WHEN the administrator email is entered THEN the system SHALL validate email format
4. WHEN all required fields are completed THEN the system SHALL enable the "Send Verification Code" button
5. WHEN the form is submitted THEN the system SHALL proceed to email verification step

### Requirement 3

**User Story:** As a new organization administrator, I want the system to navigate me to an admin form when I click "Create Organization", so that I can provide my details and verify my email address first.

#### Acceptance Criteria

1. WHEN the "Create Organization" button is clicked THEN the system SHALL navigate to the admin form page
2. WHEN the admin form loads THEN the system SHALL display fields for administrator name and email
3. WHEN the admin form is displayed THEN the system SHALL show a "Send Verification Code" button (enabled only when form is valid)
4. WHEN the admin form is submitted THEN the system SHALL store the administrator data temporarily for verification
5. IF there are any validation errors THEN the system SHALL display appropriate error messages

### Requirement 3.1

**User Story:** As a new organization administrator, I want to receive a verification code via email, so that I can prove I own the email address I provided.

#### Acceptance Criteria

1. WHEN the "Send Verification Code" button is clicked THEN the system SHALL generate a 6-digit verification code
2. WHEN the verification code is generated THEN the system SHALL send an email to the administrator's email address containing the code
3. WHEN the email is sent THEN the system SHALL display a message confirming the email was sent
4. WHEN the email is sent THEN the system SHALL show an input field for entering the verification code
5. WHEN the verification code is sent THEN the system SHALL set an expiration time of 10 minutes for the code
6. IF the email sending fails THEN the system SHALL display an error message and allow retry

### Requirement 3.2

**User Story:** As a new organization administrator, I want to enter the verification code I received, so that I can verify my email and proceed to organization details form.

#### Acceptance Criteria

1. WHEN the verification code input is displayed THEN the system SHALL show a 6-digit input field
2. WHEN a user enters a verification code THEN the system SHALL validate the code format in real-time
3. WHEN the "Verify Code" button is clicked THEN the system SHALL check if the code matches and is not expired
4. WHEN the verification code is correct and not expired THEN the system SHALL mark the admin as verified and navigate to the organization details form
5. WHEN the verification code is incorrect THEN the system SHALL display an error message and allow retry
6. WHEN the verification code is expired THEN the system SHALL display an expiration message and offer to resend the code
7. WHEN the verification is successful THEN the system SHALL store the verified admin information and proceed to organization creation

### Requirement 3.3

**User Story:** As a verified organization administrator, I want to access the organization details form after email verification, so that I can provide my organization information and complete the setup.

#### Acceptance Criteria

1. WHEN email verification is successful THEN the system SHALL navigate to the organization details form
2. WHEN the organization details form loads THEN the system SHALL display fields for:
   - Organization name (required, must be unique)
   - Organization domain (optional, for future use)
   - Organization description (optional)
3. WHEN a user enters organization information THEN the system SHALL validate all required fields in real-time
4. WHEN the organization name is entered THEN the system SHALL check for uniqueness against the organizations table and display availability status
5. WHEN the "Create Organization" button is clicked THEN the system SHALL create the organization record in the public.organizations table with:
   - Generated organization_id (UUID)
   - Organization name from the form
   - Organization domain from the form (if provided)
   - is_active set to true
   - created_at and updated_at timestamps
6. WHEN the organization is created successfully THEN the system SHALL proceed to success page
7. IF the organization creation fails THEN the system SHALL display appropriate error messages

### Requirement 4

**User Story:** As a new organization administrator, I want to be able to resend the verification code if I don't receive it, so that I can complete the verification process.

#### Acceptance Criteria

1. WHEN the verification code email is sent THEN the system SHALL display a "Resend Code" button after 60 seconds
2. WHEN the "Resend Code" button is clicked THEN the system SHALL generate a new verification code and invalidate the previous one
3. WHEN a new code is sent THEN the system SHALL reset the 10-minute expiration timer
4. WHEN the resend is successful THEN the system SHALL display a confirmation message
5. WHEN multiple resend attempts are made THEN the system SHALL limit to maximum 3 resend attempts per session
6. IF the resend limit is reached THEN the system SHALL display an error message and suggest contacting support

### Requirement 5

**User Story:** As a new organization administrator, I want clear feedback during the registration and verification process, so that I understand what's happening and can resolve any issues.

#### Acceptance Criteria

1. WHEN any form is being submitted THEN the system SHALL display a loading state with progress indicators
2. WHEN validation errors occur THEN the system SHALL display specific error messages next to the relevant fields
3. WHEN the email verification fails THEN the system SHALL display a clear error message with suggested actions
4. WHEN the verification code is sent THEN the system SHALL display a success message with instructions
5. WHEN the organization is successfully created THEN the system SHALL display a success message before redirecting
6. WHEN the user needs to go back to previous steps THEN the system SHALL provide clear navigation options

### Requirement 6

**User Story:** As a system architect, I want to support organization administrators as a separate role from teachers, so that organizations can have dedicated admin users who manage the organization but may not teach classes.

#### Acceptance Criteria

1. WHEN the database schema is updated THEN the system SHALL add 'admin' as a valid role in the active_role check constraint
2. WHEN an organization administrator is created THEN the system SHALL set their active_role to 'admin'
3. WHEN an admin user accesses the system THEN they SHALL have organization management permissions
4. WHEN an admin wants to teach classes THEN they SHALL be able to switch their role to 'teacher'
5. WHEN displaying user roles THEN the system SHALL show 'admin', 'teacher', and 'student' as available options

### Requirement 7

**User Story:** As a system administrator, I want the organization onboarding process to be secure and prevent duplicate organizations, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN an organization name is already taken THEN the system SHALL prevent submission and suggest alternatives
2. WHEN a domain is provided and already associated with another organization THEN the system SHALL display an error and prevent creation
3. WHEN the verification code is generated THEN the system SHALL store it securely with proper expiration
4. WHEN verification codes are stored THEN the system SHALL ensure they cannot be guessed or brute-forced
5. WHEN the organization is created THEN the system SHALL enforce proper tenant isolation from the start
6. WHEN user authentication is established THEN the system SHALL ensure the user is properly scoped to their organization

### Requirement 8

**User Story:** As a system architect, I want to update the database schema to support organization domains, admin roles, and email verification, so that the onboarding process can capture and store all necessary information.

#### Acceptance Criteria

1. WHEN the organizations table is updated THEN it SHALL include a 'domain' field (varchar, optional)
2. WHEN the users table active_role constraint is updated THEN it SHALL include 'admin' as a valid role option
3. WHEN the database schema is updated THEN it SHALL include a table for storing verification codes with expiration times
4. WHEN verification codes are stored THEN they SHALL be associated with email addresses and have proper indexing
5. WHEN the schema changes are applied THEN existing data SHALL remain intact and functional
6. WHEN new organizations are created THEN they SHALL be able to store domain information
7. WHEN new admin users are created THEN they SHALL be able to have 'admin' as their active_role

### Requirement 9

**User Story:** As a user, I want the organization onboarding and verification pages to be responsive and accessible, so that I can complete registration on any device.

#### Acceptance Criteria

1. WHEN any page in the onboarding flow is accessed on mobile devices THEN the system SHALL display a mobile-optimized layout
2. WHEN any page in the onboarding flow is accessed on desktop THEN the system SHALL display a centered, professional form layout
3. WHEN using keyboard navigation THEN the system SHALL support proper tab order and focus management across all forms
4. WHEN using screen readers THEN the system SHALL provide appropriate labels and descriptions for all form elements including verification code inputs
5. WHEN the verification code input is displayed THEN it SHALL be accessible and clearly labeled for screen readers
6. WHEN error messages are displayed THEN they SHALL be announced to screen readers appropriately