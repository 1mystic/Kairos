import type { ReactNode, SVGProps } from 'react';

function Icon({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}>
      {children}
    </svg>
  );
}
export const SunIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>;
export const MoonIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></Icon>;
export const AlertIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" /></Icon>;
export const UserIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>;
export const TargetIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 12h.01" /></Icon>;
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
export const CalendarIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Icon>;
export const SettingsIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></Icon>;
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const InfoIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>;
