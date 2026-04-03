/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        critical: '#FF3B30',
        severe: '#FF9500',
        moderate: '#FFCC00',
        stable: '#34C759',
        primary: '#007AFF',
        purple: '#5856D6',
        textPrimary: '#1D1D1F',
        textSecondary: '#86868B',
        bgBase: '#F5F5F7',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 2px 20px rgba(0,0,0,0.06)',
        cardHover: '0 8px 32px rgba(0,0,0,0.12)',
        glow: '0 0 24px rgba(0,122,255,0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #007AFF, #5856D6)',
        'gradient-critical': 'linear-gradient(135deg, #FF3B30, #FF6B6B)',
        'gradient-stable': 'linear-gradient(135deg, #34C759, #30D158)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        dash: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out forwards',
        slideIn: 'slideIn 0.3s ease-out forwards',
        scaleIn: 'scaleIn 0.3s ease-out forwards',
        dash: 'dash 1.5s ease-in-out forwards',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
