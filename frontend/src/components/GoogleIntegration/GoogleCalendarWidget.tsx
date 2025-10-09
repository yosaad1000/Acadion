import React, { useState, useEffect } from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { googleCalendarService, GoogleCalendarEvent, CalendarEventResponse } from '../../services/googleCalendarService';

interface GoogleCalendarWidgetProps {
  sessionData?: {
    name: string;
    description?: string;
    session_date: string;
  };
  onEventCreated?: (eventData: any) => void;
  onError?: (error: string) => void;
  className?: string;
  showCreateEvent?: boolean;
  showUpcomingEvents?: boolean;
}

export const GoogleCalendarWidget: React.FC<GoogleCalendarWidgetProps> = ({
  sessionData,
  onEventCreated,
  onError,
  className = '',
  showCreateEvent = true,
  showUpcomingEvents = true,
}) => {
  const { isAuthenticated, isTokenValid } = useGoogleAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventResponse[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<GoogleCalendarEvent>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    attendees: [],
    meet_link: true,
  });

  const isIntegrationReady = isAuthenticated && isTokenValid;

  // Load upcoming events
  useEffect(() => {
    if (isIntegrationReady && showUpcomingEvents) {
      loadUpcomingEvents();
    }
  }, [isIntegrationReady, showUpcomingEvents]);

  const loadUpcomingEvents = async () => {
    try {
      setIsLoading(true);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // Next 7 days

      const events = await googleCalendarService.getEvents(startDate, endDate);
      setUpcomingEvents(events.slice(0, 5)); // Show only first 5 events
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load calendar events';
      onError?.(errorMessage);
      console.error('Error loading upcoming events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSessionEvent = async () => {
    if (!sessionData) return;

    try {
      setIsLoading(true);
      const eventData = await googleCalendarService.createSessionEvent(sessionData);
      onEventCreated?.(eventData);
      
      // Refresh upcoming events
      if (showUpcomingEvents) {
        await loadUpcomingEvents();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session event';
      onError?.(errorMessage);
      console.error('Error creating session event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      const createdEvent = await googleCalendarService.createEvent(eventForm);
      
      // Reset form
      setEventForm({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        attendees: [],
        meet_link: true,
      });
      setShowEventForm(false);
      
      onEventCreated?.(createdEvent);
      
      // Refresh upcoming events
      if (showUpcomingEvents) {
        await loadUpcomingEvents();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create calendar event';
      onError?.(errorMessage);
      console.error('Error creating custom event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatEventTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isIntegrationReady) {
    return (
      <div className={`google-calendar-widget ${className}`}>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl flex-shrink-0" role="img" aria-label="Calendar">
              📅
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">Google Calendar</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Connect Google Workspace to use calendar features
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`google-calendar-widget ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl sm:text-2xl flex-shrink-0" role="img" aria-label="Calendar">
              📅
            </span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">Google Calendar</h3>
          </div>
          
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent flex-shrink-0" />
          )}
        </div>

        {/* Session Event Creation */}
        {sessionData && showCreateEvent && (
          <div className="mb-3 sm:mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">Create Calendar Event</h4>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 break-words">
                  Add "{sessionData.name}" to your Google Calendar with Meet link
                </p>
              </div>
              <button
                onClick={handleCreateSessionEvent}
                disabled={isLoading}
                className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white disabled:opacity-50 text-xs sm:text-sm flex-shrink-0"
              >
                Add to Calendar
              </button>
            </div>
          </div>
        )}

        {/* Custom Event Creation */}
        {showCreateEvent && (
          <div className="mb-3 sm:mb-4">
            {!showEventForm ? (
              <button
                onClick={() => setShowEventForm(true)}
                className="w-full btn-mobile border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm"
              >
                + Create Custom Event
              </button>
            ) : (
              <form onSubmit={handleCreateCustomEvent} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Event title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="input-mobile text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Description (optional)"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    className="input-mobile text-xs sm:text-sm"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={eventForm.start_time}
                      onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                      className="input-mobile text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={eventForm.end_time}
                      onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                      className="input-mobile text-xs sm:text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="meet-link"
                    checked={eventForm.meet_link}
                    onChange={(e) => setEventForm({ ...eventForm, meet_link: e.target.checked })}
                    className="rounded touch-manipulation"
                  />
                  <label htmlFor="meet-link" className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    Add Google Meet link
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white disabled:opacity-50 text-xs sm:text-sm"
                  >
                    Create Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventForm(false)}
                    className="btn-mobile border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Upcoming Events */}
        {showUpcomingEvents && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Upcoming Events</h4>
              <button
                onClick={loadUpcomingEvents}
                disabled={isLoading}
                className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 touch-manipulation"
              >
                Refresh
              </button>
            </div>
            
            {upcomingEvents.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No upcoming events in the next 7 days
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-2 sm:p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">
                          {event.summary}
                        </h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {formatEventTime(event.start.dateTime)}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm sm:text-base text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 touch-manipulation p-1"
                          title="Open in Google Calendar"
                        >
                          📅
                        </a>
                        {googleCalendarService.extractMeetLink(event) && (
                          <a
                            href={googleCalendarService.extractMeetLink(event)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm sm:text-base text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 touch-manipulation p-1"
                            title="Join Google Meet"
                          >
                            📹
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarWidget;