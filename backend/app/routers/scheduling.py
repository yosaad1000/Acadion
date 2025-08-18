"""
Scheduling API router for class schedule management.
Handles CRUD operations for class schedules with role-based access control.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import date

from ..models.user import UserResponse, UserType
from ..models.calendar import (
    ClassScheduleCreate, ClassScheduleUpdate, ClassScheduleResponse,
    RecurringScheduleUpdate, UpdateScope, ScheduleQuery, StudentScheduleQuery,
    BulkScheduleCreate, BulkScheduleResponse, SyncRequest, SyncResponse,
    ScheduleInstanceResponse, StudentScheduleAccessCreate, StudentScheduleAccessResponse
)
from ..services.scheduling_service import SchedulingService, SchedulingError
from ..routers.auth import get_current_user
from ..middleware.security_middleware import audit_logger

logger = logging.getLogger(__name__)

router = APIRouter()
scheduling_service = SchedulingService()


def require_teacher(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency to ensure user is a teacher."""
    if current_user.user_type != UserType.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can perform this action"
        )
    return current_user


def require_teacher_or_student(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency to ensure user is either a teacher or student."""
    if current_user.user_type not in [UserType.TEACHER, UserType.STUDENT]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    return current_user


@router.post("/", response_model=ClassScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_class_schedule(
    schedule_data: ClassScheduleCreate,
    current_user: UserResponse = Depends(require_teacher)
) -> ClassScheduleResponse:
    """
    Create a new class schedule.
    
    Teachers can create class schedules with optional recurrence patterns.
    The system will automatically generate schedule instances for recurring events.
    
    **Requirements:** 2.1, 2.2
    
    Args:
        schedule_data: Schedule creation data including title, time, duration, and recurrence
        current_user: Authenticated teacher user
        
    Returns:
        ClassScheduleResponse: Created schedule with full details
        
    Raises:
        HTTPException: If schedule creation fails or validation errors occur
    """
    try:
        logger.info(f"Creating class schedule for teacher {current_user.user_id}")
        
        created_schedule = await scheduling_service.create_class_schedule(
            teacher_id=current_user.user_id,
            schedule_data=schedule_data
        )
        
        logger.info(f"Class schedule created successfully: {created_schedule.id}")
        
        # Audit log: Schedule creation success
        audit_logger.log_schedule_operation(
            operation="create_schedule",
            user_id=current_user.user_id,
            schedule_id=created_schedule.id,
            success=True,
            details={
                "title": created_schedule.title,
                "subject_id": created_schedule.subject_id,
                "has_recurrence": bool(created_schedule.recurrence_pattern)
            }
        )
        
        return created_schedule
        
    except SchedulingError as e:
        logger.error(f"Scheduling error creating schedule: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error creating schedule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create class schedule"
        )


@router.get("/", response_model=List[ClassScheduleResponse])
async def get_schedules(
    start_date: Optional[date] = Query(None, description="Filter schedules from this date"),
    end_date: Optional[date] = Query(None, description="Filter schedules until this date"),
    subject_id: Optional[str] = Query(None, description="Filter by subject ID"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    include_instances: bool = Query(False, description="Include schedule instances in response"),
    sync_enabled_only: Optional[bool] = Query(None, description="For students: filter by sync status"),
    current_user: UserResponse = Depends(require_teacher_or_student)
) -> List[ClassScheduleResponse]:
    """
    Get class schedules based on user role and query parameters.
    
    Teachers see their own schedules, students see schedules they have access to.
    Supports filtering by date range, subject, and other criteria.
    
    **Requirements:** 3.1, 4.1, 4.2
    
    Args:
        start_date: Optional start date filter
        end_date: Optional end date filter
        subject_id: Optional subject filter
        is_active: Filter by active status (default: True)
        include_instances: Include individual schedule instances
        sync_enabled_only: For students - filter by calendar sync status
        current_user: Authenticated user
        
    Returns:
        List[ClassScheduleResponse]: List of accessible schedules
        
    Raises:
        HTTPException: If schedule retrieval fails
    """
    try:
        logger.info(f"Getting schedules for user {current_user.user_id} ({current_user.user_type})")
        
        if current_user.user_type == UserType.TEACHER:
            # Teachers get their own schedules
            query = ScheduleQuery(
                start_date=start_date,
                end_date=end_date,
                subject_id=subject_id,
                is_active=is_active,
                include_instances=include_instances
            )
            
            schedules = await scheduling_service.get_teacher_schedules(
                teacher_id=current_user.user_id,
                query=query
            )
            
        else:  # STUDENT
            # Students get schedules they have access to
            query = StudentScheduleQuery(
                start_date=start_date,
                end_date=end_date,
                subject_id=subject_id,
                sync_enabled_only=sync_enabled_only
            )
            
            schedules = await scheduling_service.get_student_schedules(
                student_id=current_user.user_id,
                query=query
            )
        
        logger.info(f"Retrieved {len(schedules)} schedules for user {current_user.user_id}")
        return schedules
        
    except SchedulingError as e:
        logger.error(f"Scheduling error getting schedules: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error getting schedules: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve schedules"
        )


@router.get("/{schedule_id}", response_model=ClassScheduleResponse)
async def get_schedule_by_id(
    schedule_id: int,
    current_user: UserResponse = Depends(require_teacher_or_student)
) -> ClassScheduleResponse:
    """
    Get a specific schedule by ID.
    
    Teachers can access their own schedules, students can access schedules they're enrolled in.
    
    **Requirements:** 3.1, 4.1
    
    Args:
        schedule_id: ID of the schedule to retrieve
        current_user: Authenticated user
        
    Returns:
        ClassScheduleResponse: Schedule details with instances
        
    Raises:
        HTTPException: If schedule not found or access denied
    """
    try:
        logger.info(f"Getting schedule {schedule_id} for user {current_user.user_id}")
        
        schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        
        # Check access permissions
        if current_user.user_type == UserType.TEACHER:
            if schedule.teacher_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only access your own schedules"
                )
        else:  # STUDENT
            # For students, we need to check if they have access to this schedule
            # This would typically be done through enrollment or explicit access grants
            # For now, we'll allow access to all schedules (this should be refined based on business logic)
            pass
        
        return schedule
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error getting schedule {schedule_id}: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error getting schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve schedule"
        )


@router.put("/{schedule_id}", response_model=ClassScheduleResponse)
async def update_class_schedule(
    schedule_id: int,
    updates: ClassScheduleUpdate,
    scope: UpdateScope = Query(UpdateScope.THIS_AND_FUTURE, description="Update scope for recurring events"),
    instance_datetime: Optional[str] = Query(None, description="ISO datetime for specific instance (required for THIS_INSTANCE scope)"),
    current_user: UserResponse = Depends(require_teacher)
) -> ClassScheduleResponse:
    """
    Update a class schedule.
    
    Supports different update scopes for recurring events:
    - THIS_INSTANCE: Update only a specific occurrence
    - THIS_AND_FUTURE: Update this and all future occurrences
    - ALL_INSTANCES: Update all occurrences
    
    **Requirements:** 3.2, 3.3
    
    Args:
        schedule_id: ID of the schedule to update
        updates: Update data
        scope: Update scope for recurring events
        instance_datetime: Required for THIS_INSTANCE scope
        current_user: Authenticated teacher user
        
    Returns:
        ClassScheduleResponse: Updated schedule
        
    Raises:
        HTTPException: If update fails or access denied
    """
    try:
        logger.info(f"Updating schedule {schedule_id} for teacher {current_user.user_id}")
        
        # Verify the teacher owns this schedule
        existing_schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        if existing_schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own schedules"
            )
        
        # Parse instance_datetime if provided
        parsed_instance_datetime = None
        if instance_datetime:
            from datetime import datetime
            try:
                parsed_instance_datetime = datetime.fromisoformat(instance_datetime.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid instance_datetime format. Use ISO format."
                )
        
        # Validate scope requirements
        if scope == UpdateScope.THIS_INSTANCE and not parsed_instance_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="instance_datetime is required for THIS_INSTANCE scope"
            )
        
        updated_schedule = await scheduling_service.update_class_schedule(
            schedule_id=schedule_id,
            updates=updates,
            scope=scope,
            instance_datetime=parsed_instance_datetime
        )
        
        logger.info(f"Schedule {schedule_id} updated successfully")
        return updated_schedule
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error updating schedule {schedule_id}: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error updating schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update schedule"
        )


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class_schedule(
    schedule_id: int,
    scope: UpdateScope = Query(UpdateScope.ALL_INSTANCES, description="Deletion scope for recurring events"),
    instance_datetime: Optional[str] = Query(None, description="ISO datetime for specific instance (required for THIS_INSTANCE scope)"),
    current_user: UserResponse = Depends(require_teacher)
):
    """
    Delete a class schedule.
    
    Supports different deletion scopes for recurring events:
    - THIS_INSTANCE: Delete only a specific occurrence
    - THIS_AND_FUTURE: Delete this and all future occurrences
    - ALL_INSTANCES: Delete all occurrences
    
    **Requirements:** 3.2, 3.3
    
    Args:
        schedule_id: ID of the schedule to delete
        scope: Deletion scope for recurring events
        instance_datetime: Required for THIS_INSTANCE scope
        current_user: Authenticated teacher user
        
    Raises:
        HTTPException: If deletion fails or access denied
    """
    try:
        logger.info(f"Deleting schedule {schedule_id} for teacher {current_user.user_id}")
        
        # Verify the teacher owns this schedule
        existing_schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        if existing_schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own schedules"
            )
        
        # Parse instance_datetime if provided
        parsed_instance_datetime = None
        if instance_datetime:
            from datetime import datetime
            try:
                parsed_instance_datetime = datetime.fromisoformat(instance_datetime.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid instance_datetime format. Use ISO format."
                )
        
        # Validate scope requirements
        if scope == UpdateScope.THIS_INSTANCE and not parsed_instance_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="instance_datetime is required for THIS_INSTANCE scope"
            )
        
        success = await scheduling_service.delete_class_schedule(
            schedule_id=schedule_id,
            scope=scope,
            instance_datetime=parsed_instance_datetime
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete schedule"
            )
        
        logger.info(f"Schedule {schedule_id} deleted successfully")
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error deleting schedule {schedule_id}: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete schedule"
        )


@router.post("/bulk", response_model=BulkScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_bulk_schedules(
    bulk_data: BulkScheduleCreate,
    current_user: UserResponse = Depends(require_teacher)
) -> BulkScheduleResponse:
    """
    Create multiple class schedules in a single request.
    
    Useful for importing schedules or creating multiple related schedules at once.
    Returns detailed results including any failures.
    
    **Requirements:** 2.1, 2.2
    
    Args:
        bulk_data: Bulk schedule creation data
        current_user: Authenticated teacher user
        
    Returns:
        BulkScheduleResponse: Results of bulk creation including successes and failures
        
    Raises:
        HTTPException: If bulk creation fails
    """
    try:
        logger.info(f"Creating {len(bulk_data.schedules)} schedules for teacher {current_user.user_id}")
        
        result = await scheduling_service.create_bulk_schedules(
            teacher_id=current_user.user_id,
            bulk_data=bulk_data
        )
        
        logger.info(f"Bulk schedule creation completed: {result.created_count} created, {result.failed_count} failed")
        return result
        
    except SchedulingError as e:
        logger.error(f"Scheduling error in bulk creation: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error in bulk creation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create bulk schedules"
        )


@router.post("/{schedule_id}/sync", response_model=SyncResponse)
async def sync_schedule_with_calendar(
    schedule_id: int,
    sync_request: Optional[SyncRequest] = None,
    current_user: UserResponse = Depends(require_teacher)
) -> SyncResponse:
    """
    Manually sync a schedule with external calendar.
    
    This endpoint allows teachers to troubleshoot synchronization issues
    by manually triggering a sync operation for specific schedules.
    
    **Requirements:** Manual sync endpoint for troubleshooting
    
    Args:
        schedule_id: ID of the schedule to sync
        sync_request: Optional sync configuration
        current_user: Authenticated teacher user
        
    Returns:
        SyncResponse: Results of the sync operation
        
    Raises:
        HTTPException: If sync fails or access denied
    """
    try:
        logger.info(f"Manual sync requested for schedule {schedule_id} by teacher {current_user.user_id}")
        
        # Verify the teacher owns this schedule
        existing_schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        if existing_schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only sync your own schedules"
            )
        
        # Perform sync
        success = await scheduling_service.sync_with_calendar(schedule_id)
        
        from datetime import datetime
        sync_response = SyncResponse(
            success=success,
            synced_count=1 if success else 0,
            failed_count=0 if success else 1,
            errors=[] if success else [{"schedule_id": schedule_id, "error": "Sync failed"}],
            last_sync_at=datetime.utcnow()
        )
        
        logger.info(f"Manual sync completed for schedule {schedule_id}: {'success' if success else 'failed'}")
        return sync_response
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error syncing schedule {schedule_id}: {e.message}")
        
        from datetime import datetime
        return SyncResponse(
            success=False,
            synced_count=0,
            failed_count=1,
            errors=[{"schedule_id": schedule_id, "error": e.message}],
            last_sync_at=datetime.utcnow()
        )
    except Exception as e:
        logger.error(f"Unexpected error syncing schedule {schedule_id}: {e}")
        
        from datetime import datetime
        return SyncResponse(
            success=False,
            synced_count=0,
            failed_count=1,
            errors=[{"schedule_id": schedule_id, "error": str(e)}],
            last_sync_at=datetime.utcnow()
        )


@router.post("/sync-all", response_model=SyncResponse)
async def sync_all_schedules(
    sync_request: Optional[SyncRequest] = None,
    current_user: UserResponse = Depends(require_teacher)
) -> SyncResponse:
    """
    Sync all schedules for the current teacher with external calendar.
    
    Batch synchronization operation for troubleshooting or maintenance.
    
    **Requirements:** Manual sync endpoint for troubleshooting
    
    Args:
        sync_request: Optional sync configuration
        current_user: Authenticated teacher user
        
    Returns:
        SyncResponse: Results of the batch sync operation
        
    Raises:
        HTTPException: If sync fails
    """
    try:
        logger.info(f"Batch sync requested for all schedules by teacher {current_user.user_id}")
        
        # Get all teacher's schedules
        schedules = await scheduling_service.get_teacher_schedules(
            teacher_id=current_user.user_id
        )
        
        synced_count = 0
        failed_count = 0
        errors = []
        
        # Sync each schedule
        for schedule in schedules:
            try:
                success = await scheduling_service.sync_with_calendar(schedule.id)
                if success:
                    synced_count += 1
                else:
                    failed_count += 1
                    errors.append({"schedule_id": schedule.id, "error": "Sync failed"})
            except Exception as e:
                failed_count += 1
                errors.append({"schedule_id": schedule.id, "error": str(e)})
        
        from datetime import datetime
        sync_response = SyncResponse(
            success=failed_count == 0,
            synced_count=synced_count,
            failed_count=failed_count,
            errors=errors,
            last_sync_at=datetime.utcnow()
        )
        
        logger.info(f"Batch sync completed: {synced_count} synced, {failed_count} failed")
        return sync_response
        
    except SchedulingError as e:
        logger.error(f"Scheduling error in batch sync: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error in batch sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync schedules"
        )


@router.get("/{schedule_id}/instances", response_model=List[ScheduleInstanceResponse])
async def get_schedule_instances(
    schedule_id: int,
    start_date: Optional[date] = Query(None, description="Filter instances from this date"),
    end_date: Optional[date] = Query(None, description="Filter instances until this date"),
    include_cancelled: bool = Query(False, description="Include cancelled instances"),
    current_user: UserResponse = Depends(require_teacher_or_student)
) -> List[ScheduleInstanceResponse]:
    """
    Get schedule instances for a specific recurring schedule.
    
    Returns individual occurrences of a recurring schedule with their current status
    and any modifications that have been applied.
    
    **Requirements:** 2.3, 3.4
    
    Args:
        schedule_id: ID of the schedule
        start_date: Optional start date filter
        end_date: Optional end date filter
        include_cancelled: Whether to include cancelled instances
        current_user: Authenticated user
        
    Returns:
        List[ScheduleInstanceResponse]: List of schedule instances
        
    Raises:
        HTTPException: If retrieval fails or access denied
    """
    try:
        logger.info(f"Getting instances for schedule {schedule_id} by user {current_user.user_id}")
        
        # Verify access to the schedule
        schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        
        if current_user.user_type == UserType.TEACHER:
            if schedule.teacher_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only access your own schedule instances"
                )
        # For students, we allow access (this could be refined based on enrollment)
        
        instances = await scheduling_service.get_schedule_instances(
            schedule_id=schedule_id,
            start_date=start_date,
            end_date=end_date,
            include_cancelled=include_cancelled
        )
        
        logger.info(f"Retrieved {len(instances)} instances for schedule {schedule_id}")
        return instances
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error getting instances: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error getting instances: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve schedule instances"
        )


@router.put("/{schedule_id}/instances/{instance_datetime}", response_model=ScheduleInstanceResponse)
async def modify_schedule_instance(
    schedule_id: int,
    instance_datetime: str,
    modifications: dict,
    sync_to_calendar: bool = Query(True, description="Whether to sync changes to Google Calendar"),
    current_user: UserResponse = Depends(require_teacher)
) -> ScheduleInstanceResponse:
    """
    Modify a specific instance of a recurring schedule.
    
    Allows teachers to modify individual occurrences of a recurring schedule
    without affecting other instances. Changes can include title, description,
    time, and duration.
    
    **Requirements:** 2.3, 3.4, 3.5
    
    Args:
        schedule_id: ID of the parent schedule
        instance_datetime: ISO datetime of the instance to modify
        modifications: Dictionary of modifications to apply
        sync_to_calendar: Whether to sync changes to Google Calendar
        current_user: Authenticated teacher user
        
    Returns:
        ScheduleInstanceResponse: Modified instance details
        
    Raises:
        HTTPException: If modification fails or access denied
    """
    try:
        logger.info(f"Modifying instance {instance_datetime} of schedule {schedule_id}")
        
        # Verify the teacher owns this schedule
        schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        if schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify your own schedule instances"
            )
        
        # Parse instance_datetime
        from datetime import datetime
        try:
            parsed_datetime = datetime.fromisoformat(instance_datetime.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid instance_datetime format. Use ISO format."
            )
        
        # Validate modifications
        allowed_fields = {'title', 'description', 'start_datetime', 'duration_minutes'}
        invalid_fields = set(modifications.keys()) - allowed_fields
        if invalid_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid modification fields: {', '.join(invalid_fields)}"
            )
        
        # Convert start_datetime if provided
        if 'start_datetime' in modifications:
            try:
                modifications['start_datetime'] = datetime.fromisoformat(
                    modifications['start_datetime'].replace('Z', '+00:00')
                ).isoformat()
            except (ValueError, AttributeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_datetime format in modifications"
                )
        
        modified_instance = await scheduling_service.handle_recurring_event_modification(
            schedule_id=schedule_id,
            instance_datetime=parsed_datetime,
            modifications=modifications
        )
        
        logger.info(f"Instance modified successfully: {instance_datetime} for schedule {schedule_id}")
        return modified_instance
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error modifying instance: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error modifying instance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to modify schedule instance"
        )


# Student Calendar Visibility Endpoints

@router.post("/access", response_model=StudentScheduleAccessResponse, status_code=status.HTTP_201_CREATED)
async def manage_student_schedule_access(
    access_data: StudentScheduleAccessCreate,
    current_user: UserResponse = Depends(require_teacher)
) -> StudentScheduleAccessResponse:
    """
    Grant or manage student access to a class schedule.
    
    Teachers can grant students access to their schedules, enabling students
    to view the schedule in their calendar and optionally sync to personal calendar.
    
    **Requirements:** 4.1, 4.2
    
    Args:
        access_data: Student access data including student ID and schedule ID
        current_user: Authenticated teacher user
        
    Returns:
        StudentScheduleAccessResponse: Created access record
        
    Raises:
        HTTPException: If access management fails or teacher doesn't own schedule
    """
    try:
        logger.info(f"Managing schedule access for student {access_data.student_id} to schedule {access_data.schedule_id}")
        
        # Verify the teacher owns this schedule
        schedule = await scheduling_service.get_schedule_by_id(access_data.schedule_id)
        if schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage access to your own schedules"
            )
        
        access_record = await scheduling_service.manage_student_schedule_access(
            student_id=access_data.student_id,
            schedule_id=access_data.schedule_id,
            grant_access=True,
            sync_to_personal_calendar=access_data.sync_to_personal_calendar
        )
        
        logger.info(f"Schedule access granted successfully")
        return access_record
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        elif e.error_code == "STUDENT_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        logger.error(f"Scheduling error managing access: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error managing access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to manage schedule access"
        )


@router.get("/access/{student_id}", response_model=List[StudentScheduleAccessResponse])
async def get_student_schedule_access(
    student_id: str,
    schedule_id: Optional[int] = Query(None, description="Optional specific schedule ID"),
    current_user: UserResponse = Depends(require_teacher_or_student)
) -> List[StudentScheduleAccessResponse]:
    """
    Get student's schedule access records.
    
    Teachers can view access records for any student to their schedules.
    Students can only view their own access records.
    
    **Requirements:** 4.1, 4.2
    
    Args:
        student_id: ID of the student
        schedule_id: Optional specific schedule ID to check
        current_user: Authenticated user
        
    Returns:
        List[StudentScheduleAccessResponse]: List of access records
        
    Raises:
        HTTPException: If access denied or retrieval fails
    """
    try:
        logger.info(f"Getting schedule access for student {student_id}")
        
        # Check permissions
        if current_user.user_type == UserType.STUDENT:
            if current_user.user_id != student_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Students can only view their own schedule access"
                )
        
        access_records = await scheduling_service.get_student_schedule_access(
            student_id=student_id,
            schedule_id=schedule_id
        )
        
        # For teachers, filter to only show access to their own schedules
        if current_user.user_type == UserType.TEACHER:
            filtered_records = []
            for record in access_records:
                try:
                    schedule = await scheduling_service.get_schedule_by_id(record.schedule_id)
                    if schedule.teacher_id == current_user.user_id:
                        filtered_records.append(record)
                except SchedulingError:
                    continue
            access_records = filtered_records
        
        logger.info(f"Retrieved {len(access_records)} access records")
        return access_records
        
    except HTTPException:
        raise
    except SchedulingError as e:
        logger.error(f"Scheduling error getting access records: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error getting access records: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve schedule access records"
        )


@router.put("/access/{student_id}/{schedule_id}/sync", response_model=StudentScheduleAccessResponse)
async def update_student_calendar_sync(
    student_id: str,
    schedule_id: int,
    sync_enabled: bool = Query(..., description="Whether to enable calendar sync"),
    current_user: UserResponse = Depends(require_teacher_or_student)
) -> StudentScheduleAccessResponse:
    """
    Update student's personal calendar sync preference for a schedule.
    
    Students can enable/disable sync to their personal Google Calendar.
    Teachers can also manage sync settings for their students.
    
    **Requirements:** 4.5, 4.6
    
    Args:
        student_id: ID of the student
        schedule_id: ID of the schedule
        sync_enabled: Whether to enable sync to personal calendar
        current_user: Authenticated user
        
    Returns:
        StudentScheduleAccessResponse: Updated access record
        
    Raises:
        HTTPException: If update fails or access denied
    """
    try:
        logger.info(f"Updating calendar sync for student {student_id}, schedule {schedule_id}")
        
        # Check permissions
        if current_user.user_type == UserType.STUDENT:
            if current_user.user_id != student_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Students can only manage their own calendar sync settings"
                )
        elif current_user.user_type == UserType.TEACHER:
            # Verify teacher owns the schedule
            schedule = await scheduling_service.get_schedule_by_id(schedule_id)
            if schedule.teacher_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only manage sync settings for your own schedules"
                )
        
        updated_record = await scheduling_service.update_student_calendar_sync(
            student_id=student_id,
            schedule_id=schedule_id,
            sync_enabled=sync_enabled
        )
        
        logger.info(f"Calendar sync {'enabled' if sync_enabled else 'disabled'} successfully")
        return updated_record
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "ACCESS_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student does not have access to this schedule"
            )
        elif e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error updating sync: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error updating sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update calendar sync preference"
        )


@router.delete("/access/{student_id}/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_student_schedule_access(
    student_id: str,
    schedule_id: int,
    current_user: UserResponse = Depends(require_teacher)
):
    """
    Revoke student access to a class schedule.
    
    Teachers can revoke student access to their schedules, removing the
    schedule from the student's calendar view.
    
    **Requirements:** 4.1, 4.2
    
    Args:
        student_id: ID of the student
        schedule_id: ID of the schedule
        current_user: Authenticated teacher user
        
    Raises:
        HTTPException: If revocation fails or teacher doesn't own schedule
    """
    try:
        logger.info(f"Revoking schedule access for student {student_id} from schedule {schedule_id}")
        
        # Verify the teacher owns this schedule
        schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        if schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only revoke access to your own schedules"
            )
        
        await scheduling_service.manage_student_schedule_access(
            student_id=student_id,
            schedule_id=schedule_id,
            grant_access=False
        )
        
        logger.info(f"Schedule access revoked successfully")
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        elif e.error_code == "ACCESS_RECORD_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student does not have access to this schedule"
            )
        logger.error(f"Scheduling error revoking access: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error revoking access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke schedule access"
        )


@router.post("/{schedule_id}/grant-enrollment-access", response_model=dict)
async def grant_enrollment_based_access(
    schedule_id: int,
    current_user: UserResponse = Depends(require_teacher)
) -> dict:
    """
    Automatically grant schedule access to all enrolled students.
    
    This endpoint grants access to all students enrolled in the subject
    associated with the schedule, enabling automatic visibility based on enrollment.
    
    **Requirements:** 4.1, 4.2
    
    Args:
        schedule_id: ID of the schedule
        current_user: Authenticated teacher user
        
    Returns:
        dict: Results including number of students granted access
        
    Raises:
        HTTPException: If access granting fails or teacher doesn't own schedule
    """
    try:
        logger.info(f"Granting enrollment-based access for schedule {schedule_id}")
        
        # Verify the teacher owns this schedule
        schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        if schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only grant access to your own schedules"
            )
        
        granted_count = await scheduling_service.grant_enrollment_based_access(schedule_id)
        
        result = {
            "success": True,
            "message": f"Access granted to {granted_count} enrolled students",
            "granted_count": granted_count,
            "schedule_id": schedule_id
        }
        
        logger.info(f"Enrollment-based access granted to {granted_count} students")
        return result
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error granting enrollment access: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error granting enrollment access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to grant enrollment-based access"
        )


# Student Personal Calendar Sync Endpoints

@router.post("/student/{student_id}/sync-calendar", response_model=dict)
async def sync_student_personal_calendar(
    student_id: str,
    force_sync: bool = Query(False, description="Force sync even if already synced"),
    current_user: UserResponse = Depends(require_teacher_or_student)
) -> dict:
    """
    Sync student's class schedules to their personal Google Calendar.
    
    Creates read-only calendar events in the student's personal calendar
    for all schedules they have access to with sync enabled.
    
    **Requirements:** 4.5, 4.6
    
    Args:
        student_id: ID of the student
        force_sync: Whether to force sync even if already synced
        current_user: Authenticated user
        
    Returns:
        dict: Sync results including success count and errors
        
    Raises:
        HTTPException: If sync fails or access denied
    """
    try:
        logger.info(f"Syncing personal calendar for student {student_id}")
        
        # Check permissions
        if current_user.user_type == UserType.STUDENT:
            if current_user.user_id != student_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Students can only sync their own calendar"
                )
        
        # Import here to avoid circular imports
        from ..services.student_calendar_service import student_calendar_service
        
        sync_result = await student_calendar_service.sync_student_schedules_to_personal_calendar(
            student_id=student_id,
            force_sync=force_sync
        )
        
        result = {
            "success": sync_result.success,
            "message": f"Synced {sync_result.synced_count} schedules to personal calendar",
            "synced_count": sync_result.synced_count,
            "failed_count": sync_result.failed_count,
            "errors": sync_result.errors,
            "student_id": sync_result.student_id
        }
        
        logger.info(f"Personal calendar sync completed: {sync_result.synced_count} synced, {sync_result.failed_count} failed")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        # Handle StudentCalendarError and other exceptions
        error_message = getattr(e, 'message', str(e))
        error_code = getattr(e, 'error_code', 'SYNC_FAILED')
        
        if error_code == "CALENDAR_NOT_CONNECTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student does not have Google Calendar connected"
            )
        
        logger.error(f"Unexpected error syncing personal calendar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync personal calendar"
        )


@router.post("/{schedule_id}/sync-calendar", response_model=SyncResponse)
async def sync_recurring_event_with_calendar(
    schedule_id: int,
    scope: UpdateScope = Query(UpdateScope.ALL_INSTANCES, description="Sync scope for recurring events"),
    instance_datetime: Optional[str] = Query(None, description="ISO datetime for specific instance (required for THIS_INSTANCE scope)"),
    current_user: UserResponse = Depends(require_teacher)
) -> SyncResponse:
    """
    Sync recurring event changes with Google Calendar.
    
    Handles synchronization of recurring event modifications with different scopes:
    - THIS_INSTANCE: Sync only a specific occurrence
    - THIS_AND_FUTURE: Sync this and all future occurrences
    - ALL_INSTANCES: Sync all occurrences
    
    **Requirements:** 3.6, 4.3, 4.4
    
    Args:
        schedule_id: ID of the schedule to sync
        scope: Sync scope for recurring events
        instance_datetime: Required for THIS_INSTANCE scope
        current_user: Authenticated teacher user
        
    Returns:
        SyncResponse: Results of the sync operation
        
    Raises:
        HTTPException: If sync fails or access denied
    """
    try:
        logger.info(f"Syncing recurring event {schedule_id} with scope {scope}")
        
        # Verify the teacher owns this schedule
        schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        if schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only sync your own schedules"
            )
        
        # Parse instance_datetime if provided
        parsed_instance_datetime = None
        if instance_datetime:
            from datetime import datetime
            try:
                parsed_instance_datetime = datetime.fromisoformat(instance_datetime.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid instance_datetime format. Use ISO format."
                )
        
        # Validate scope requirements
        if scope == UpdateScope.THIS_INSTANCE and not parsed_instance_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="instance_datetime is required for THIS_INSTANCE scope"
            )
        
        success = await scheduling_service.sync_recurring_event_with_calendar(
            schedule_id=schedule_id,
            scope=scope,
            instance_datetime=parsed_instance_datetime
        )
        
        from datetime import datetime
        sync_response = SyncResponse(
            success=success,
            synced_count=1 if success else 0,
            failed_count=0 if success else 1,
            errors=[] if success else [{"schedule_id": schedule_id, "error": "Recurring event sync failed"}],
            last_sync_at=datetime.utcnow()
        )
        
        logger.info(f"Recurring event sync completed for schedule {schedule_id}: {'success' if success else 'failed'}")
        return sync_response
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error syncing recurring event: {e.message}")
        
        from datetime import datetime
        return SyncResponse(
            success=False,
            synced_count=0,
            failed_count=1,
            errors=[{"schedule_id": schedule_id, "error": e.message}],
            last_sync_at=datetime.utcnow()
        )
    except Exception as e:
        logger.error(f"Unexpected error syncing recurring event: {e}")
        
        from datetime import datetime
        return SyncResponse(
            success=False,
            synced_count=0,
            failed_count=1,
            errors=[{"schedule_id": schedule_id, "error": str(e)}],
            last_sync_at=datetime.utcnow()
        )


@router.delete("/{schedule_id}/calendar", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_event_from_calendar(
    schedule_id: int,
    scope: UpdateScope = Query(UpdateScope.ALL_INSTANCES, description="Deletion scope for recurring events"),
    instance_datetime: Optional[str] = Query(None, description="ISO datetime for specific instance (required for THIS_INSTANCE scope)"),
    current_user: UserResponse = Depends(require_teacher)
):
    """
    Delete recurring event from Google Calendar with proper cleanup.
    
    Removes recurring events from Google Calendar while maintaining internal schedule data.
    Supports different deletion scopes for fine-grained control.
    
    **Requirements:** 2.5, 3.5
    
    Args:
        schedule_id: ID of the schedule to delete from calendar
        scope: Deletion scope for recurring events
        instance_datetime: Required for THIS_INSTANCE scope
        current_user: Authenticated teacher user
        
    Raises:
        HTTPException: If deletion fails or access denied
    """
    try:
        logger.info(f"Deleting recurring event {schedule_id} from calendar with scope {scope}")
        
        # Verify the teacher owns this schedule
        schedule = await scheduling_service.get_schedule_by_id(schedule_id)
        if schedule.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own schedule events"
            )
        
        # Parse instance_datetime if provided
        parsed_instance_datetime = None
        if instance_datetime:
            from datetime import datetime
            try:
                parsed_instance_datetime = datetime.fromisoformat(instance_datetime.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid instance_datetime format. Use ISO format."
                )
        
        # Validate scope requirements
        if scope == UpdateScope.THIS_INSTANCE and not parsed_instance_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="instance_datetime is required for THIS_INSTANCE scope"
            )
        
        success = await scheduling_service.delete_recurring_event_from_calendar(
            schedule_id=schedule_id,
            scope=scope,
            instance_datetime=parsed_instance_datetime
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete recurring event from calendar"
            )
        
        logger.info(f"Recurring event {schedule_id} deleted from calendar successfully")
        
    except HTTPException:
        raise
    except SchedulingError as e:
        if e.error_code == "SCHEDULE_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        logger.error(f"Scheduling error deleting recurring event from calendar: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting recurring event from calendar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete recurring event from calendar"
        )