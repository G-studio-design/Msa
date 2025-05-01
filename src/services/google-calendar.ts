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

/**
 * Asynchronously schedules an event in Google Calendar.
 *
 * @param event The event to schedule.
 * @returns A promise that resolves to a string containing the ID of the created event.
 */
export async function scheduleEvent(event: CalendarEvent): Promise<string> {
  // TODO: Implement this by calling the Google Calendar API.
  console.log('TODO: Implement scheduleEvent');

  return 'stubbed-calendar-event-id';
}
