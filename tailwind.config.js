/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0b5aa8',
          hover: '#094a8b',
          light: '#f2f8ff',
          card: '#f8fbff',
          notice: '#e5f0fd',
          alt: '#f3f7fb',
          accent: '#0076ff',
          muted: '#5f7288',
        },
        border: {
          light: '#b8d8ff',
          medium: '#5ea8ff',
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
      }
    },
  },
  plugins: [],
}
