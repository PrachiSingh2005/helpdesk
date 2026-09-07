/**
 * Custom event helper to synchronize real-time state between Dashboard,
 * Ticket Queue, and Email Simulator components instantly without relying solely on timers.
 */
export const TICKET_CHANGED_EVENT = 'helpdesk-tickets-changed';

export const notifyTicketsChanged = () => {
  window.dispatchEvent(new Event(TICKET_CHANGED_EVENT));
};
