import * as Sentry from '@sentry/react';
import React from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import { onCLS, onINP, onLCP } from 'web-vitals';
import type { Metric } from 'web-vitals';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
  beforeSend(event, hint) {
    const exception = hint?.originalException;
    // Filter out expected HTTP errors (400, 401, 403, 404)
    if (exception && typeof exception === 'object' && 'response' in exception) {
      const status = (exception as { response?: { status?: number } }).response
        ?.status;
      if (status && [400, 401, 403, 404].includes(status)) {
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

// Report Web Vitals (LCP, INP, CLS) to Sentry as custom measurements.
// The reactRouterV7BrowserTracingIntegration captures some vitals,
// but explicit callbacks provide more reliable capture.
function reportWebVital(metric: Metric): void {
  Sentry.setMeasurement(
    `web_vital.${metric.name}`,
    metric.value,
    metric.name === 'CLS' ? '' : 'millisecond'
  );
}

onCLS(reportWebVital);
onINP(reportWebVital);
onLCP(reportWebVital);
