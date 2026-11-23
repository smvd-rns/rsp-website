"use client";

import { useEffect } from "react";

export const PwaRegister = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Unregister all Service Workers immediately
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.info(
                "[PWA Cleanup] Unregistered Service Worker:",
                registration.scope,
              );
            }
          });
        }
      });
    }

    // 2. Clear all browser CacheStorage caches
    if ("caches" in window) {
      window.caches.keys().then((keys) => {
        for (const key of keys) {
          window.caches.delete(key).then((success) => {
            if (success) {
              console.info("[PWA Cleanup] Cleared CacheStorage:", key);
            }
          });
        }
      });
    }

    // 3. Delete stale local IndexedDB if present
    if ("indexedDB" in window) {
      try {
        const req = window.indexedDB.deleteDatabase("rsp-db");
        req.onsuccess = () => {
          console.info("[PWA Cleanup] Purged local IndexedDB 'rsp-db'");
        };
        req.onerror = () => {
          // ignore if already in use or absent
        };
      } catch {
        // ignore
      }
    }
  }, []);

  return null;
};
