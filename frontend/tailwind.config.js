/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f7fbf4",
        field: "#ffffff",
        line: "#cfe5c8",
        brand: "#1b8a5a",
        action: "#146c46",
        fresh: "#71c943",
        milk: "#eef9e9"
      }
    }
  },
  plugins: []
};
