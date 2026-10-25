/**
 * Svelte action for modal dialogs: moves focus into the dialog, keeps Tab
 * inside it, closes it on Escape and gives focus back to the opener on close.
 * Stacked dialogs (a confirm on top of a modal) only react while on top.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** @type {HTMLElement[]} */
const stack = [];

function visibleFocusable(node) {
  return [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
}

/**
 * @param {HTMLElement} node
 * @param {{ onClose?: () => void }} [options]
 */
export function dialog(node, options = {}) {
  let onClose = options.onClose;
  const opener = /** @type {HTMLElement | null} */ (document.activeElement);
  stack.push(node);

  // Prefer an explicit target, then the first form field, then any control
  requestAnimationFrame(() => {
    if (node.contains(document.activeElement)) return;
    const target =
      node.querySelector('[data-autofocus]') ||
      visibleFocusable(node).find((el) => el.matches('input, select, textarea')) ||
      visibleFocusable(node)[0];
    /** @type {HTMLElement | undefined} */ (target)?.focus();
  });

  function handleKeydown(event) {
    if (stack.at(-1) !== node) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = visibleFocusable(node);
    if (items.length === 0) return;
    const first = items[0];
    const last = items.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first || !node.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  window.addEventListener('keydown', handleKeydown);

  return {
    update(next = {}) {
      onClose = next.onClose;
    },
    destroy() {
      window.removeEventListener('keydown', handleKeydown);
      stack.splice(stack.indexOf(node), 1);
      if (opener?.isConnected) opener.focus();
    }
  };
}
