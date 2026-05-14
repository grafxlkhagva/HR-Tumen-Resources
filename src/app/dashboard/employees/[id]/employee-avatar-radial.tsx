'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ShieldCheck, ShieldAlert, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Employee } from '../data';
import { type RadialAction } from './constants';

export interface EmployeeAvatarRadialProps {
  employee: Employee;
  isUploadingPhoto: boolean;
  onPhotoClick: () => void;
  radialActions: RadialAction[];
  /** Профайл толгой — бага зай, контентоор өндөр */
  compact?: boolean;
}

/** Профайл картын доор — анкетын цагираг + радиал үйлдлүүд */
export const EmployeeAvatarRadial = ({
  employee,
  isUploadingPhoto,
  onPhotoClick,
  radialActions,
  compact = false,
}: EmployeeAvatarRadialProps) => {
  const [radialOpen, setRadialOpen] = React.useState(false);
  const radialOpenRef = React.useRef(false);

  const toggleRadial = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !radialOpenRef.current;
    radialOpenRef.current = next;
    setRadialOpen(next);
  }, []);

  React.useEffect(() => {
    if (!radialOpen) return;
    const handler = () => {
      radialOpenRef.current = false;
      setRadialOpen(false);
    };
    const tid = window.setTimeout(() => window.addEventListener('click', handler), 50);
    return () => {
      window.clearTimeout(tid);
      window.removeEventListener('click', handler);
    };
  }, [radialOpen]);

  const CONTAINER = compact ? 168 : 220;
  const AVATAR = compact ? 68 : 88;
  const radialOrbit = compact ? 40 : 48;
  const radialBtn = compact ? 30 : 36;
  const strokeWidth = 4;
  const pad = strokeWidth + 6;
  const svgTotal = AVATAR + pad * 2;
  const rRing = AVATAR / 2 + 2;
  const circ = 2 * Math.PI * rRing;
  const qPct = employee.questionnaireCompletion || 0;
  const dashOffset = circ - (qPct / 100) * circ;
  const ringColor = qPct < 50 ? '#ef4444' : qPct < 90 ? '#f59e0b' : '#10b981';

  const hasEmail = !!employee.email;
  const hasPhone = !!employee.phoneNumber;
  const isEmailOk = !hasEmail || !!(employee as any).emailVerified;
  const isPhoneOk = !hasPhone || !!(employee as any).phoneVerified;
  const hasContact = hasEmail || hasPhone;
  const isVerified = isEmailOk && isPhoneOk;

  return (
    <div className="relative mx-auto flex select-none items-center justify-center" style={{ width: CONTAINER, height: CONTAINER }}>
      <div className="absolute z-20 flex items-center justify-center" style={{ width: svgTotal, height: svgTotal }}>
        <svg className="pointer-events-none absolute inset-0" width={svgTotal} height={svgTotal}>
          <circle stroke="rgba(0,0,0,0.07)" strokeWidth={strokeWidth} fill="transparent" r={rRing} cx={svgTotal / 2} cy={svgTotal / 2} />
          <circle
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="transparent"
            r={rRing}
            cx={svgTotal / 2}
            cy={svgTotal / 2}
            transform={`rotate(-90 ${svgTotal / 2} ${svgTotal / 2})`}
            style={{ transitionProperty: 'stroke-dashoffset', transitionDuration: '0.8s', transitionTimingFunction: 'ease-out' }}
          />
        </svg>
        <button
          type="button"
          onClick={toggleRadial}
          className="absolute rounded-full transition-all focus:outline-none active:scale-95"
          style={{
            top: pad,
            left: pad,
            width: AVATAR,
            height: AVATAR,
            boxShadow: radialOpen
              ? '0 0 0 4px rgba(99,102,241,0.35), 0 0 0 8px rgba(99,102,241,0.1), 0 8px 32px rgba(0,0,0,0.18)'
              : '0 4px 16px rgba(0,0,0,0.12)',
            transitionProperty: 'box-shadow',
            transitionDuration: '250ms',
            transitionTimingFunction: 'ease',
          }}
          disabled={isUploadingPhoto}
        >
          <Avatar className="h-full w-full border-4 border-white">
            <AvatarImage src={employee.photoURL} alt={employee.firstName} className="object-cover" />
            <AvatarFallback className={cn('bg-gradient-to-br from-muted to-muted/80 font-bold text-muted-foreground', compact ? 'text-lg' : 'text-2xl')}>
              {employee.firstName?.charAt(0)}
              {employee.lastName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {isUploadingPhoto && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </button>
        {hasContact && (
          <div
            className={cn(
              'absolute z-10 flex items-center justify-center rounded-full border-[3px] border-white shadow-lg',
              compact ? 'h-6 w-6' : 'h-8 w-8',
              isVerified ? 'bg-emerald-500' : 'animate-pulse bg-rose-500'
            )}
            style={{ bottom: pad - 2, right: pad - 2 }}
            title={isVerified ? 'Бүгд баталгаажсан' : 'Баталгаажаагүй'}
          >
            {isVerified ? (
              <ShieldCheck className={cn('text-white', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
            ) : (
              <ShieldAlert className={cn('text-white', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
            )}
          </div>
        )}
      </div>

      {(
        [
          { key: 'photo', Icon: Camera, label: 'Зураг солих', onClick: onPhotoClick } satisfies RadialAction,
          ...radialActions,
        ] as RadialAction[]
      ).map(({ key, Icon, label, onClick, href }, i, arr) => {
        const n = arr.length;
        /** Тойрог дээр тэнцүү зай: дээдээс (90deg) цагийн зүүний чиглэлээр */
        const angleDeg = 90 - (i * 360) / n;
        const rad = (angleDeg * Math.PI) / 180;
        const cx = CONTAINER / 2;
        const cy = CONTAINER / 2;
        const R = AVATAR / 2 + radialOrbit;
        const x = cx + Math.cos(rad) * R;
        const y = cy - Math.sin(rad) * R;
        const BTN = radialBtn;
        const isOpen = radialOpenRef.current || radialOpen;
        return (
          <TooltipProvider key={key} delayDuration={80}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={label}
                  onClick={(e) => {
                    e.stopPropagation();
                    radialOpenRef.current = false;
                    setRadialOpen(false);
                    if (href) window.location.assign(href);
                    else onClick?.();
                  }}
                  className="absolute z-30 flex items-center justify-center rounded-full"
                  style={{
                    width: BTN,
                    height: BTN,
                    top: y - BTN / 2,
                    left: x - BTN / 2,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transform: isOpen ? 'scale(1)' : 'scale(0.3)',
                    transitionProperty: 'opacity, transform, box-shadow',
                    transitionDuration: '200ms',
                    transitionTimingFunction: 'ease',
                    transitionDelay: isOpen ? `${i * 40}ms` : '0ms',
                    background: 'linear-gradient(135deg,#ffffff 0%,#f1f5f9 100%)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.08)',
                    border: '1.5px solid rgba(255,255,255,0.7)',
                  }}
                >
                  <Icon className={cn('text-muted-foreground', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-[110]">
                <span className="text-xs font-semibold">{label}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};
