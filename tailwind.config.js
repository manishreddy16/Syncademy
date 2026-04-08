/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 20px 40px rgba(15, 23, 42, 0.08)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
      },
    },
  },
  plugins: [],
};
