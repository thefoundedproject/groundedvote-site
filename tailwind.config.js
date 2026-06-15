/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        night: '#0F1B1F',
        gold: '#D8AB69',
        teal: '#5ECFA6',
        wheat: '#F5F0E8',
      },
    },
  },
  plugins: [],
}
