'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 минут
const THROTTLE_MS = 60_000; // mousemove/scroll: 1 мин тутамд нэг удаа reset

export function useInactivityLogout() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastThrottledRef = useRef<number>(0);

    const logout = useCallback(() => {
        if (!auth) return;
        timeoutRef.current = null;
        signOut(auth);
        router.replace('/login');
        toast({
            title: 'Сессьон дууссан',
            description: '30 минут идэвхгүй байсан тул таныг системээс гаргалаа. Дахин нэвтрэнэ үү.',
            variant: 'destructive',
        });
    }, [auth, router, toast]);

    const resetTimer = useCallback(() => {
        if (!user || !auth) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(logout, IDLE_TIMEOUT_MS);
    }, [user, auth, logout]);

    const handleActivity = useCallback(() => {
        if (!user) return;
        resetTimer();
    }, [user, resetTimer]);

    const handleThrottledActivity = useCallback(() => {
        if (!user) return;
        const now = Date.now();
        if (now - lastThrottledRef.current < THROTTLE_MS) return;
        lastThrottledRef.current = now;
        resetTimer();
    }, [user, resetTimer]);

    useEffect(() => {
        const clearTimer = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };

        if (isUserLoading || !user || !auth) {
            clearTimer();
            return;
        }

        const publicPaths = ['/login', '/signup'];
        if (publicPaths.some((p) => pathname?.startsWith(p))) {
            clearTimer();
            return;
        }

        resetTimer();

        const events: [string, () => void][] = [
            ['mousedown', handleActivity],
            ['keydown', handleActivity],
            ['touchstart', handleActivity],
            ['click', handleActivity],
            ['scroll', handleThrottledActivity],
            ['mousemove', handleThrottledActivity],
        ];

        events.forEach(([ev, fn]) => {
            window.addEventListener(ev, fn);
        });

        return () => {
            events.forEach(([ev, fn]) => {
                window.removeEventListener(ev, fn);
            });
            clearTimer();
        };
    }, [isUserLoading, user, auth, pathname, resetTimer, handleActivity, handleThrottledActivity]);
}
