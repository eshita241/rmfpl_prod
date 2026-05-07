/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#451817",
        paper: "#F2E1D3",
        field: "#F2E1D3",
        line: "#E7AB6E",
        brand: "#E7AB6E",
        action: "#451817",
        fresh: "#E7AB6E",
        milk: "#F2E1D3"
      }
    }
  },
  plugins: []
};
