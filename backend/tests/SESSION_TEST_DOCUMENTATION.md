# Session Management Test Documentation

This document describes the comprehensive test coverage for the dashboard enhancement feature, specifically focusing on session management functionality.

## Test Coverage Overview

The test suite covers all requirements from the dashboard enhancement specification:

- **Requirement 4.1**: Session API endpoints return correct status codes
- **Requirement 4.2**: Session creation works for authorized teachers
- **Requirement 4.4**: Proper user permission validation
- **Requirement 4.5**: User-friendly error messages and input validation

## Test Structure

### Backend Tests

#### 1. Unit Tests (`test_session_service_unit.py`)

**Purpose**: Test individual SessionService methods in isolation

**Key Test Cases**:
- `test_generate_session_name_*`: Tests smart session naming logic
  - First session generates "Session 1"
  - Subsequent sessions increment correctly
  - Handles API errors gracefully with fallback
  - Handles network errors with fallback

- `test_create_session_with_defaults_*`: Tests session creation with smart defaults
  - Auto-generates names when not provided
  - Sets current datetime when not provided
  - Integrates with create_session method

- `test_create_session_*`: Tests core session creation
  - Successful creation with valid data
  - Handles API errors gracefully
  - Converts data types correctly (UUID to string, datetime to ISO)

- `test_get_sessions_by_subject_*`: Tests session retrieval
  - Returns paginated results correctly
  - Handles empty results
  - Calculates pagination offsets correctly
  - Adds computed fields (assignment_count, has_overdue_assignments)

- `test_check_user_access_*`: Tests permission checking
  - Teacher access to owned subjects
  - Student access to enrolled subjects
  - Proper access denial for unauthorized users
  - Session not found scenarios

- `test_mark_attendance_taken_*`: Tests attendance marking
  - Successful attendance marking
  - Error handling for API failures

**Mocking Strategy**:
- Uses `httpx.AsyncClient` mocks to simulate HTTP requests
- Tests both success and failure scenarios
- Verifies correct API calls are made with proper parameters

#### 2. Integration Tests (`test_session_integration.py`)

**Purpose**: Test complete workflows from API endpoints through services

**Key Test Cases**:
- `test_create_session_with_smart_defaults_success`: Full session creation flow
  - Tests API endpoint → service → database integration
  - Verifies smart defaults are applied
  - Checks response format matches SessionResponse model

- `test_create_session_with_provided_name`: Custom name handling
  - Verifies provided names are used instead of auto-generated ones

- `test_create_session_*_forbidden`: Permission testing
  - Teacher doesn't own subject
  - Student attempts to create session
  - Subject doesn't exist

- `test_get_sessions_after_creation_flow`: Complete read workflow
  - Tests session retrieval after creation
  - Verifies all required fields are present
  - Tests both teacher and student access

- `test_update_session_notes_flow`: Progressive notes management
  - Tests notes addition after session creation
  - Verifies update workflow

- `test_mark_attendance_taken_flow`: Attendance workflow
  - Tests complete attendance marking process

**Integration Points Tested**:
- FastAPI routing → authentication → service → database
- Error propagation through the stack
- Response model serialization

#### 3. Error Scenarios (`test_session_error_scenarios.py`)

**Purpose**: Test edge cases, error conditions, and boundary values

**Key Test Categories**:

**Input Validation**:
- Invalid UUID formats
- Malformed request data
- Missing required fields
- Extremely long strings
- Invalid data types

**Network and Database Errors**:
- Connection timeouts
- Database connection failures
- Malformed API responses
- Partial API failures

**Authentication and Authorization**:
- Missing authentication
- Permission edge cases
- Concurrent access scenarios

**Boundary Value Testing**:
- Pagination limits (page=0, page_size=0, page_size>100)
- Large datasets
- High page numbers

**Error Handling Verification**:
- User-friendly error messages
- Proper HTTP status codes
- Graceful degradation

#### 4. Existing Endpoint Tests (`test_session_endpoints.py`)

**Purpose**: Test API endpoints with mocked dependencies

**Coverage**:
- GET `/api/sessions/subject/{subject_id}` endpoint
- Authentication integration
- Permission checking
- Response format validation

### Frontend Tests

#### 1. Service Tests (`sessionService.test.ts`)

**Purpose**: Test SessionService class methods and error handling

**Key Test Areas**:
- **API Integration**: Tests all service methods with mocked API calls
- **Error Handling**: Tests retry logic, error parsing, and user-friendly messages
- **Data Transformation**: Tests request/response data handling
- **Retry Logic**: Tests exponential backoff and retry conditions

