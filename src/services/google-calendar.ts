/**
 * Represents an event to be scheduled in Google Calendar.
 */
export interface CalendarEvent {
  /**
   * The title of the event (e.g., Project Sidang).
   */
  title: string;
  /**
   * The location where the event will take place.
   */
  location: string;
  /**
   * The start time of the event in ISO 8601 format (e.g., '2024-08-15T09:00:00-07:00').
   */
  startTime: string;
  /**
   * The end time of the event in ISO 8601 format (e.g., '2024-08-15T10:00:00-07:00').
   */
  endTime: string;
  /**
   * A description of the event.
   */
  description: string;
}
