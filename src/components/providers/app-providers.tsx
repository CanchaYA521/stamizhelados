"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";

export function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => {
          // Ignore dev cleanup issues.
        });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA registration is optional.
    });
  }, []);

  return (
    <>
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "18px",
          },
        }}
      />
    </>
  );
}
