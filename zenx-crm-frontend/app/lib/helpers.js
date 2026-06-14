// app/lib/helpers.js

/**
 * Retrieve a customer attribute value by key.
 * @param {Array<{key: string, value: string}>} attributes
 * @param {string} key
 * @returns {string}
 */
export const getAttr = (attributes, key) =>
  attributes?.find((a) => a.key === key)?.value || '—';

/**
 * Retrieve a customer identity value by channel.
 * @param {Array<{channel: string, value: string}>} identities
 * @param {string} channel
 * @returns {string}
 */
export const getIdentity = (identities, channel) =>
  identities?.find((i) => i.channel === channel)?.value || '—';

/**
 * Format a numeric string as Indian Rupee currency.
 * @param {string|number} val
 * @returns {string}
 */
export const formatCurrency = (val) =>
  val && val !== '—' ? `₹${parseInt(val).toLocaleString('en-IN')}` : '—';
