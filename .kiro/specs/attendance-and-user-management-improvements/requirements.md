# Requirements Document

## Introduction

This specification addresses critical issues with the attendance tracking system and adds essential user management features to the Acadion platform. The current system has problems with attendance data persistence, incorrect student counts, and lacks basic user management functionality like unenrolling from classes and updating profile information.

## Requirements

### Requirement 1: Fix Attendance Data Persistence

**User Story:** As a teacher, I want all attendance sessions to be properly stored and displayed in the dashboard, so that I can track student attendance over time accurately.

#### Acceptance Criteria

1. WHEN a teacher marks attendance multiple times THEN each session SHALL be stored as a separate record in the database
2. WHEN a teacher views the attendance dashboard THEN all recorded sessions SHALL be displayed with correct dates and statistics
3. WHEN attendance is marked via face recognition THEN the system SHALL store records for all recognized students who are enrolled in the subject
4. IF attendance already exists for a student on the same date THEN the system SHALL create a new record with a unique timestamp rather than updating the existing one

### Requirement 2: Fix Student Count Display Issues

**User Story:** As a teacher, I want to see accurate student counts for each class, so that I can understand the enrollment status of my subjects.

#### Acceptance Criteria

1. WHEN a teacher views their dashboard THEN each class card SHALL display the correct number of enrolled students
2. WHEN a teacher enters a specific class THEN the class information SHALL show the accurate student count
3. WHEN the system calculates student counts THEN it SHALL query the actual enrollment records from the database
4. IF there are no enrolled students THEN the system SHALL display "0" rather than showing inconsistent numbers

### Requirement 3: Add Class Unenrollment Feature

**User Story:** As a student, I want to unenroll from a class I no longer need, so that I can manage my class list and remove irrelevant subjects.

#### Acceptance Criteria

1. WHEN a student views their enrolled classes THEN each class SHALL have an "Unenroll" option available
2. WHEN a student clicks "Unenroll" THEN the system SHALL prompt for confirmation before proceeding
3. WHEN a student confirms unenrollment THEN the system SHALL remove them from the subject_enrollments table
4. WHEN a student unenrolls THEN the class SHALL no longer appear in their dashboard
5. WHEN a student unenrolls THEN the teacher's student count for that class SHALL be updated accordingly

### Requirement 4: Add User Profile Management

**User Story:** As a user (teacher or student), I want to update my profile information including name, email, password, and face registration, so that I can keep my account information current and secure.

#### Acceptance Criteria

1. WHEN a user accesses their profile settings THEN they SHALL be able to update their name and email address
2. WHEN a user wants to change their password THEN they SHALL be required to enter their current password for verification
3. WHEN a student wants to update their face registration THEN they SHALL be able to upload a new photo to replace their existing face encoding
4. WHEN a user updates their profile THEN the changes SHALL be reflected immediately across the application
5. WHEN a user updates their face registration THEN the old face encoding SHALL be removed from Pinecone and replaced with the new one
6. IF a user enters an invalid current password THEN the system SHALL reject the password change request
7. WHEN a user successfully updates their profile THEN they SHALL receive a confirmation message

### Requirement 5: Add Class Settings and Management

**User Story:** As a teacher, I want to access class settings to manage class information and student enrollment, so that I can maintain control over my classroom environment.

#### Acceptance Criteria

1. WHEN a teacher views a class THEN there SHALL be a settings button accessible from the class header
2. WHEN a teacher clicks the settings button THEN they SHALL see options to edit class information
3. WHEN a teacher accesses class settings THEN they SHALL be able to update the class name and description
4. WHEN a teacher views class settings THEN they SHALL see a list of enrolled students with options to remove them
5. WHEN a teacher removes a student from class settings THEN the student SHALL be unenrolled from the subject
6. WHEN class information is updated THEN the changes SHALL be reflected immediately in all relevant views