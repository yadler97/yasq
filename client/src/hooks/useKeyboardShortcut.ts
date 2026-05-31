import { useEffect, useRef } from "preact/hooks";

type KeyCombo = {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

export const useKeyboardShortcut = (
  shortcut: KeyCombo,
  callback: (e: KeyboardEvent) => void
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const targetKey = shortcut.key.toLowerCase();
  const reqCtrl = !!shortcut.ctrlKey;
  const reqAlt = !!shortcut.altKey;
  const reqShift = !!shortcut.shiftKey;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchKey = event.key.toLowerCase() === targetKey;
      const matchCtrl = event.ctrlKey === reqCtrl;
      const matchAlt = event.altKey === reqAlt;
      const matchShift = event.shiftKey === reqShift;

      const target = event.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // block the shortcut if the user is typing WITHOUT a modifier key (Ctrl or Alt)
      if (isTyping && !event.ctrlKey && !event.altKey) {
        return;
      }

      if (matchKey && matchCtrl && matchAlt && matchShift) {
        event.preventDefault(); // stops Alt+Key default browser menu actions
        callbackRef.current(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [targetKey, reqCtrl, reqAlt, reqShift]);
};