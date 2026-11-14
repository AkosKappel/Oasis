import { browser } from 'wxt/browser';
import { registerCaptureActions } from '@/features/capture/capture-actions';
export default defineBackground(() => {
  registerCaptureActions(browser);
});
