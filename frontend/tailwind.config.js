module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        'primary-dark': '#4A3FBF',
        secondary: '#9d4edd',
        background: '#121212',
        'techno-light': '#ffffff',
        'text-dark': '#212121',
        success: '#4CAF50',
        error: '#E53935',
        'neutral-light': '#e0e0e0',
        'neutral-dark': '#bdbdbd',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
      },
      boxShadow: {
        'soft': '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
}
