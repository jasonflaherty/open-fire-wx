'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    void navigator.serviceWorker
      .register(`${base}/sw.js`)
      .then((registration) => {
        // Pick up hourly data-cache policy updates promptly
        void registration.update();
      })
      .catch(() => {
        /* ignore SW errors in local/dev */
      });
  }, []);
  return null;
}
