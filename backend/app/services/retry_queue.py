"""
Retry queue system for failed calendar operations.
Provides intelligent retry mechanisms with exponential backoff and persistent storage.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable, Union
from enum import Enum
from dataclasses import dataclass, asdict
import uuid

from ..core.logging_config import get_calendar_logger, PerformanceLogger
from .local_supabase import LocalSupabase

logger = get_calendar_logger(__name__)


class RetryStatus(Enum):
    """Status of retry operations."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    EXPIRED = "expired"


class RetryStrategy(Enum):
    """Retry strategy types."""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    FIXED_INTERVAL = "fixed_interval"
    LINEAR_BACKOFF = "linear_backoff"


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 5
    initial_delay: float = 1.0
    max_delay: float = 300.0  # 5 minutes
    backoff_multiplier: float = 2.0
    jitter: bool = True
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    timeout: float = 30.0  # Operation timeout
    expiry_hours: int = 24  # How long to keep retrying


@dataclass
class RetryOperation:
    """Represents an operation to be retried."""
    id: str
    operation_type: str
    operation_data: Dict[str, Any]
    user_id: int
    created_at: datetime
    next_retry_at: datetime
    attempt_count: int
    max_attempts: int
    status: RetryStatus
    last_error: Optional[str] = None
    config: Optional[RetryConfig] = None


