import { writable } from 'svelte/store';

/**
 * @typedef {{
 *   id: number,
 *   message: string,
 *   type: 'success' | 'error' | 'info',
 *   duration: number,
 *   action: { label: string, onClick: () => void } | null
 * }} ToastMessage
 */

/** The toast on screen; a new toast replaces the current one */
export const toast = writable(/** @type {ToastMessage | null} */ (null));

let nextId = 1;

/**
 * @param {{ message: string, type?: ToastMessage['type'], duration?: number, action?: ToastMessage['action'] }} options
 */
export function showToast({ message, type = 'success', duration = 3000, action = null }) {
  toast.set({ id: nextId++, message, type, duration, action });
}

export function dismissToast() {
  toast.set(null);
}
