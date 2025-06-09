// Sentry отключен для локальной версии

import * as Sentry from '@sentry/electron/main';

import * as session from '../account/session';
import { type ChangeBufferEvent, database as db } from '../common/database';
import { SENTRY_OPTIONS } from '../common/sentry';
import * as models from '../models/index';
import { isSettings } from '../models/settings';

let enabled = false;

/**
 * Watch setting for changes. This must be called after the DB is initialized.
 */
export function sentryWatchAnalyticsEnabled() {
  // Sentry отключен для локальной версии
  enabled = false;
}

// some historical context:
// At beginning We are vendoring ElectronOfflineNetTransport just to be able to control whether or not sending is allowed
// https://github.com/getsentry/sentry-electron/issues/489
// After the official support. Now we could use the transportOptions.shouldSend to control whether or not sending is allowed
// https://github.com/getsentry/sentry-electron/pull/889
// docs: https://docs.sentry.io/platforms/javascript/guides/electron/
export function initializeSentry() {
  // Sentry отключен для локальной версии
  console.log('[sentry] Disabled in local version');
}
