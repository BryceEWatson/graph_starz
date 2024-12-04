import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        primary: {
          DEFAULT: '#4299e1', // Blue
          hover: '#3182ce',
        },
        background: {
          DEFAULT: '#f9fafb',
          paper: '#ffffff',
        },
        text: {
          DEFAULT: '#1a202c',
          secondary: '#4a5568',
        },
        // Dark mode specific colors
        dark: {
          background: {
            DEFAULT: '#111827',
            paper: '#1f2937',
          },
          text: {
            DEFAULT: '#f9fafb',
            secondary: '#d1d5db',
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
