export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Link-preview banner (Telegram, WhatsApp, Facebook, X…). */
export const OG_IMAGE = { url: "/og-image.jpg", width: 1200, height: 630, type: "image/jpeg", alt: "TELEFON.UZB premium" };
