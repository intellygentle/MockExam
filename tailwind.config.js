/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        policeBlue: "#003366",
        policeGold: "#FFD700",
        policeGreen: "#28a745",
        policeRed: "#dc3545",
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "sans-serif"],
      },
    },
  },
  plugins: [],
}
