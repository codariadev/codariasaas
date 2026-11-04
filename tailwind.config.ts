import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { bg: "var(--bg)", card: "var(--card)", tx: "var(--tx)", mu: "var(--mu)", bd: "var(--bd)", side: "var(--side)", ac: "var(--ac)", soft: "var(--soft)", ok: "#1f9d63", bad: "#d64550", warn: "#d99a1c" } } },
} satisfies Config;
