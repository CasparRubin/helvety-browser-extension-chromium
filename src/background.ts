void chrome.runtime.onInstalled.addListener(() => {
  // MV3 requires a service worker; auth, E2EE, and UI run in the popup only.
});
