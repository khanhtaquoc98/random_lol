import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hextech: {
          gold: "#C8AA6E",
          goldLight: "#F0E6D2",
          goldDark: "#785A28",
          blue: "#0AC8B9",
          blueDark: "#005A82",
          dark: "#010A13",
          panel: "#091428",
          border: "#1E2328",
        },
      },
    },
  },
  plugins: [],
};
export default config;
