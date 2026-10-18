/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ludo: {
          red:    "#E63946",
          green:  "#2DC653",
          yellow: "#FFBE0B",
          blue:   "#4361EE",
          board:  "#F8F4E8",
          dark:   "#1A1A2E",
        },
      },
      fontFamily: {
        display: ["Fredoka One", "sans-serif"],
        body:    ["Nunito", "sans-serif"],
      },
      animation: {
        "dice-roll": "diceRoll 0.4s cubic-bezier(0.36,0.07,0.19,0.97) both",
        "token-bounce": "tokenBounce 0.3s ease-out",
        "pulse-slow": "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        diceRoll: {
          "0%,100%": { transform: "scale(1) rotate(0deg)" },
          "25%": { transform: "scale(1.2) rotate(-15deg)" },
          "75%": { transform: "scale(1.2) rotate(15deg)" },
        },
        tokenBounce: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
