import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export const Dropdown = ({
  options,
  value,
  onChange,
  disabled
}: {
  options: Record<string, string>,
  value: string,
  onChange: (val: string) => void,
  disabled?: boolean
}) => {
  const isOpen = useSignal(false);
  const longestOption = Object.values(options).reduce((a, b) => (a.length > b.length ? a : b), "");

  useEffect(() => {
    if (!isOpen.value) return;

    const firstItem = document.querySelector(".dropdown-menu .dropdown-item") as HTMLElement;
    firstItem?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        isOpen.value = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen.value]);

  const closeMenuAndFocusTrigger = (currentTarget: HTMLElement) => {
    isOpen.value = false;
    const container = currentTarget.closest(".filter-dropdown");
    (container?.querySelector(".dropdown-trigger") as HTMLElement)?.focus();
  };

  return (
    <div
      className="filter-dropdown"
      style={{ "--longest-text": `"${longestOption}"` }}
    >
      <button
        className={`dropdown-trigger`}
        style={{ width: "100%" }}
        disabled={disabled}
        onClick={() => (isOpen.value = !isOpen.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter") {
            e.preventDefault();
            isOpen.value = true;
          }
        }}
      >
        <span className="current-value">{options[value]}</span>
        <span className={`arrow-indicator ${isOpen.value ? "open" : ""}`} />
      </button>

      {isOpen.value && (
        <>
          <div className="dropdown-overlay" onClick={() => (isOpen.value = false)} />
          <div
            className="dropdown-menu"
            onWheel={(e) => {
              const container = e.currentTarget.querySelector(".scrollbar-container") as HTMLElement;
              if (!container) return;

              const atTop = container.scrollTop === 0;
              const atBottom = container.scrollHeight - container.scrollTop === container.clientHeight;

              if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                e.preventDefault();
              }
            }}
          >
            <div className="scrollbar-container">
              {Object.entries(options).map(([key, label]) => {
                const selectOption = (currentTarget: HTMLElement) => {
                  onChange(key);
                  closeMenuAndFocusTrigger(currentTarget);
                };

                return (
                  <div
                    key={key}
                    className={`dropdown-item single-select ${value === key ? 'active' : ''}`}
                    tabIndex={0}
                    onClick={(e) => selectOption(e.currentTarget)}
                    onKeyDown={(e) => {
                      const target = e.currentTarget;

                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectOption(target);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        (target.nextElementSibling as HTMLElement)?.focus();
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        if (target.previousElementSibling) {
                          (target.previousElementSibling as HTMLElement)?.focus();
                        } else {
                          closeMenuAndFocusTrigger(target);
                        }
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        isOpen.value = false;
                        closeMenuAndFocusTrigger(target);
                      }
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};