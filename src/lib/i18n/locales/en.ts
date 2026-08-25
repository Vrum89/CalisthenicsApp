import type { TranslationKey } from '@/lib/i18n/locales/it';

/**
 * English. Tipizzato su `TranslationKey`: se manca una chiave presente in
 * `it.ts`, il build fallisce.
 */
export const en: Record<TranslationKey, string> = {
  'app.name': 'Workout Diary',

  'language.label': 'Language',

  'common.retry': 'Retry',
  'common.signOut': 'Sign out',
  'common.signingOut': 'Signing out…',
  'common.loading': 'Loading…',

  'login.subtitle': 'Sign in with your email: you get a link, no password to remember.',
  'login.checkingSession': 'Checking your session…',
  'login.emailLabel': 'Email',
  'login.emailPlaceholder': 'you@example.com',
  'login.submit': 'Send me the link',
  'login.submitting': 'Sending…',
  'login.sentTitle': 'Check your inbox',
  'login.sentBody': 'Sign-in link sent to {email}.',
  'login.sentHint': 'Open it on this device: it works once and expires after an hour.',
  'login.sentSpam': "Don't see it? Check your spam folder before requesting another.",
  'login.otherAddress': 'Use a different address',

  'callback.signingIn': 'Signing you in…',
  'callback.failedTitle': 'Sign-in failed',
  'callback.invalidLink': 'This link is no longer valid: it expired or was already used.',
  'callback.oneTimeUse': 'Each magic link works only once. Request a new one.',
  'callback.backToLogin': 'Back to sign-in',

  'config.title': 'Configuration incomplete',
  'config.body':
    'The app does not know which Supabase project to connect to. These environment variables are missing:',
  'config.instructions':
    'Copy .env.example to .env.local, fill it with the values from Supabase (Project Settings → API Keys) and restart npm run dev.',
  'config.production': 'In production, set the same variables on Vercel.',

  'home.session': 'Active session',
  'home.catalog': 'Exercise catalogue',
  'home.catalogLoading': 'Loading the catalogue…',
  'home.catalogEmpty':
    'The catalogue is empty. Run the final part of supabase/schema.sql, which inserts the default exercises.',

  'nav.dashboard': 'Progress',
  'nav.dashboardHint': 'Charts, records and history per exercise',
  'nav.bodyWeight': 'Body weight',
  'nav.bodyWeightHint': 'Log a weigh-in and see the trend',
  'nav.back': 'Back',

  'dashboard.title': 'Progress',
  'dashboard.exercise': 'Exercise',
  'dashboard.noExercises': 'No exercises in the catalogue.',
  'dashboard.noData': 'No workouts logged for this exercise yet.',
  'dashboard.noChartNote': 'Diary entry only: nothing to chart, the notes are below.',
  'dashboard.noChartSingle': 'More than one session with a value is needed to draw a trend.',
  'dashboard.history': 'History',
  'dashboard.sessions': 'Sessions',
  'dashboard.pr': 'PR',
  'dashboard.newRecord': 'New record',
  'dashboard.excluded': 'Excluded from calculations',
  'dashboard.originalDate': 'originally {date}',
  'dashboard.loading': 'Loading your history…',
  'dashboard.addedWeight': '{kg} kg added',

  'stat.first': 'First',
  'stat.best': 'Best',
  'stat.last': 'Latest',
  'stat.trend': 'Trend',
  'stat.trendSub': 'first → latest',

  'bodyWeight.title': 'Body weight',
  'bodyWeight.weight': 'Weight',
  'bodyWeight.date': 'Date',
  'bodyWeight.note': 'Note',
  'bodyWeight.notePlaceholder': 'optional',
  'bodyWeight.save': 'Log it',
  'bodyWeight.saving': 'Saving…',
  'bodyWeight.saved': 'Weigh-in logged.',
  'bodyWeight.empty': 'No weigh-ins yet. The first one becomes your baseline.',
  'bodyWeight.chartCaption': 'Body weight over time',
  'bodyWeight.history': 'Weigh-ins',
  'bodyWeight.loading': 'Loading your weigh-ins…',
  'bodyWeight.invalid': 'Enter a weight between 20 and 400 kg.',
  'bodyWeight.futureDate': 'The date cannot be in the future.',

  'error.history.load': 'Could not read your history. {detail}',
  'error.bodyWeight.load': 'Could not read your weigh-ins. {detail}',
  'error.bodyWeight.save': 'Could not save the weigh-in. {detail}',

  'category.strength_sets': 'Strength (sets × reps)',
  'category.max_reps_10min': 'Max reps (10 min)',
  'category.time_circuits': 'Timed circuits',
  'category.max_effort': 'Max effort',
  'category.running': 'Running',
  'category.other': 'Other',

  'metric.sets.label': 'Sets',
  'metric.sets.caption': 'Bars: total reps · blue line: added weight (kg)',
  'metric.reps.label': 'Reps',
  'metric.reps.caption': 'Reps completed — higher is better',
  'metric.minutes.label': 'Minutes',
  'metric.minutes.caption': 'EMOM duration in minutes — higher is better',
  'metric.time.label': 'Time',
  'metric.time.caption': 'Total time — lower is better',
  'metric.note.label': 'Note',
  'metric.note.caption': 'Descriptive entry, no numeric value',

  'metric.unit.reps': 'reps',
  'metric.unit.minutes': 'min',
  'metric.unit.seconds': 's',
  'metric.unit.none': '',

  'error.unexpected': 'Unexpected error. {detail}',
  'error.auth.rateLimit':
    "Too many emails sent recently. Supabase's free plan allows only a few per hour: try again in a while.",
  'error.auth.signupsDisabled':
    'Sign-ups are disabled on the Supabase project. Turn on "Allow new users to sign up" under Authentication → Sign In / Providers.',
  'error.auth.invalidEmail': 'That email address does not look valid.',
  'error.auth.network':
    'Cannot reach Supabase. Check your connection, and that the project is not paused.',
  'error.auth.sendFailed': 'Could not send the link. {detail}',
  'error.auth.signOutFailed': 'Sign-out failed. {detail}',

  'error.db.missingTables':
    'The tables do not exist in the database yet. Apply supabase/schema.sql from the Supabase dashboard (SQL Editor → New query).',
  'error.db.permissions':
    'Missing permissions on the table. Check that you also ran the GRANT section of supabase/schema.sql.',
  'error.db.expiredSession': 'Session expired. Sign out and back in with a new magic link.',
  'error.exercises.load': 'Could not read the exercise catalogue. {detail}',

  'error.domain.unknownMetricType': 'Metric type not recognised by the domain: "{value}".',
  'error.domain.unknownWorkoutType': 'Workout type not recognised by the domain: "{value}".',
  'error.domain.invalidNumber': 'Invalid numeric value from the database: "{value}".',
};
