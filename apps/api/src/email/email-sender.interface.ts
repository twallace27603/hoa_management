export interface OutgoingEmail {
  to: string[];
  subject: string;
  body: string;
}

// Swappable so Azure Communication Services can be replaced (e.g. by
// SendGrid) without touching call sites in EmailService.
export interface EmailSender {
  send(message: OutgoingEmail): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
