import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from uuid import UUID
from app.settings import settings
from app.models.google_integration import GoogleCalendarEvent
from app.services.google_oauth import google_integration_service

logger = logging.getLogger(__name__)

class GoogleCalendarService:
    """Google Calendar integration service"""
    
    def __init__(self):
        try:
            self.base_url = "https://www.googleapis.com/calendar/v3"
            self._connection_healthy = True
            logger.info("✅ Google Calendar Service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Error initializing Google Calendar Service: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize Google Calendar Service: {e}")
    
    async def _get_auth_headers(self, user_id: UUID) -> Optional[Dict[str, str]]:
        """Get authenticated headers for Google Calendar API"""
        try:
            access_token = await google_integration_service.get_valid_access_token(user_id)
            if not access_token:
                logger.error(f"❌ No valid access token for user: {user_id}")
                return None
            
            return {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }
        except Exception as e:
            logger.error(f"❌ Error getting auth headers: {e}")
            return None
    
    async def get_primary_calendar(self, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get user's primary calendar"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return None
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/calendars/primary",
                    headers=headers
                )
                
                if response.status_code == 200:
                    calendar_data = response.json()
                    logger.info(f"✅ Retrieved primary calendar for user: {user_id}")
                    return calendar_data
                else:
                    logger.error(f"❌ Failed to get primary calendar: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting primary calendar: {e}")
            return None
    
    async def create_calendar_event(self, user_id: UUID, event: GoogleCalendarEvent) -> Optional[Dict[str, Any]]:
        """Create a calendar event"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return None
            
            # Prepare event data
            event_data = {
                "summary": event.title,
                "description": event.description or "",
                "start": {
                    "dateTime": event.start_time.isoformat(),
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": event.end_time.isoformat(),
                    "timeZone": "UTC"
                },
                "attendees": [{"email": email} for email in (event.attendees or [])],
            }
            
            # Add Google Meet if requested
            if event.meet_link:
                event_data["conferenceData"] = {
                    "createRequest": {
                        "requestId": f"meet-{user_id}-{int(datetime.utcnow().timestamp())}",
                        "conferenceSolutionKey": {"type": "hangoutsMeet"}
                    }
                }
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/calendars/primary/events"
                if event.meet_link:
                    url += "?conferenceDataVersion=1"
                
                response = await client.post(
                    url,
                    headers=headers,
                    json=event_data
                )
                
                if response.status_code == 200:
                    created_event = response.json()
                    logger.info(f"✅ Created calendar event: {created_event.get('id')} for user: {user_id}")
                    return created_event
                else:
                    logger.error(f"❌ Failed to create calendar event: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error creating calendar event: {e}")
            return None
    
    async def update_calendar_event(self, user_id: UUID, event_id: str, event: GoogleCalendarEvent) -> Optional[Dict[str, Any]]:
        """Update an existing calendar event"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return None
            
            # Prepare event data
            event_data = {
                "summary": event.title,
                "description": event.description or "",
                "start": {
                    "dateTime": event.start_time.isoformat(),
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": event.end_time.isoformat(),
                    "timeZone": "UTC"
                },
                "attendees": [{"email": email} for email in (event.attendees or [])],
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    f"{self.base_url}/calendars/primary/events/{event_id}",
                    headers=headers,
                    json=event_data
                )
                
                if response.status_code == 200:
                    updated_event = response.json()
                    logger.info(f"✅ Updated calendar event: {event_id} for user: {user_id}")
                    return updated_event
                else:
                    logger.error(f"❌ Failed to update calendar event: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error updating calendar event: {e}")
            return None
    
    async def delete_calendar_event(self, user_id: UUID, event_id: str) -> bool:
        """Delete a calendar event"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return False
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/calendars/primary/events/{event_id}",
                    headers=headers
                )
                
                if response.status_code == 204:
                    logger.info(f"✅ Deleted calendar event: {event_id} for user: {user_id}")
                    return True
                else:
                    logger.error(f"❌ Failed to delete calendar event: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Error deleting calendar event: {e}")
            return False
    
    async def get_calendar_events(self, user_id: UUID, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get calendar events within a date range"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return []
            
            params = {
                "timeMin": start_date.isoformat() + "Z",
                "timeMax": end_date.isoformat() + "Z",
                "singleEvents": "true",
                "orderBy": "startTime",
                "maxResults": 100
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/calendars/primary/events",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    events_data = response.json()
                    events = events_data.get("items", [])
                    logger.info(f"✅ Retrieved {len(events)} calendar events for user: {user_id}")
                    return events
                else:
                    logger.error(f"❌ Failed to get calendar events: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ Error getting calendar events: {e}")
            return []
    
    async def create_session_event(self, user_id: UUID, session_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a calendar event for a session"""
        try:
            # Extract session information
            session_name = session_data.get("name", "Class Session")
            session_description = session_data.get("description", "")
            session_date = session_data.get("session_date")
            
            if not session_date:
                logger.warning("⚠️ No session date provided for calendar event")
                return None
            
            # Parse session date
            if isinstance(session_date, str):
                session_datetime = datetime.fromisoformat(session_date.replace("Z", "+00:00"))
            else:
                session_datetime = session_date
            
            # Default to 1-hour session
            end_datetime = session_datetime + timedelta(hours=1)
            
            # Create calendar event
            calendar_event = GoogleCalendarEvent(
                title=f"📚 {session_name}",
                description=f"Class Session: {session_name}\n\n{session_description}",
                start_time=session_datetime,
                end_time=end_datetime,
                meet_link=True,  # Always create Meet link for sessions
                attendees=[]  # Will be populated with enrolled students
            )
            
            created_event = await self.create_calendar_event(user_id, calendar_event)
            
            if created_event:
                logger.info(f"✅ Created session calendar event: {created_event.get('id')}")
                return {
                    "event_id": created_event.get("id"),
                    "html_link": created_event.get("htmlLink"),
                    "meet_link": self._extract_meet_link(created_event),
                    "calendar_link": created_event.get("htmlLink")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error creating session calendar event: {e}")
            return None
    
    def _extract_meet_link(self, event_data: Dict[str, Any]) -> Optional[str]:
        """Extract Google Meet link from event data"""
        try:
            conference_data = event_data.get("conferenceData", {})
            entry_points = conference_data.get("entryPoints", [])
            
            for entry_point in entry_points:
                if entry_point.get("entryPointType") == "video":
                    return entry_point.get("uri")
            
            return None
        except Exception as e:
            logger.error(f"❌ Error extracting Meet link: {e}")
            return None

# Create service instance
google_calendar_service = GoogleCalendarService()