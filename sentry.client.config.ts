// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isDevOrStaging = typeof window !== "undefined" && (
  window.location.hostname === "localhost" ||
  window.location.hostname.includes("dev") ||
  window.location.hostname.includes("staging") ||
  window.location.hostname.includes("vercel.app")
);

Sentry.init({
  dsn: "https://58f0b7b1a616f2dfd2fa93a71032aa5c@o4511462870941696.ingest.de.sentry.io/4511462874873936",

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: isDevOrStaging ? 1.0 : 0.1,

  // Define URLs where traces should be propagated (distributed tracing)
  tracePropagationTargets: [
    "localhost",
    ...(process.env.NEXT_PUBLIC_APP_URL ? [new RegExp(`^${process.env.NEXT_PUBLIC_APP_URL.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}/api`)] : []),
  ],

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  replaysSessionSampleRate: isDevOrStaging ? 1.0 : 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
