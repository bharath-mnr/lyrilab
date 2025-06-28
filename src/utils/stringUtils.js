// src/utils/stringUtils.js

/**
 * Converts a string into a URL-friendly slug.
 * @param {string} text The input string (e.g., "Synth & Sound Design").
 * @returns {string} The slugified string (e.g., "synth-and-sound-design").
 */
export const slugify = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and')          // Replace & with 'and'
        .replace(/\s+/g, '-')          // Replace spaces with -
        .replace(/[^\w-]+/g, '')       // Remove all non-word chars
        .replace(/--+/g, '-')          // Replace multiple - with single -
        .replace(/^-+/, '')            // Trim - from start of text
        .replace(/-+$/, '');           // Trim - from end of text
};

/**
 * Converts a slug back into a human-readable string.
 * @param {string} slug The slugified string (e.g., "synth-and-sound-design").
 * @returns {string} The unslugified string (e.g., "Synth And Sound Design").
 */
export const unslugify = (slug) => {
    if (!slug) return '';
    return slug
        .replace(/-/g, ' ') // Replace hyphens with spaces
        .split(' ') // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join(' ');
};