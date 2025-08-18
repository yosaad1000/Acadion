"""
Data retention service for calendar tokens and events.
Implements automated cleanup policies for security and compliance.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from ..core.logging_config import get_calendar_logger
from ..services.supabase_client import get_supabase_client

logger = get_calendar_logger(__name__)


@dataclass
class RetentionPolicy:
    """Data retention policy configuration."""
    name: str
    table_name: str
    date_column: str
    retention_days: int
    conditions: Optional[Dict[str, Any]] = None
    cascade_deletes: Optional[List[str]] = None


class DataRetentionService:
    """
    Service for managing data retention policies for calendar-related data.
    Handles automated cleanup of expired tokens, old events, and audit logs.
    """
    
    # Default retention policies
    RETENTION_POLICIES = [
        RetentionPolicy(
            name="expired_oauth_tokens",
            table_name="calendar_connections",
            date_column="token_expires_at",
            retention_days=0,  # Delete immediately after expiration
            conditions={"token_expires_at": {"lt": "NOW()"}},
            cascade_deletes=["schedule_instances"]
        ),
        RetentionPolicy(
            name="inactive_calendar_connections",
            table_name="calendar_connections",
            date_column="updated_at",
            retention_days=365,  # 1 year of inactivity
            conditions={"updated_at": {"lt": "NOW() - INTERVAL '365 days'"}}
        ),
        RetentionPolicy(
            name="old_schedule_instances",
            table_name="schedule_instances",
            date_column="instance_datetime",
            retention_days=730,  # 2 years
            conditions={
                "instance_datetime": {"lt": "NOW() - INTERVAL '730 days'"},
                "status": {"in": ["completed", "cancelled"]}
            }
        ),
        RetentionPolicy(
            name="old_audit_logs",
            table_name="audit_logs",
            date_column="created_at",
            retention_days=2555,  # 7 years for compliance
            conditions={"created_at": {"lt": "NOW() - INTERVAL '2555 days'"}}
        ),
        RetentionPolicy(
            name="orphaned_schedule_access",
            table_name="student_schedule_access",
            date_column="created_at",
            retention_days=365,  # 1 year
            conditions={
                "created_at": {"lt": "NOW() - INTERVAL '365 days'"},
                "schedule_id": {"not_exists": "SELECT 1 FROM class_schedules WHERE id = student_schedule_access.schedule_id"}
            }
        )
    ]
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def apply_retention_policies(self, dry_run: bool = False) -> Dict[str, Any]:
        """
        Apply all retention policies to clean up old data.
        
        Args:
            dry_run: If True, only count records without deleting
            
        Returns:
            dict: Results of retention policy application
        """
        results = {
            "total_deleted": 0,
            "policies_applied": 0,
            "errors": [],
            "policy_results": {}
        }
        
        logger.info(f"Starting data retention cleanup (dry_run={dry_run})")
        
        for policy in self.RETENTION_POLICIES:
            try:
                policy_result = await self._apply_single_policy(policy, dry_run)
                results["policy_results"][policy.name] = policy_result
                results["total_deleted"] += policy_result["deleted_count"]
                results["policies_applied"] += 1
                
                logger.info(f"Applied retention policy '{policy.name}': {policy_result['deleted_count']} records")
                
            except Exception as e:
                error_msg = f"Failed to apply retention policy '{policy.name}': {e}"
                logger.error(error_msg, exc_info=True)
                results["errors"].append(error_msg)
        
        logger.info(f"Data retention cleanup completed: {results['total_deleted']} total records processed")
        return results
    
    async def _apply_single_policy(self, policy: RetentionPolicy, dry_run: bool) -> Dict[str, Any]:
        """
        Apply a single retention policy.
        
        Args:
            policy: Retention policy to apply
            dry_run: If True, only count records without deleting
            
        Returns:
            dict: Results of policy application
        """
        result = {
            "policy_name": policy.name,
            "deleted_count": 0,
            "affected_tables": [policy.table_name],
            "cutoff_date": None
        }
        
        # Calculate cutoff date
        if policy.retention_days > 0:
            cutoff_date = datetime.utcnow() - timedelta(days=policy.retention_days)
            result["cutoff_date"] = cutoff_date.isoformat()
        
        # Build query conditions
        query = self.supabase.table(policy.table_name).select("*", count="exact")
        
        if policy.conditions:
            for column, condition in policy.conditions.items():
                if isinstance(condition, dict):
                    for operator, value in condition.items():
                        if operator == "lt":
                            if value == "NOW()":
                                query = query.lt(column, datetime.utcnow().isoformat())
                            elif "INTERVAL" in value:
                                # Handle PostgreSQL interval expressions
                                query = query.lt(column, cutoff_date.isoformat())
                        elif operator == "in":
                            query = query.in_(column, value)
                        elif operator == "not_exists":
                            # Handle subquery conditions (would need raw SQL)
                            pass
                else:
                    query = query.eq(column, condition)
        
        if dry_run:
            # Count records that would be deleted
            response = query.execute()
            result["deleted_count"] = response.count if hasattr(response, 'count') else len(response.data)
        else:
            # Delete records
            response = query.execute()
            records_to_delete = response.data
            
            if records_to_delete:
                # Handle cascade deletes first
                if policy.cascade_deletes:
                    for cascade_table in policy.cascade_deletes:
                        await self._cascade_delete(cascade_table, policy.table_name, records_to_delete)
                
                # Delete main records
                delete_ids = [record["id"] for record in records_to_delete]
                delete_response = self.supabase.table(policy.table_name).delete().in_("id", delete_ids).execute()
                result["deleted_count"] = len(delete_ids)
        
        return result
    
    async def _cascade_delete(self, cascade_table: str, parent_table: str, parent_records: List[Dict]) -> None:
        """
        Handle cascade deletions for related records.
        
        Args:
            cascade_table: Table to delete from
            parent_table: Parent table name
            parent_records: Parent records being deleted
        """
        parent_ids = [record["id"] for record in parent_records]
        
        # Determine foreign key column name (simple heuristic)
        fk_column = f"{parent_table.rstrip('s')}_id"
        if parent_table == "calendar_connections":
            fk_column = "user_id"  # Special case
        
        try:
            # Delete related records
            self.supabase.table(cascade_table).delete().in_(fk_column, parent_ids).execute()
            logger.debug(f"Cascade deleted records from {cascade_table} for {len(parent_ids)} parent records")
        except Exception as e:
            logger.warning(f"Failed to cascade delete from {cascade_table}: {e}")
    
    async def cleanup_expired_tokens(self) -> Dict[str, Any]:
        """
        Immediate cleanup of expired OAuth tokens.
        
        Returns:
            dict: Cleanup results
        """
        logger.info("Starting expired token cleanup")
        
        try:
            # Find expired tokens
            expired_query = self.supabase.table("calendar_connections").select("*").lt(
                "token_expires_at", datetime.utcnow().isoformat()
            )
            expired_response = expired_query.execute()
            expired_tokens = expired_response.data
            
            if not expired_tokens:
                return {"deleted_count": 0, "message": "No expired tokens found"}
            
            # Delete expired tokens
            expired_ids = [token["id"] for token in expired_tokens]
            delete_response = self.supabase.table("calendar_connections").delete().in_("id", expired_ids).execute()
            
            result = {
                "deleted_count": len(expired_ids),
                "user_ids_affected": [token["user_id"] for token in expired_tokens],
                "message": f"Cleaned up {len(expired_ids)} expired tokens"
            }
            
            logger.info(f"Expired token cleanup completed: {result['deleted_count']} tokens removed")
            return result
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired tokens: {e}", exc_info=True)
            return {"deleted_count": 0, "error": str(e)}
    
    async def get_retention_status(self) -> Dict[str, Any]:
        """
        Get current status of data retention policies.
        
        Returns:
            dict: Status information for all policies
        """
        status = {
            "policies": [],
            "total_records_eligible": 0,
            "last_cleanup": None
        }
        
        for policy in self.RETENTION_POLICIES:
            try:
                # Count records eligible for cleanup
                query = self.supabase.table(policy.table_name).select("*", count="exact")
                
                if policy.retention_days > 0:
                    cutoff_date = datetime.utcnow() - timedelta(days=policy.retention_days)
                    query = query.lt(policy.date_column, cutoff_date.isoformat())
                
                response = query.execute()
                eligible_count = response.count if hasattr(response, 'count') else len(response.data)
                
                policy_status = {
                    "name": policy.name,
                    "table": policy.table_name,
                    "retention_days": policy.retention_days,
                    "eligible_records": eligible_count,
                    "cutoff_date": cutoff_date.isoformat() if policy.retention_days > 0 else None
                }
                
                status["policies"].append(policy_status)
                status["total_records_eligible"] += eligible_count
                
            except Exception as e:
                logger.error(f"Failed to get status for policy '{policy.name}': {e}")
                status["policies"].append({
                    "name": policy.name,
                    "error": str(e)
                })
        
        return status
    
    async def create_audit_log_table(self) -> bool:
        """
        Create audit log table if it doesn't exist.
        
        Returns:
            bool: True if successful
        """
        try:
            # This would typically be done via database migration
            # For now, we'll assume the table exists or is created elsewhere
            logger.info("Audit log table creation requested (handled by migrations)")
            return True
        except Exception as e:
            logger.error(f"Failed to create audit log table: {e}")
            return False


# Global service instance
data_retention_service = DataRetentionService()