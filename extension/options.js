'use strict';

const ENABLED_KEY = 'hotel-direct:enabled';
const HIDDEN_KEY = 'hotel-direct:hidden';

const enabled = document.getElementById('enabled');
const hiddenCount = document.getElementById('hidden-count');
const clearHidden = document.getElementById('clear-hidden');
const version = document.getElementById('version');

async function readHidden() {
  const store = await chrome.storage.local.get(HIDDEN_KEY);
  return Array.isArray(store[HIDDEN_KEY]) ? store[HIDDEN_KEY] : [];
}

async function render() {
  const store = await chrome.storage.local.get(ENABLED_KEY);
  enabled.checked = store[ENABLED_KEY] !== false;

  const hidden = await readHidden();
  hiddenCount.textContent =
    hidden.length === 0
      ? 'Список пуст: карточка показывается для всех отелей.'
      : `Скрыто отелей: ${hidden.length}.`;
  clearHidden.disabled = hidden.length === 0;
}

enabled.addEventListener('change', async () => {
  await chrome.storage.local.set({ [ENABLED_KEY]: enabled.checked });
});

clearHidden.addEventListener('click', async () => {
  await chrome.storage.local.set({ [HIDDEN_KEY]: [] });
  await render();
});

version.textContent = chrome.runtime.getManifest().version;
render();
