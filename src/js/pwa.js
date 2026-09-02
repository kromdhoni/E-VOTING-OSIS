export function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/E-VOTING-OSIS/sw.js').catch(() => {});
  }
}
registerSW();
