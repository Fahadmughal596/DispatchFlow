import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number };

function IconBase({ size = 24, strokeWidth = 2, children, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function ArrowRight(props: IconProps) { return <IconBase {...props}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></IconBase>; }
export function CirclePlay(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/></IconBase>; }
export function FileText(props: IconProps) { return <IconBase {...props}><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></IconBase>; }
export function Headphones(props: IconProps) { return <IconBase {...props}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z"/></IconBase>; }
export function MessageCircle(props: IconProps) { return <IconBase {...props}><path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.3-4A8 8 0 1 1 21 12Z"/></IconBase>; }
export function ReceiptText(props: IconProps) { return <IconBase {...props}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h4"/></IconBase>; }
export function ShieldCheck(props: IconProps) { return <IconBase {...props}><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></IconBase>; }
export function Truck(props: IconProps) { return <IconBase {...props}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></IconBase>; }
export function Zap(props: IconProps) { return <IconBase {...props}><path d="m13 2-9 12h7l-1 8 9-12h-7z"/></IconBase>; }
