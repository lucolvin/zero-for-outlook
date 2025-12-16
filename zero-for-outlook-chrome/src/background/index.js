import { registerActionClick } from "./optionsNavigation.js";
import { registerMessageListener } from "./messageRouter.js";

(() => {
  // Initialize background modules for Zero for Outlook (Chrome MV3)
  try {
    registerActionClick();
  } catch (e) {
    // best-effort only
  }

  try {
    registerMessageListener();
  } catch (e) {
    // best-effort only
  }
})();


