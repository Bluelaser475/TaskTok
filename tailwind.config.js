/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'logo': ['"League Spartan"', 'sans-serif'],
        'task-title': ['"Montserrat"', 'sans-serif'],
        'general-sans': ['"General Sans"', 'Nunito', 'sans-serif'],
        'supreme': ['"Supreme"', 'sans-serif'],
        'varela': ['"Varela"', 'Silka', 'sans-serif'],
      },
    },
  },
  plugins: [],
};