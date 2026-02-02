'use client';

import * as React from 'react';

/**
 * Mobile layout provides the container ref through this context.
 * This hook lives outside `app/mobile/layout.tsx` because App Router layout files
 * must not export arbitrary symbols (Next will typecheck those exports).
 */
export const MobileContainerContext = React.createContext<HTMLDivElement | null>(null);

export function useMobileContainer() {
  return React.useContext(MobileContainerContext);
}