**Test Methods Covered**:
- `getSessionsBySubject()` - with and without error throwing
- `createSession()` - with smart defaults and error handling
- `updateSession()` and `updateSessionNotes()` - progressive notes management
- `deleteSession()` - with error scenarios
- Error utility methods (`getErrorMessage`, `isRetryableError`)

#### 2. End-to-End Tests (`sessionManagement.test.ts`)

**Purpose**: Test complete user workflows and UI interactions

**Requirements Coverage**:

**Requirement 1 - Default Sessions View**:
- Sessions list displays as default view
- Chronological ordering (most recent first)
- Empty state with "Create Session" button
- Session details display (name, date, attendance status)
- Notes indicator when notes exist

**Requirement 2 - Smart Session Creation**:
- Auto-generated session names
- Current date/time pre-population
- Essential fields only in creation form
- Progressive disclosure for advanced options

**Requirement 3 - Progressive Notes Management**:
- Notes not in creation form
- "Add Notes"/"Edit Notes" functionality
- Auto-save behavior simulation
- Notes indicator in session list

**Requirement 4 - Error Handling**:
- User-friendly error messages
- Graceful failure handling
- Network error scenarios

**Requirement 5 - Simplified Interface**:
- Limited navigation options (Sessions, Students, Settings)
- Progressive disclosure for advanced options
- Clean, focused UI

**Requirement 6 - Consistent Navigation**:
- Immediate feedback for user actions
- Proper form state management
- Success confirmations

## Test Execution

### Backend Test Execution

```bash
# Run all session tests
python backend/run_session_tests.py

# Run individual test files
python -m pytest backend/tests/test_session_service_unit.py -v
python -m pytest backend/tests/test_session_integration.py -v
python -m pytest backend/tests/test_session_error_scenarios.py -v

# Run with coverage
python -m pytest backend/tests/test_session_*.py --cov=app.services.session_service --cov=app.routers.sessions --cov-report=html
```

### Frontend Test Execution

```bash
# Run all frontend session tests
node frontend/run_session_tests.js

# Run individual test files
npx vitest run frontend/src/test/services/sessionService.test.ts
npx vitest run frontend/src/test/e2e/sessionManagement.test.ts

# Run with coverage
npx vitest run --coverage frontend/src/test/services/sessionService.test.ts frontend/src/test/e2e/sessionManagement.test.ts
```

## Test Data and Mocking

### Backend Mocking Strategy

- **HTTP Requests**: Mock `httpx.AsyncClient` for Supabase API calls
- **Authentication**: Mock `get_current_user_supabase` dependency
- **Database**: Mock `LocalSupabase` service methods
- **Time**: Use fixed datetime values for consistent testing

### Frontend Mocking Strategy

- **API Calls**: Mock the `apiCall` function from `lib/api`
- **Services**: Mock `sessionService` and `subjectService`
- **Components**: Use React Testing Library with mock components
- **User Interactions**: Use `@testing-library/user-event` for realistic interactions

## Coverage Goals

### Backend Coverage Targets
- **SessionService**: 95%+ line coverage
- **Session Router**: 90%+ line coverage
- **Error Scenarios**: 100% of error paths tested

### Frontend Coverage Targets
- **SessionService**: 95%+ line coverage
- **User Workflows**: 100% of critical user paths tested
- **Error Handling**: 90%+ of error scenarios covered

## Continuous Integration

### Test Automation
- All tests run on every pull request
- Coverage reports generated and tracked
- Performance regression testing for large datasets
- Cross-browser testing for frontend E2E tests

### Quality Gates
- Minimum 90% test coverage for new code
- All tests must pass before merge
- No new linting errors
- TypeScript compilation must succeed

## Maintenance

### Adding New Tests
1. Follow existing naming conventions
2. Use appropriate test categories (unit/integration/e2e)
3. Mock external dependencies appropriately
4. Include both success and failure scenarios
5. Update this documentation

### Test Data Management
- Use factory functions for creating test data
- Keep test data minimal and focused
- Use realistic but anonymized data
- Clean up test data after each test

## Troubleshooting

### Common Issues

**Backend Tests**:
- Import path issues: Ensure `backend` directory is in Python path
- Async test issues: Use `unittest.IsolatedAsyncioTestCase` for async tests
- Mock issues: Clear mocks between tests with `vi.clearAllMocks()`

**Frontend Tests**:
- Module mocking: Ensure mocks are set up before imports
- Async testing: Use `waitFor` for async operations
- Component testing: Wrap components in appropriate providers

### Debug Tips
- Use `console.log` or `print` statements for debugging
- Run individual tests to isolate issues
- Check mock call counts and arguments
- Verify test data matches expected formats