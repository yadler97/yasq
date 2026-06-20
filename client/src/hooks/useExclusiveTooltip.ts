import { useState, useEffect } from 'preact/hooks';

export const useExclusiveTooltip = () => {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTooltipId) return;

    const closeAll = () => setActiveTooltipId(null);
    window.addEventListener("touchstart", closeAll);
    window.addEventListener("click", closeAll);
    window.addEventListener("scroll", closeAll, true);

    return () => {
      window.removeEventListener("touchstart", closeAll);
      window.removeEventListener("click", closeAll);
      window.removeEventListener("scroll", closeAll, true);
    };
  }, [activeTooltipId]);

  return { activeTooltipId, setActiveTooltipId };
};