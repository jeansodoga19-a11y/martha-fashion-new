// lib/offline-db.js

const STORAGE_KEY = "martha-offline-products";

export async function saveOfflineProducts(products) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products || []));
  } catch (err) {
    console.error("Erreur sauvegarde offline :", err);
  }
}

export async function getOfflineProducts() {
  try {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (err) {
    console.error("Erreur lecture offline :", err);
    return [];
  }
}