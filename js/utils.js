/* ============================================
   PDF Tools — js/utils.js
   Author: gorupa (https://github.com/gorupa)
   License: MIT
   Description: Shared utility functions used
                by compress.js, lock.js and
                merge.js. Must be loaded first.
   ============================================ */

'use strict';

/**
 * Format bytes into a human-readable string
 * @param {number} bytes
 * @returns {string}
 */
function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Calculate percentage saved between two sizes
 * @param {number} a - Original size
 * @param {number} b - New size
 * @returns {number}
 */
function pct(a, b) {
    return Math.max(0, Math.round((1 - b / a) * 100));
}

/**
 * Show an element by removing the .hidden class
 * @param {HTMLElement} el
 */
function show(el) { el.classList.remove('hidden'); }

/**
 * Hide an element by adding the .hidden class
 * @param {HTMLElement} el
 */
function hide(el) { el.classList.add('hidden'); }

/**
 * Update a range slider's gradient fill to match its current value
 * @param {HTMLInputElement} slider
 */
function setSliderBg(slider) {
    const val = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background =
        `linear-gradient(to right, var(--primary) 0%, var(--primary) ${val}%, #e0d9f7 ${val}%, #e0d9f7 100%)`;
}

/**
 * Switch between Compress / Lock / Merge tabs
 * @param {string} tab - 'compress' | 'lock' | 'merge'
 */
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`panel-${tab}`).classList.add('active');
}
