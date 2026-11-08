import type { SVGProps } from 'react';

function Ic({ children, size = 20, ...p }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {children}
    </svg>
  );
}
type P = SVGProps<SVGSVGElement> & { size?: number };
export const ArrowUpIcon = (p: P) => <Ic {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Ic>;
export const ArrowDownIcon = (p: P) => <Ic {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Ic>;
export const MinusIcon = (p: P) => <Ic {...p}><path d="M6 12h12" /></Ic>;
export const ChevronLeftIcon = (p: P) => <Ic {...p}><path d="M15 6l-6 6 6 6" /></Ic>;
export const ChevronRightIcon = (p: P) => <Ic {...p}><path d="M9 6l6 6-6 6" /></Ic>;
export const ChevronUpIcon = (p: P) => <Ic {...p}><path d="M6 15l6-6 6 6" /></Ic>;
export const ChevronDownIcon2 = (p: P) => <Ic {...p}><path d="M6 9l6 6 6-6" /></Ic>;
export const MoreIcon = (p: P) => <Ic {...p}><circle cx="5.5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18.5" cy="12" r="1.2" /></Ic>;
export const GripIcon = (p: P) => <Ic {...p}><circle cx="9" cy="6" r="1.1" /><circle cx="15" cy="6" r="1.1" /><circle cx="9" cy="12" r="1.1" /><circle cx="15" cy="12" r="1.1" /><circle cx="9" cy="18" r="1.1" /><circle cx="15" cy="18" r="1.1" /></Ic>;
export const SlidersIcon = (p: P) => <Ic {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></Ic>;
export const CalendarIcon2 = (p: P) => <Ic {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Ic>;
export const InfoIcon2 = (p: P) => <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Ic>;
export const CloseIcon2 = (p: P) => <Ic {...p}><path d="M6 6l12 12M18 6L6 18" /></Ic>;
export const FlameIcon = (p: P) => <Ic {...p}><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" /></Ic>;
export const BookIcon = (p: P) => <Ic {...p}><path d="M5 5a2 2 0 0 1 2-2h12v16H7a2 2 0 0 0-2 2zM5 19V5" /></Ic>;
export const TimerIcon = (p: P) => <Ic {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></Ic>;
export const TrophyIcon = (p: P) => <Ic {...p}><path d="M8 4h8v6a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 14v4M8 20h8" /></Ic>;
export const InboxIcon = (p: P) => <Ic {...p}><path d="M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5" /></Ic>;
export const TargetIcon2 = (p: P) => <Ic {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 12h.01" /></Ic>;
