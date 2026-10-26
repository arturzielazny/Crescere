/**
 * Measurement actions used by the edit sheet.
 */

import { get } from 'svelte/store';
import { deleteMeasurement, restoreMeasurement } from '../stores/childStore.js';
import { showToast } from '../stores/toastStore.js';
import { t } from '../stores/i18n.js';

/** Delete right away and offer an Undo toast instead of asking for confirmation */
export function deleteMeasurementWithUndo(id) {
  const removed = deleteMeasurement(id);
  if (!removed) return;
  const translate = get(t);
  showToast({
    message: translate('measurements.deleted'),
    type: 'info',
    duration: 6000,
    action: {
      label: translate('common.undo'),
      onClick: () => restoreMeasurement(removed.childId, removed.measurement)
    }
  });
}
