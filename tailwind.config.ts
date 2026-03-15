import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        poly: {
          teal: {
            dark: "var(--color-secondary, #1B6378)",
            light: "var(--color-primary, #71C6AC)",
          },
          tan: "#FFE19F",
          indigo: "#18227C",
        },
      },
    },
  },
  plugins: [],
};
export default config;
