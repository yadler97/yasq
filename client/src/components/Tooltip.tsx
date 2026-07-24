import { useId } from "preact/hooks";
import { cloneElement, HTMLAttributes, isValidElement, VNode } from "preact";
import { activeTooltipId, measureBounds } from "../utils/exclusiveTooltip";
import { ReactNode } from "preact/compat";

interface WithTooltipProps extends HTMLAttributes<HTMLDivElement> {
  /** The text content to display in the tooltip */
  text: string;
  /** Single child element extended by the dynamic tooltip */
  children: VNode<any>;
  /** Optional custom ID. If omitted, useId() generates a unique stable ID */
  id?: string;
  /** Disable tooltip functionality entirely */
  disabled?: boolean;
}

export const WithTooltip = ({
  text,
  children,
  id,
  disabled = false,
}: WithTooltipProps) => {
  const generatedId = useId();
  const tooltipId = id ?? generatedId;

  const isTooltipOpen = activeTooltipId.value === tooltipId;

  // Fall back gracefully if disabled or if children is not a valid VNode
  if (disabled || !text || !isValidElement(children)) {
    return children;
  }

  const handleOpen = (el: HTMLElement) => {
    measureBounds(el);
    activeTooltipId.value = tooltipId;
  };

  const handleClose = () => {
    if (activeTooltipId.value === tooltipId) {
      activeTooltipId.value = null;
    }
  };

  const handleToggle = (el: HTMLElement) => {
    measureBounds(el);
    activeTooltipId.value = isTooltipOpen ? null : tooltipId;
  };

  const childProps = children.props || {};

  return cloneElement(children, {
    "data-tooltip": text,
    className: `has-tooltip ${isTooltipOpen ? "show-tooltip" : ""} ${childProps.className || ""}`.trim(),
    onMouseEnter: (e: MouseEvent) => {
      childProps.onMouseEnter?.(e);
      handleOpen(e.currentTarget as HTMLElement);
    },
    onMouseLeave: (e: MouseEvent) => {
      childProps.onMouseLeave?.(e);
      handleClose();
    },
    onTouchStart: (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      childProps.onTouchStart?.(e);
      handleToggle(e.currentTarget as HTMLElement);
    },
    onFocus: (e: FocusEvent) => {
      childProps.onFocus?.(e);
      handleOpen(e.currentTarget as HTMLElement);
    },
    onBlur: (e: FocusEvent) => {
      childProps.onBlur?.(e);
      handleClose();
    },
  });
};


interface TooltipDivProps {
  /** The text content to display in the tooltip */
  text: string;
  /** Single child element or inline text wrapped by div with dynamic tooltip */
  children: ReactNode;
  /** Optional custom ID. If omitted, useId() generates a unique stable ID */
  id?: string;
  /** Disable tooltip functionality entirely */
  disabled?: boolean;
  className?: string;
}

export const TooltipDiv = ({
  text,
  children,
  id,
  disabled = false,
  className = "",
}: TooltipDivProps) => {
  return (
    <WithTooltip text={text} id={id} disabled={disabled}>
      <div className={`${className}`}>
        {children}
      </div>
    </WithTooltip>
  );
}
