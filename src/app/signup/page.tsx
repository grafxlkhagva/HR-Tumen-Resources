'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function DeprecatedSignupPage() {
  useEffect(() => {
    redirect('/login');
  }, []);

  return null;
}
