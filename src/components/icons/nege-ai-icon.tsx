'use client';

import * as React from 'react';

/**
 * Nege Systems AI brand icon.
 *
 * Централизованно хадгалах AI брэнд дүрс — улаан дугуй +2 цагаан sparkle.
 * Бүх хэсэгт (FAB, loading state, menu, badge) энэ нэг component-г ашиглах.
 *
 * @see docs/design-system/ai-icon.md
 */
export type NegeAiMood = 'idle' | 'thinking' | 'happy' | 'speaking';

export interface NegeAiIconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Рх/% — default 1em (inherit from font-size). */
  size?: number | string;
  /** Тойргийн өнгө — default брэнд улаан. */
  color?: string;
  /** Sparkle-ийн өнгө — default цагаан. */
  sparkleColor?: string;
  /**
   * Animation mood:
   *  - `idle`     — хөдөлгөөнгүй (default)
   *  - `thinking` — sparkle-ууд эргэлдэнэ
   *  - `happy`    — bounce
   *  - `speaking` — pulse
   */
  mood?: NegeAiMood;
}

export function NegeAiIcon({
  size = '1em',
  color = '#FF1925',
  sparkleColor = '#ffffff',
  mood = 'idle',
  style,
  ...rest
}: NegeAiIconProps) {
  const [bounce, setBounce] = React.useState(false);

  React.useEffect(() => {
    if (mood === 'happy') {
      const t = setInterval(() => setBounce(v => !v), 350);
      return () => clearInterval(t);
    }
    setBounce(false);
  }, [mood]);

  const ty = bounce ? -2.5 : 0;
  const spin = mood === 'thinking';
  const pulse = mood === 'speaking';

  const animation = spin
    ? 'nege-ai-spin 4s linear infinite'
    : pulse
    ? 'nege-ai-pulse 1.1s ease-in-out infinite'
    : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 434 434"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `translateY(${ty}px)`,
        transition: 'transform 0.25s ease',
        overflow: 'visible',
        transformOrigin: '50% 50%',
        animation,
        ...style,
      }}
      {...rest}
    >
      <g transform="translate(-3361.880026,-455.195779)">
        <g transform="translate(-0.535433,0)">
          <g transform="matrix(2.297162,0,0,2.297162,-3186.76385,-1654.189398)">
            <circle cx="2945.409" cy="1012.679" r="94.422" fill={color} />
          </g>
        </g>
        <g transform="translate(-0.535433,0)">
          <g transform="matrix(0,1.837734,-1.837734,0,5738.980466,-703.003029)">
            <path
              d="M748.259,1103.3L777.003,1146.432L820.136,1175.177L777.003,1203.921L748.259,1247.054L719.514,1203.921L676.382,1175.177L719.514,1146.432L748.259,1103.3Z"
              fill={sparkleColor}
            />
          </g>
          <g transform="matrix(0,0.408239,-0.408239,0,4161.819578,263.880913)">
            <path
              d="M748.259,1103.3L777.003,1146.432L820.136,1175.177L777.003,1203.921L748.259,1247.054L719.514,1203.921L676.382,1175.177L719.514,1146.432L748.259,1103.3Z"
              fill={sparkleColor}
            />
          </g>
        </g>
      </g>

      <style>{`
        @keyframes nege-ai-spin { from { transform: translateY(${ty}px) rotate(0deg); } to { transform: translateY(${ty}px) rotate(360deg); } }
        @keyframes nege-ai-pulse { 0%, 100% { transform: translateY(${ty}px) scale(1); } 50% { transform: translateY(${ty}px) scale(1.1); } }
      `}</style>
    </svg>
  );
}
