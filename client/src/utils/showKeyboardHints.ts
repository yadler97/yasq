import { signal, effect } from '@preact/signals';

export const showKeyboardHints = signal<boolean>(localStorage.getItem('app-show-hints') !== 'false');

effect(() => {
  const show = showKeyboardHints.value;
  localStorage.setItem('app-show-hints', String(show));
  document.documentElement.dataset.keyboardHints = String(show);
});
