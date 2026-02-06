import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Functional Vibrancy Palette
        'deep-indigo': '#2A2F4F',
        'electric-teal': '#00D2D3',
        'living-coral': '#FF6B6B',
        'vapor': '#F4F6F8',
        'fade-grey': '#9CA3AF',
      },
      backgroundImage: {
        'gradient-violet-cyan': 'linear-gradient(135deg, #667EEA 0%, #00D2D3 100%)',
        'gradient-teal-violet': 'linear-gradient(135deg, #00D2D3 0%, #667EEA 100%)',
      },
      backdropBlur: {
        'glass': '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 210, 211, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 210, 211, 0.8), 0 0 30px rgba(0, 210, 211, 0.4)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config

