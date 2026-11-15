"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Worker non disponible.");
      return;
    }

    let registration;

    async function registerPWA() {
      try {
        registration = await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
            updateViaCache: "none",
          }
        );

        console.log("Martha Fashion PWA activée.");

        // Vérifier les mises à jour
        await registration.update();

        // Détecter une nouvelle version
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("Nouvelle version disponible.");
            }
          });
        });

      } catch (error) {
        console.error(
          "Erreur Service Worker Martha Fashion :",
          error
        );
      }
    }

    registerPWA();

  }, []);

  return null;
}