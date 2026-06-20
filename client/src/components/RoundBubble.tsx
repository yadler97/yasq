export interface RoundResult {
  round?: number;
  scoreValue: number;
  points: number;
  guess?: string;
  isFirst?: boolean;
}

interface RoundBubblesGroupProps {
  rounds: RoundResult[];
  userId: string;
  activeTooltipId: string | null;
  setActiveTooltipId: (id: string | null) => void;
}

export const RoundBubblesGroup = (
  {rounds, userId, activeTooltipId, setActiveTooltipId}: RoundBubblesGroupProps
) => {
  return (
    <div className="round-bubbles">
      {rounds.map((r) => (
        <RoundBubble
          key={r.round}
          roundResult={r}
          userId={userId}
          activeTooltipType={activeTooltipId}
          setActiveTooltipType={setActiveTooltipId}
        />
      ))}
    </div>
  );
};


interface RoundBubbleProps {
  roundResult: RoundResult;
  userId: string;
  activeTooltipType: string | null;
  setActiveTooltipType: (id: string | null) => void;
}

export const RoundBubble = (
  {roundResult, userId, activeTooltipType, setActiveTooltipType}: RoundBubbleProps
) => {
  const tooltipId = roundResult.round ? `round-${userId}-${roundResult.round}` : `user-${userId}`;
  const isTooltipOpen = activeTooltipType === tooltipId;

  const measureBubbleBounds = (el: HTMLDivElement) => {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    el.style.setProperty('--bubble-x', `${rect.left}px`);
    // Computed styles of the tooltip with a width dynamically adjusted to fit the text
    const computedStyle = window.getComputedStyle(el, '::after');
    el.style.setProperty('--tooltip-width', computedStyle.width);
  };

  const optionalRoundPrefix = roundResult.round ? `Round ${roundResult.round}: ` : '';
  const tooltipContent = `${optionalRoundPrefix}${roundResult.guess || 'No guess'}`;

  return (
    <div
      className={`round-bubble ${roundResult.scoreValue > 0 ? 'correct' : 'incorrect'} ${roundResult.isFirst ? 'first' : ''} ${isTooltipOpen ? "show-tooltip" : ""}`}
      data-tooltip={tooltipContent}

      // Measure actual position and width of current bubble when tapped/hovered on
      onMouseEnter={(e) => measureBubbleBounds(e.currentTarget as HTMLDivElement)}
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
        measureBubbleBounds(e.currentTarget as HTMLDivElement);
        setActiveTooltipType(isTooltipOpen ? null : tooltipId);
      }}
    >
      {roundResult.points}
    </div>
  );
};