// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — shared constants / shapes                             ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/** @typedef {'floating' | 'set'} ChromeFilterKind */

/**
 * @typedef {Object} ChromeFilterClause
 * @property {ChromeFilterKind} kind
 * @property {string} op
 * @property {*} value
 */

/**
 * @typedef {Object.<string, ChromeFilterClause>} ChromeFilterState
 */

/**
 * @typedef {Object} ConditionalFormatRule
 * @property {string} op
 * @property {*} value
 * @property {string} [fg]
 * @property {string} [bg]
 */

export const CHROME_THEME_ATTR = "data-ag-theme";
export const DEFAULT_THEME_ID = "quartz";
export const FLOATING_FILTER_DEBOUNCE_MS = 200;