class RetryQueueService:
    """
    Service for managing retry operations with persistent storage and intelligent scheduling.
    """
    
    def __init__(self):
        self.default_config = RetryConfig()
        self.processing_operations = set()  # Track operations being processed
        self.queue_processor_running = False
        
    async def enqueue_operation(
        self,
        operation_type: str,
        operation_data: Dict[str, Any],
        user_id: int,
        config: Optional[RetryConfig] = None
    ) -> str:
        """
        Enqueue an operation for retry.
        
        Args:
            operation_type: Type of operation (e.g., 'create_event', 'sync_calendar')
            operation_data: Data needed to retry the operation
            user_id: User ID associated with the operation
            config: Custom retry configuration
            
        Returns:
            str: Operation ID for tracking
        """
        
        operation_id = str(uuid.uuid4())
        retry_config = config or self.default_config
        
        now = datetime.utcnow()
        next_retry = now + timedelta(seconds=retry_config.initial_delay)
        
        operation = RetryOperation(
            id=operation_id,
            operation_type=operation_type,
            operation_data=operation_data,
            user_id=user_id,
            created_at=now,
            next_retry_at=next_retry,
            attempt_count=0,
            max_attempts=retry_config.max_attempts,
            status=RetryStatus.PENDING,
            config=retry_config
        )
        
        try:
            await self._store_operation(operation)
            
            logger.info(f"Operation enqueued for retry: {operation_type}", extra={
                'operation_id': operation_id,
                'operation_type': operation_type,
                'user_id': user_id,
                'next_retry_at': next_retry.isoformat(),
                'max_attempts': retry_config.max_attempts
            })
            
            return operation_id
            
        except Exception as error:
            logger.error(f"Failed to enqueue operation: {operation_type}", extra={
                'operation_type': operation_type,
                'user_id': user_id,
                'error': str(error)
            })
            raise
    
    async def process_queue(self) -> Dict[str, int]:
        """
        Process pending operations in the retry queue.
        
        Returns:
            dict: Statistics about processed operations
        """
        
        if self.queue_processor_running:
            logger.debug("Queue processor already running, skipping")
            return {'processed': 0, 'failed': 0, 'skipped': 0}
        
        self.queue_processor_running = True
        
        try:
            with PerformanceLogger(logger, "process_retry_queue"):
                
                # Get operations ready for retry
                ready_operations = await self._get_ready_operations()
                
                stats = {
                    'processed': 0,
                    'failed': 0,
                    'skipped': 0
                }
                
                for operation in ready_operations:
                    if operation.id in self.processing_operations:
                        stats['skipped'] += 1
                        continue
                    
                    try:
                        self.processing_operations.add(operation.id)
                        success = await self._process_operation(operation)
                        
                        if success:
                            stats['processed'] += 1
                        else:
                            stats['failed'] += 1
                            
                    except Exception as error:
                        logger.error(f"Error processing operation {operation.id}", extra={
                            'operation_id': operation.id,
                            'operation_type': operation.operation_type,
                            'error': str(error)
                        })
                        stats['failed'] += 1
                        
                    finally:
                        self.processing_operations.discard(operation.id)
                
                # Clean up expired operations
                expired_count = await self._cleanup_expired_operations()
                
                logger.info("Retry queue processing completed", extra={
                    'processed': stats['processed'],
                    'failed': stats['failed'],
                    'skipped': stats['skipped'],
                    'expired_cleaned': expired_count
                })
                
                return stats
                
        finally:
            self.queue_processor_running = False
    
    async def _process_operation(self, operation: RetryOperation) -> bool:
        """
        Process a single retry operation.
        
        Args:
            operation: Operation to process
            
        Returns:
            bool: True if successful, False if failed
        """
        
        logger.info(f"Processing retry operation: {operation.operation_type}", extra={
            'operation_id': operation.id,
            'operation_type': operation.operation_type,
            'attempt_count': operation.attempt_count + 1,
            'user_id': operation.user_id
        })
        
        # Update operation status to processing
        operation.status = RetryStatus.PROCESSING
        operation.attempt_count += 1
        await self._update_operation(operation)
        
        try:
            # Execute the operation based on type
            success = await self._execute_operation(operation)
            
            if success:
                # Mark as successful
                operation.status = RetryStatus.SUCCESS
                await self._update_operation(operation)
                
                logger.info(f"Retry operation successful: {operation.operation_type}", extra={
                    'operation_id': operation.id,
                    'operation_type': operation.operation_type,
                    'attempt_count': operation.attempt_count,
                    'user_id': operation.user_id
                })
                
                return True
            else:
                # Operation failed, schedule next retry or mark as failed
                return await self._handle_operation_failure(operation, "Operation returned false")
                
        except Exception as error:
            # Operation threw exception, schedule next retry or mark as failed
            return await self._handle_operation_failure(operation, str(error))
    
    async def _handle_operation_failure(
        self,
        operation: RetryOperation,
        error_message: str
    ) -> bool:
        """
        Handle operation failure and schedule next retry if appropriate.
        
        Args:
            operation: Failed operation
            error_message: Error message
            
        Returns:
            bool: False (operation failed)
        """
        
        operation.last_error = error_message
        
        if operation.attempt_count >= operation.max_attempts:
            # Max attempts reached, mark as failed
            operation.status = RetryStatus.FAILED
            
            logger.error(f"Retry operation permanently failed: {operation.operation_type}", extra={
                'operation_id': operation.id,
                'operation_type': operation.operation_type,
                'attempt_count': operation.attempt_count,
                'max_attempts': operation.max_attempts,
                'user_id': operation.user_id,
                'error': error_message
            })
        else:
            # Schedule next retry
            next_delay = self._calculate_next_delay(operation)
            operation.next_retry_at = datetime.utcnow() + timedelta(seconds=next_delay)
            operation.status = RetryStatus.PENDING
            
            logger.warning(f"Retry operation failed, scheduling next attempt: {operation.operation_type}", extra={
                'operation_id': operation.id,
                'operation_type': operation.operation_type,
                'attempt_count': operation.attempt_count,
                'next_retry_at': operation.next_retry_at.isoformat(),
                'user_id': operation.user_id,
                'error': error_message
            })
        
        await self._update_operation(operation)
        return False
    
    def _calculate_next_delay(self, operation: RetryOperation) -> float:
        """
        Calculate delay for next retry attempt.
        
        Args:
            operation: Operation to calculate delay for
            
        Returns:
            float: Delay in seconds
        """
        
        config = operation.config or self.default_config
        
        if config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = config.initial_delay * (config.backoff_multiplier ** (operation.attempt_count - 1))
        elif config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = config.initial_delay * operation.attempt_count
        else:  # FIXED_INTERVAL
            delay = config.initial_delay
        
        # Apply maximum delay limit
        delay = min(delay, config.max_delay)
        
        # Add jitter if enabled
        if config.jitter:
            import random
            jitter_factor = 0.1  # ±10% jitter
            jitter = delay * jitter_factor * (2 * random.random() - 1)
            delay += jitter
        
        return max(delay, 0.1)  # Minimum 0.1 seconds
    
    async def _execute_operation(self, operation: RetryOperation) -> bool:
        """
        Execute the actual operation based on its type.
        
        Args:
            operation: Operation to execute
            
        Returns:
            bool: True if successful, False otherwise
        """
        
        operation_type = operation.operation_type
        operation_data = operation.operation_data
        
        try:
            if operation_type == "create_calendar_event":
                return await self._retry_create_event(operation_data)
            elif operation_type == "update_calendar_event":
                return await self._retry_update_event(operation_data)
            elif operation_type == "delete_calendar_event":
                return await self._retry_delete_event(operation_data)
            elif operation_type == "sync_calendar":
                return await self._retry_sync_calendar(operation_data)
            elif operation_type == "refresh_token":
                return await self._retry_refresh_token(operation_data)
            else:
                logger.error(f"Unknown operation type: {operation_type}")
                return False
                
        except Exception as error:
            logger.error(f"Error executing operation {operation_type}", extra={
                'operation_id': operation.id,
                'operation_type': operation_type,
                'error': str(error)
            })
            raise
    
    async def _retry_create_event(self, operation_data: Dict[str, Any]) -> bool:
        """Retry creating a calendar event."""
        try:
            from .calendar_service import CalendarService
            from ..models.calendar import CalendarEventCreate
            
            calendar_service = CalendarService()
            
            # Reconstruct event data
            event_data = CalendarEventCreate(**operation_data['event_data'])
            user_id = operation_data['user_id']
            calendar_id = operation_data.get('calendar_id', 'primary')
            
            # Attempt to create event
            event_id = await calendar_service.create_event(user_id, event_data, calendar_id)
            
            # Update local record if needed
            if operation_data.get('local_event_id'):
                await self._update_local_event_sync_status(
                    operation_data['local_event_id'],
                    event_id,
                    True
                )
            
            return True
            
        except Exception as error:
            logger.error(f"Failed to retry create event", extra={
                'operation_data': operation_data,
                'error': str(error)
            })
            return False
    
    async def _retry_update_event(self, operation_data: Dict[str, Any]) -> bool:
        """Retry updating a calendar event."""
        try:
            from .calendar_service import CalendarService
            from ..models.calendar import CalendarEventUpdate
            
            calendar_service = CalendarService()
            
            # Reconstruct update data
            updates = CalendarEventUpdate(**operation_data['updates'])
            user_id = operation_data['user_id']
            event_id = operation_data['event_id']
            calendar_id = operation_data.get('calendar_id', 'primary')
            
            # Attempt to update event
            success = await calendar_service.update_event(user_id, event_id, updates, calendar_id)
            return success
            
        except Exception as error:
            logger.error(f"Failed to retry update event", extra={
                'operation_data': operation_data,
                'error': str(error)
            })
            return False
    
    async def _retry_delete_event(self, operation_data: Dict[str, Any]) -> bool:
        """Retry deleting a calendar event."""
        try:
            from .calendar_service import CalendarService
            
            calendar_service = CalendarService()
            
            user_id = operation_data['user_id']
            event_id = operation_data['event_id']
            calendar_id = operation_data.get('calendar_id', 'primary')
            
            # Attempt to delete event
            success = await calendar_service.delete_event(user_id, event_id, calendar_id)
            return success
            
        except Exception as error:
            logger.error(f"Failed to retry delete event", extra={
                'operation_data': operation_data,
                'error': str(error)
            })
            return False
    
    async def _retry_sync_calendar(self, operation_data: Dict[str, Any]) -> bool:
        """Retry calendar synchronization."""
        try:
            from .sync_service import SyncService
            
            sync_service = SyncService()
            
            user_id = operation_data['user_id']
            sync_type = operation_data.get('sync_type', 'bidirectional')
            
            if sync_type == 'to_calendar':
                success = await sync_service.sync_schedule_to_calendar(operation_data['schedule_id'])
            elif sync_type == 'from_calendar':
                success = await sync_service.sync_calendar_to_schedule(user_id)
            else:
                # Bidirectional sync
                success = await sync_service.batch_sync_schedules(user_id)
                success = success.get('success', False)
            
            return success
            
        except Exception as error:
            logger.error(f"Failed to retry sync calendar", extra={
                'operation_data': operation_data,
                'error': str(error)
            })
            return False
    
    async def _retry_refresh_token(self, operation_data: Dict[str, Any]) -> bool:
        """Retry token refresh."""
        try:
            from .oauth_service import oauth_service
            
            user_id = operation_data['user_id']
            
            # Attempt to refresh token
            token = await oauth_service.refresh_access_token(user_id)
            return token is not None
            
        except Exception as error:
            logger.error(f"Failed to retry token refresh", extra={
                'operation_data': operation_data,
                'error': str(error)
            })
            return False
    
    async def _store_operation(self, operation: RetryOperation) -> None:
        """Store operation in database."""
        try:
            db = LocalSupabase()
            
            operation_data = {
                'id': operation.id,
                'operation_type': operation.operation_type,
                'operation_data': json.dumps(operation.operation_data),
                'user_id': str(operation.user_id),
                'created_at': operation.created_at.isoformat(),
                'next_retry_at': operation.next_retry_at.isoformat(),
                'attempt_count': operation.attempt_count,
                'max_attempts': operation.max_attempts,
                'status': operation.status.value,
                'last_error': operation.last_error,
                'config': json.dumps(asdict(operation.config)) if operation.config else None
            }
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{db.base_url}/rest/v1/retry_operations",
                    headers=db.headers,
                    json=operation_data
                )
                
                if response.status_code not in [200, 201]:
                    raise Exception(f"Failed to store operation: {response.status_code}")
                    
        except Exception as error:
            logger.error(f"Failed to store retry operation", extra={
                'operation_id': operation.id,
                'error': str(error)
            })
            raise
    
    async def _update_operation(self, operation: RetryOperation) -> None:
        """Update operation in database."""
        try:
            db = LocalSupabase()
            
            update_data = {
                'next_retry_at': operation.next_retry_at.isoformat(),
                'attempt_count': operation.attempt_count,
                'status': operation.status.value,
                'last_error': operation.last_error,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{db.base_url}/rest/v1/retry_operations",
                    headers=db.headers,
                    params={'id': f'eq.{operation.id}'},
                    json=update_data
                )
                
                if response.status_code not in [200, 204]:
                    raise Exception(f"Failed to update operation: {response.status_code}")
                    
        except Exception as error:
            logger.error(f"Failed to update retry operation", extra={
                'operation_id': operation.id,
                'error': str(error)
            })
            raise
    
    async def _get_ready_operations(self) -> List[RetryOperation]:
        """Get operations ready for retry."""
        try:
            db = LocalSupabase()
            now = datetime.utcnow()
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{db.base_url}/rest/v1/retry_operations",
                    headers=db.headers,
                    params={
                        'status': f'eq.{RetryStatus.PENDING.value}',
                        'next_retry_at': f'lte.{now.isoformat()}',
                        'order': 'next_retry_at.asc',
                        'limit': '50'  # Process in batches
                    }
                )
                
                if response.status_code == 200:
                    operations_data = response.json()
                    
                    operations = []
                    for op_data in operations_data:
                        try:
                            config = None
                            if op_data.get('config'):
                                config_dict = json.loads(op_data['config'])
                                config = RetryConfig(**config_dict)
                            
                            operation = RetryOperation(
                                id=op_data['id'],
                                operation_type=op_data['operation_type'],
                                operation_data=json.loads(op_data['operation_data']),
                                user_id=int(op_data['user_id']),
                                created_at=datetime.fromisoformat(op_data['created_at'].replace('Z', '+00:00')),
                                next_retry_at=datetime.fromisoformat(op_data['next_retry_at'].replace('Z', '+00:00')),
                                attempt_count=op_data['attempt_count'],
                                max_attempts=op_data['max_attempts'],
                                status=RetryStatus(op_data['status']),
                                last_error=op_data.get('last_error'),
                                config=config
                            )
                            operations.append(operation)
                            
                        except Exception as error:
                            logger.error(f"Failed to parse retry operation", extra={
                                'operation_data': op_data,
                                'error': str(error)
                            })
                    
                    return operations
                else:
                    raise Exception(f"Failed to get ready operations: {response.status_code}")
                    
        except Exception as error:
            logger.error(f"Failed to get ready operations", extra={
                'error': str(error)
            })
            return []
    
    async def _cleanup_expired_operations(self) -> int:
        """Clean up expired operations."""
        try:
            db = LocalSupabase()
            
            # Calculate expiry time (24 hours ago by default)
            expiry_time = datetime.utcnow() - timedelta(hours=24)
            
            import httpx
            async with httpx.AsyncClient() as client:
                # First, get count of operations to be deleted
                count_response = await client.get(
                    f"{db.base_url}/rest/v1/retry_operations",
                    headers=db.headers,
                    params={
                        'created_at': f'lt.{expiry_time.isoformat()}',
                        'select': 'count'
                    }
                )
                
                expired_count = 0
                if count_response.status_code == 200:
                    count_data = count_response.json()
                    expired_count = len(count_data)
                
                # Delete expired operations
                if expired_count > 0:
                    delete_response = await client.delete(
                        f"{db.base_url}/rest/v1/retry_operations",
                        headers=db.headers,
                        params={
                            'created_at': f'lt.{expiry_time.isoformat()}'
                        }
                    )
                    
                    if delete_response.status_code in [200, 204]:
                        logger.info(f"Cleaned up {expired_count} expired retry operations")
                    else:
                        logger.warning(f"Failed to clean up expired operations: {delete_response.status_code}")
                
                return expired_count
                
        except Exception as error:
            logger.error(f"Failed to cleanup expired operations", extra={
                'error': str(error)
            })
            return 0
    
    async def _update_local_event_sync_status(
        self,
        local_event_id: str,
        google_event_id: str,
        is_synced: bool
    ) -> None:
        """Update sync status of local event."""
        try:
            db = LocalSupabase()
            
            update_data = {
                'google_event_id': google_event_id,
                'is_synced': is_synced,
                'synced_at': datetime.utcnow().isoformat()
            }
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{db.base_url}/rest/v1/local_calendar_events",
                    headers=db.headers,
                    params={'id': f'eq.{local_event_id}'},
                    json=update_data
                )
                
        except Exception as error:
            logger.warning(f"Failed to update local event sync status", extra={
                'local_event_id': local_event_id,
                'error': str(error)
            })
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status and statistics."""
        try:
            db = LocalSupabase()
            
            import httpx
            async with httpx.AsyncClient() as client:
                # Get counts by status
                response = await client.get(
                    f"{db.base_url}/rest/v1/retry_operations",
                    headers=db.headers,
                    params={'select': 'status'}
                )
                
                if response.status_code == 200:
                    operations = response.json()
                    
                    status_counts = {}
                    for status in RetryStatus:
                        status_counts[status.value] = 0
                    
                    for op in operations:
                        status = op.get('status', 'unknown')
                        if status in status_counts:
                            status_counts[status] += 1
                    
                    return {
                        'total_operations': len(operations),
                        'status_counts': status_counts,
                        'processing_operations': len(self.processing_operations),
                        'queue_processor_running': self.queue_processor_running
                    }
                else:
                    return {'error': f'Failed to get queue status: {response.status_code}'}
                    
        except Exception as error:
            logger.error(f"Failed to get queue status", extra={
                'error': str(error)
            })
            return {'error': str(error)}
    
    async def start_background_processor(self) -> None:
        """Start background task to process retry queue."""
        
        async def queue_processor():
            """Background task to process retry queue."""
            while True:
                try:
                    await asyncio.sleep(30)  # Process every 30 seconds
                    await self.process_queue()
                    
                except Exception as error:
                    logger.error("Error in retry queue processor", extra={
                        'error': str(error)
                    })
        
        # Start background task
        asyncio.create_task(queue_processor())
        logger.info("Retry queue background processor started")


# Global instance
retry_queue_service = RetryQueueService()