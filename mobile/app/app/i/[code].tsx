/**
 * `app.aceaix.com/app/i/<code>` is the same landing screen as `/i/<code>`.
 *
 * The web build is a static SPA: every path is served as index.html, and
 * Expo Router picks the screen from the browser path. A Vercel rewrite would
 * not change that path, so this route is what makes `/app/i/<code>` open.
 */
export { default } from '../../i/[code]';
