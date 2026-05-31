/** Opens the side panel when the toolbar action is clicked (MV3 `sidePanel` API). */
chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
});
