import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08111f",
        panel: "#0f1a2b",
        ink: "#f7f7f5",
        profit: "#3dd598",
        loss: "#ff6b6b",
        accent: "#70e1f5",
      },
      boxShadow: {
        glow: "0 20px 60px rgba(112, 225, 245, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
