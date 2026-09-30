import type { SVGProps } from "react";

/**
 * آیکون‌های خطی سند طراحی، به‌صورت inline SVG (بدون کتابخانه‌ی خارجی تا
 * قاعده‌ی ۹ سند و منع وابستگی اضافه رعایت شود). ضخامت خط ۱.۵–۱.۷.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </Icon>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4h2l2.6 10.6h9.8L20 7.4H6" />
      <circle cx="9.5" cy="19.5" r="1.5" />
      <circle cx="17" cy="19.5" r="1.5" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 20c1.6-3.8 11.4-3.8 13 0" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 3v6c0 4-3.4 7.2-7 9-3.6-1.8-7-5-7-9V6z" />
      <path d="M9 12l2.3 2.3L15.6 10" />
    </Icon>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="7" width="11.5" height="9" rx="1.6" />
      <path d="M14 10h4l3 3.4V16h-7z" />
      <circle cx="7" cy="18" r="1.4" />
      <circle cx="17.5" cy="18" r="1.4" />
    </Icon>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="8.5" width="17" height="11.5" rx="2" />
      <line x1="12" y1="8.5" x2="12" y2="20" />
      <path d="M12 8.5C10.2 5 5.5 5.6 7.2 8.5M12 8.5c1.8-3.5 6.5-2.9 4.8 0" />
    </Icon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4h4l1.5 4L8 9.5c.8 3 3.5 5.7 6.5 6.5L16 13.5l4 1.5v4c-8 .5-15.5-7-15-15z" />
    </Icon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </Icon>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21c4.5-5 7-8.2 7-11a7 7 0 1 0-14 0c0 2.8 2.5 6 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7" />
      <path d="M10.2 11v5.5M13.8 11v5.5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={3} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <line x1="6" y1="12" x2="18" y2="12" />
    </Icon>
  );
}

/** پیکان «بعدی» در RTL به چپ اشاره می‌کند */
export function ArrowIcon(props: IconProps) {
  return (
    <svg
      width={props.size ?? 26}
      height={10}
      viewBox="0 0 26 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      <line x1="25" y1="5" x2="4" y2="5" />
      <path d="M8 1L4 5l4 4" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <path d="M14 6l-6 6 6 6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <path d="M10 6l6 6-6 6" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Icon>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="17" cy="6" r="2.6" />
      <circle cx="7" cy="12" r="2.6" />
      <circle cx="17" cy="18" r="2.6" />
      <path d="M9.4 10.8l5.3-3.1M9.4 13.2l5.3 3.1" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11l8-6.5 8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" />
    </Icon>
  );
}

export function BagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="7" width="16" height="13" rx="2.4" />
      <path d="M8.5 7a3.5 3.5 0 1 1 7 0" />
    </Icon>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.8" cy="7.2" r="0.9" fill="currentColor" />
    </Icon>
  );
}

export function TelegramIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 5L3.5 11.5l4.8 1.6L19 7l-8.4 8 .4 4.4 2.6-3.2 4.2 3z" />
    </Icon>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20l1.3-3.6A7.6 7.6 0 1 1 8 19.3z" />
      <path d="M9.2 9.3c.4 2.2 2.4 4.2 4.6 4.6l1-1.3 1.9.9v1.6c-3.8.3-7.4-3.3-7.1-7.1h1.6l.9 1.9z" />
    </Icon>
  );
}

export const TRUST_ICONS = {
  shield: ShieldIcon,
  truck: TruckIcon,
  gift: GiftIcon,
} as const;

export const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  telegram: TelegramIcon,
  whatsapp: WhatsappIcon,
} as const;

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.9 0 3.5-.6 4.9-1.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </Icon>
  );
}
