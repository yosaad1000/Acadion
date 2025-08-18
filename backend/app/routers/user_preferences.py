"""
User preferences API router for customization and advanced scheduling features.
Handles user preferences management, timezone conversion, conflict detection,
CSV import, and bulk operations.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.responses import JSONResponse

from ..models.user import UserResponse, UserType
from ..models.user_preferences import (
    UserPreferencesCreate, UserPreferencesUpdate, UserPreferencesResponse,
    TimezoneConversion, ConvertedDateTime,
    ConflictCheck, ConflictCheckResult,
    CSVImportRequest, CSVImportResult,
    BulkScheduleOperation, BulkOperationResult
)
from ..services.user_preferences_service import UserPreferencesService, UserPreferencesError
from ..routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()
preferences_service = UserPreferencesService()


def require_teacher(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency to ensure user is a teacher."""
    if current_user.user_type != UserType.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can perform this action"
        )
    return current_user


@router.get("/", response_model=UserPreferencesResponse)
async def get_user_preferences(
    current_user: UserResponse = Depends(get_current_user)
) -> UserPreferencesResponse:
    """
    Get user preferences for scheduling and calendar customization.
    
    Creates default preferences if none exist for the user.
    
    **Requirements:** 5.1 - Default duration preferences
    
    Args:
        current_user: Authenticated user
        
    Returns:
        UserPreferencesResponse: User's preferences
        
    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Getting preferences for user {current_user.user_id}")
        
        preferences = await preferences_service.get_user_preferences(current_user.user_id)
        
        logger.info(f"Retrieved preferences for user {current_user.user_id}")
        return preferences
        
    except UserPreferencesError as e:
        logger.error(f"Preferences error getting preferences: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error getting preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user preferences"
        )


@router.post("/", response_model=UserPreferencesResponse, status_code=status.HTTP_201_CREATED)
async def create_user_preferences(
    preferences: UserPreferencesCreate,
    current_user: UserResponse = Depends(get_current_user)
) -> UserPreferencesResponse:
    """
    Create user preferences with custom settings.
    
    **Requirements:** 5.1, 5.2, 5.3 - Customization preferences
    
    Args:
        preferences: Preference creation data
        current_user: Authenticated user
        
    Returns:
        UserPreferencesResponse: Created preferences
        
    Raises:
        HTTPException: If creation fails
    """
    try:
        logger.info(f"Creating preferences for user {current_user.user_id}")
        
        created_preferences = await preferences_service.create_user_preferences(
            user_id=current_user.user_id,
            preferences=preferences
        )
        
        logger.info(f"Created preferences for user {current_user.user_id}")
        return created_preferences
        
    except UserPreferencesError as e:
        logger.error(f"Preferences error creating preferences: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error creating preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user preferences"
        )


@router.put("/", response_model=UserPreferencesResponse)
async def update_user_preferences(
    updates: UserPreferencesUpdate,
    current_user: UserResponse = Depends(get_current_user)
) -> UserPreferencesResponse:
    """
    Update user preferences.
    
    **Requirements:** 5.1, 5.2, 5.3 - Customization preferences
    
    Args:
        updates: Preference updates
        current_user: Authenticated user
        
    Returns:
        UserPreferencesResponse: Updated preferences
        
    Raises:
        HTTPException: If update fails
    """
    try:
        logger.info(f"Updating preferences for user {current_user.user_id}")
        
        updated_preferences = await preferences_service.update_user_preferences(
            user_id=current_user.user_id,
            updates=updates
        )
        
        logger.info(f"Updated preferences for user {current_user.user_id}")
        return updated_preferences
        
    except UserPreferencesError as e:
        logger.error(f"Preferences error updating preferences: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error updating preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user preferences"
        )


@router.post("/timezone/convert", response_model=ConvertedDateTime)
async def convert_timezone(
    conversion: TimezoneConversion,
    current_user: UserResponse = Depends(get_current_user)
) -> ConvertedDateTime:
    """
    Convert datetime between timezones.
    
    **Requirements:** 5.4 - Timezone handling for multi-timezone scenarios
    
    Args:
        conversion: Timezone conversion request
        current_user: Authenticated user
        
    Returns:
        ConvertedDateTime: Converted datetime information
        
    Raises:
        HTTPException: If conversion fails
    """
    try:
        logger.info(f"Converting timezone for user {current_user.user_id}")
        
        converted = await preferences_service.convert_timezone(conversion)
        
        logger.info(f"Timezone converted successfully for user {current_user.user_id}")
        return converted
        
    except UserPreferencesError as e:
        logger.error(f"Preferences error converting timezone: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error converting timezone: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to convert timezone"
        )


@router.post("/conflicts/check", response_model=ConflictCheckResult)
async def check_schedule_conflicts(
    conflict_check: ConflictCheck,
    current_user: UserResponse = Depends(require_teacher)
) -> ConflictCheckResult:
    """
    Check for scheduling conflicts with existing schedules.
    
    Includes buffer time consideration and generates alternative time suggestions.
    
    **Requirements:** 5.3 - Buffer time settings between consecutive classes
    
    Args:
        conflict_check: Conflict check parameters
        current_user: Authenticated teacher user
        
    Returns:
        ConflictCheckResult: Conflict detection results with suggestions
        
    Raises:
        HTTPException: If conflict check fails or access denied
    """
    try:
        # Ensure user can only check conflicts for their own schedules
        if conflict_check.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only check conflicts for your own schedules"
            )
        
        logger.info(f"Checking schedule conflicts for user {current_user.user_id}")
        
        result = await preferences_service.check_schedule_conflicts(conflict_check)
        
        logger.info(f"Conflict check completed for user {current_user.user_id}: {len(result.conflicts)} conflicts found")
        return result
        
    except HTTPException:
        raise
    except UserPreferencesError as e:
        logger.error(f"Preferences error checking conflicts: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error checking conflicts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check schedule conflicts"
        )


@router.post("/import/csv", response_model=CSVImportResult)
async def import_schedules_from_csv(
    import_request: CSVImportRequest,
    current_user: UserResponse = Depends(require_teacher)
) -> CSVImportResult:
    """
    Import schedules from CSV data.
    
    Supports bulk schedule creation with timezone conversion and automatic
    calendar synchronization.
    
    **Requirements:** 5.6 - CSV import functionality for bulk schedule creation
    
    Args:
        import_request: CSV import request with data and options
        current_user: Authenticated teacher user
        
    Returns:
        CSVImportResult: Import results with success/failure details
        
    Raises:
        HTTPException: If import fails
    """
    try:
        logger.info(f"Starting CSV import for user {current_user.user_id}")
        
        result = await preferences_service.import_schedules_from_csv(
            user_id=current_user.user_id,
            import_request=import_request
        )
        
        logger.info(f"CSV import completed for user {current_user.user_id}: {result.successful_imports} created, {result.failed_imports} failed")
        return result
        
    except UserPreferencesError as e:
        logger.error(f"Preferences error importing CSV: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error importing CSV: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import schedules from CSV"
        )


@router.post("/import/csv-file", response_model=CSVImportResult)
async def import_schedules_from_csv_file(
    file: UploadFile = File(...),
    skip_header: bool = True,
    timezone: str = "UTC",
    auto_sync: bool = True,
    current_user: UserResponse = Depends(require_teacher)
) -> CSVImportResult:
    """
    Import schedules from uploaded CSV file.
    
    **Requirements:** 5.6 - CSV import functionality for bulk schedule creation
    
    Args:
        file: Uploaded CSV file
        skip_header: Whether to skip the first row as header
        timezone: Timezone for imported schedules
        auto_sync: Whether to auto-sync to calendar
        current_user: Authenticated teacher user
        
    Returns:
        CSVImportResult: Import results
        
    Raises:
        HTTPException: If file upload or import fails
    """
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a CSV file"
            )
        
        # Read file content
        content = await file.read()
        csv_data = content.decode('utf-8')
        
        # Create import request
        import_request = CSVImportRequest(
            csv_data=csv_data,
            skip_header=skip_header,
            timezone=timezone,
            auto_sync=auto_sync
        )
        
        logger.info(f"Starting CSV file import for user {current_user.user_id}: {file.filename}")
        
        result = await preferences_service.import_schedules_from_csv(
            user_id=current_user.user_id,
            import_request=import_request
        )
        
        logger.info(f"CSV file import completed for user {current_user.user_id}: {result.successful_imports} created")
        return result
        
    except HTTPException:
        raise
    except UserPreferencesError as e:
        logger.error(f"Preferences error importing CSV file: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error importing CSV file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import schedules from CSV file"
        )


@router.post("/bulk-operations", response_model=BulkOperationResult)
async def perform_bulk_operation(
    operation: BulkScheduleOperation,
    current_user: UserResponse = Depends(require_teacher)
) -> BulkOperationResult:
    """
    Perform bulk operations on multiple schedules.
    
    Supports bulk sync, delete, and update operations with detailed results.
    
    **Requirements:** Bulk operations for schedule management
    
    Args:
        operation: Bulk operation details
        current_user: Authenticated teacher user
        
    Returns:
        BulkOperationResult: Operation results
        
    Raises:
        HTTPException: If bulk operation fails
    """
    try:
        logger.info(f"Starting bulk operation '{operation.operation}' for user {current_user.user_id} on {len(operation.schedule_ids)} schedules")
        
        result = await preferences_service.perform_bulk_operation(
            user_id=current_user.user_id,
            operation=operation
        )
        
        logger.info(f"Bulk operation completed for user {current_user.user_id}: {result.successful_operations} successful, {result.failed_operations} failed")
        return result
        
    except UserPreferencesError as e:
        logger.error(f"Preferences error in bulk operation: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error in bulk operation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform bulk operation"
        )


@router.get("/csv-template")
async def get_csv_template(
    current_user: UserResponse = Depends(require_teacher)
) -> JSONResponse:
    """
    Get CSV template for schedule import.
    
    Returns the expected CSV format with column headers and example data.
    
    **Requirements:** 5.6 - CSV import functionality
    
    Args:
        current_user: Authenticated teacher user
        
    Returns:
        JSONResponse: CSV template information
    """
    try:
        template_info = {
            "headers": [
                "subject_id",
                "title", 
                "description",
                "start_date",
                "start_time",
                "duration_minutes",
                "recurrence_type",
                "recurrence_interval",
                "days_of_week",
                "end_date",
                "occurrence_count"
            ],
            "example_row": {
                "subject_id": "MATH101",
                "title": "Algebra Fundamentals",
                "description": "Introduction to algebraic concepts",
                "start_date": "2024-01-15",
                "start_time": "09:00",
                "duration_minutes": "60",
                "recurrence_type": "weekly",
                "recurrence_interval": "1",
                "days_of_week": "0,2,4",
                "end_date": "2024-05-15",
                "occurrence_count": ""
            },
            "field_descriptions": {
                "subject_id": "Subject identifier (required)",
                "title": "Class title (required)",
                "description": "Class description (optional)",
                "start_date": "Start date in YYYY-MM-DD format (required)",
                "start_time": "Start time in HH:MM format (required)",
                "duration_minutes": "Duration in minutes, 15-480 (optional, default: 60)",
                "recurrence_type": "weekly, biweekly, or custom (optional)",
                "recurrence_interval": "Interval for recurrence (optional, default: 1)",
                "days_of_week": "Comma-separated days 0-6 (0=Monday) (optional)",
                "end_date": "End date for recurrence in YYYY-MM-DD (optional)",
                "occurrence_count": "Number of occurrences (optional)"
            },
            "notes": [
                "All date fields should be in YYYY-MM-DD format",
                "Time fields should be in HH:MM format (24-hour)",
                "Days of week: 0=Monday, 1=Tuesday, ..., 6=Sunday",
                "Either end_date or occurrence_count can be specified for recurrence, not both",
                "If recurrence_type is specified, days_of_week should also be provided"
            ]
        }
        
        return JSONResponse(content=template_info)
        
    except Exception as e:
        logger.error(f"Error generating CSV template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate CSV template"
        )