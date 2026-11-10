/* Stable entry point for the manager's search -> editor -> saved-cover flow.
 * Covers viewport, comment restoration, failure/retry, single-item writes and limits.
 * All service writes are intercepted by the shared scenario. */
require('./manager-search-dropdown.smoke.cjs');
