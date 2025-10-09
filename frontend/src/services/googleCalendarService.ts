import { supabase } from '../lib/supabase';

export interface GoogleCalendarEvent {
  title: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  attendees?: string[];
  meet_link?: boolean;
}

export interface CalendarEventResponse {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  htmlLink: string;
  conferenceData?: {
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
}

export interface SessionEventData {
  event_id: string;
  html_link: string;
  meet_link?: string;
  calendar_link: string;
}

class GoogleCalendarService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  /**
   * Get user's primary Google Calendar
   */
  async getPrimaryCalendar(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/calendar/primary`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.calendar;
    } catch (error) {
      console.error('Error getting primary calendar:', error);
      throw error;
    }
  }

  /**
   * Create a Google Calendar event
   */
  async createEvent(event: GoogleCalendarEvent): Promise<CalendarEventResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/calendar/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.event;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Update a Google Calendar event
   */
  async updateEvent(eventId: string, event: GoogleCalendarEvent): Promise<CalendarEventResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/calendar/events/${eventId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.event;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a Google Calendar event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Get calendar events within a date range
   */
  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEventResponse[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const response = await fetch(`${this.baseUrl}/api/google/calendar/events?${params}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.events;
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw error;
    }
  }

  /**
   * Create a calendar event for a session
   */
  async createSessionEvent(sessionData: {
    name: string;
    description?: string;
    session_date: string;
  }): Promise<SessionEventData> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/calendar/session-event`, {
        method: 'POST',
        headers,
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.event_data;
    } catch (error) {
      console.error('Error creating session calendar event:', error);
      throw error;
    }
  }

  /**
   * Extract Google Meet link from calendar event
   */
  extractMeetLink(event: CalendarEventResponse): string | null {
    try {
      const entryPoints = event.conferenceData?.entryPoints || [];
      const videoEntry = entryPoints.find(entry => entry.entryPointType === 'video');
      return videoEntry?.uri || null;
    } catch (error) {
      console.error('Error extracting Meet link:', error);
      return null;
    }
  }

  /**
   * Format event for display
   */
  formatEventForDisplay(event: CalendarEventResponse) {
    return {
      id: event.id,
      title: event.summary,
      description: event.description,
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      htmlLink: event.htmlLink,
      meetLink: this.extractMeetLink(event),
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();