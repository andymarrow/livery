// Set at build time: production talks to livery.site, the dev build to localhost.
declare const __LIVERY_URL__: string;
export const LIVERY_URL = __LIVERY_URL__;
// Test builds only (never shipped): the popup measures the tab named in its URL.
declare const __LIVERY_TEST__: boolean;
export const TEST_BUILD = __LIVERY_TEST__;
