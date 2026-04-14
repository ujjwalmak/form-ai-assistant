function tryInjectPanel() {
  const hasForm = document.querySelector('form') || document.querySelector('input[type="text"]') || document.querySelector('select') || document.querySelector('textarea');
  if (hasForm) {
    injectPanel();
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  tryInjectPanel();
} else {
  window.addEventListener('DOMContentLoaded', tryInjectPanel);
  window.addEventListener('load', tryInjectPanel);
}