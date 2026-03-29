import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  beforeSend(event, hint) {
    const exception = hint?.originalException;
    // Filter out expected HTTP errors (400, 401, 403, 404)
    if (exception && typeof exception === 'object' && 'status' in exception) {
      const status = (exception as { status: number }).status;
      if ([400, 401, 403, 404].includes(status)) {
        return null;
      }
    }
    // Scrub PII: email and phone fields
    if (event.user) {
      delete event.user.email;
    }
    if (event.extra) {
      for (const key of Object.keys(event.extra)) {
        if (
          key.toLowerCase().includes('phone') ||
          key.toLowerCase().includes('mobile')
        ) {
          delete event.extra[key];
        }
      }
    }
    return event;
  },
});
