import { Joker } from "@yasq/shared";

const ObfuscationIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={className}>
    <path d="M2 19L7 5L12 19M5 14H9" />
    <line x1="16" y1="19" x2="22" y2="19" />
  </svg>
);
ObfuscationIcon.jokerType = Joker.OBFUSCATION;

const TriviaIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={className}>
    <circle cx="11" cy="11" r="7" />
    <line x1="22" y1="22" x2="16.65" y2="16.65" />
  </svg>
);
TriviaIcon.jokerType = Joker.TRIVIA;

const MultipleChoiceIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
MultipleChoiceIcon.jokerType = Joker.MULTIPLE_CHOICE;

export const ALL_JOKER_ICONS = [ObfuscationIcon, TriviaIcon, MultipleChoiceIcon];

export function getJokerDisplayName(type: Joker): string {
  return type.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}