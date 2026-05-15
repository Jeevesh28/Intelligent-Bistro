/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FDFBF6",
          100: "#FAF7F0",
          200: "#F2EBDD",
          300: "#E6DBC2",
        },
        forest: {
          400: "#5C7E5A",
          500: "#3F5F3C",
          600: "#2E4A2C",
          700: "#22381F",
          900: "#0E1A0D",
        },
        terracotta: {
          400: "#D88A6A",
          500: "#C46E4D",
          600: "#A85636",
        },
        ink: {
          900: "#1B1F1A",
          700: "#3A3F37",
          500: "#6B6F66",
          400: "#9CA095",
        },
      },
      fontFamily: {
        serif: ["Fraunces_600SemiBold"],
        "serif-light": ["Fraunces_400Regular"],
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
      },
    },
  },
  plugins: [],
};
