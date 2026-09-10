import { signal, effect } from '@preact/signals';

export type ThemePreference = 'auto' | 'dark' | 'light';

export const themePreference = signal<ThemePreference>(
  (localStorage.getItem('app-theme-pref') as ThemePreference) || 'auto'
);

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function syncTheme() {
  const pref = themePreference.value;
  let resolved: 'dark' | 'light';

  if (pref === 'auto') {
    resolved = mediaQuery.matches ? 'dark' : 'light';
  } else {
    resolved = pref;
  }

  // Always apply a concrete attribute so CSS
  document.documentElement.dataset.theme = resolved;
}

// Listen for system changes if user is on 'auto'
mediaQuery.addEventListener('change', () => {
  if (themePreference.value === 'auto') {
    syncTheme();
  }
});

effect(() => {
  localStorage.setItem('app-theme-pref', themePreference.value);
  syncTheme();
});
