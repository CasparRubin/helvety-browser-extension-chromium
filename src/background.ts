/** Opens the side panel when the toolbar action is clicked (MV3 `sidePanel` API). */
function enableSidePanelOnActionClick(): void {
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
}

// Every service-worker wake: Chrome can drop panel behavior after SW eviction.
enableSidePanelOnActionClick();

chrome.runtime.onInstalled.addListener(() => {
  enableSidePanelOnActionClick();
});
