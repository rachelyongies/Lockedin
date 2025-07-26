import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'text-gradient',
    'glass-card', 
    'card-base',
    'card-hover',
    'btn-primary',
    'btn-secondary',
    'loading-spinner',
    'bg-card-background',
    'bg-card-background-hover',
    'border-border-color',
    'border-border-color-hover',
    'text-text-primary',
    'text-text-secondary',
    'bg-glass-bg',
    'border-glass-border'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Colors - Cyan/Sky/Blue palette
        primary: {
          50: '#ecfeff',   // cyan-50
          100: '#cffafe',  // cyan-100
          200: '#a5f3fc',  // cyan-200
          300: '#67e8f9',  // cyan-300
          400: '#22d3ee',  // cyan-400
          500: '#06b6d4',  // cyan-500
          600: '#0891b2',  // cyan-600
          700: '#0e7490',  // cyan-700
          800: '#155e75',  // cyan-800
          900: '#1e3a8a',  // blue-900
        },
        // Sky colors for accents
        sky: {
          300: '#7dd3fc',  // sky-300
          400: '#38bdf8',  // sky-400
          500: '#0ea5e9',  // sky-500
          600: '#0284c7',  // sky-600
        },
        // Status Colors
        success: '#48bb78',
        'success-light': '#68d391',
        'success-dark': '#38a169',
        error: '#f56565',
        'error-light': '#fc8181',
        'error-dark': '#e53e3e',
        warning: '#ed8936',
        'warning-light': '#f6ad55',
        'warning-dark': '#dd6b20',
        info: '#4299e1',
        'info-light': '#63b3ed',
        'info-dark': '#3182ce',
        // Background Colors
        'background-dark': '#0a0b0d',
        'background-secondary': '#111318',
        'background-tertiary': '#1a1d24',
        // Text Colors
        'text-primary': '#ffffff',
        'text-secondary': '#a0aec0',
        'text-tertiary': '#718096',
        'text-quaternary': '#4a5568',
        'text-disabled': '#2d3748',
        // Border Colors  
        'border-color': 'rgba(255, 255, 255, 0.1)',
        'border-color-hover': 'rgba(255, 255, 255, 0.2)',
        // Card backgrounds
        'card-background': 'rgba(16, 18, 22, 0.8)',
        'card-background-hover': 'rgba(22, 25, 31, 0.9)',
        // Glass morphism
        'glass-bg': 'rgba(255, 255, 255, 0.05)',
        'glass-border': 'rgba(255, 255, 255, 0.1)',
        'glass-hover-bg': 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        'primary': ['var(--font-primary)', 'Inter', 'sans-serif'],
        'display': ['var(--font-display)', 'Space Grotesk', 'sans-serif'],
        'mono': ['var(--font-mono)', 'SF Mono', 'Monaco', 'monospace'],
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #06b6d4 0%, #1e3a8a 100%)',  // cyan-500 to blue-900
        'primary-gradient-hover': 'linear-gradient(135deg, #0891b2 0%, #1e40af 100%)', // cyan-600 to blue-800
        'primary-gradient-active': 'linear-gradient(135deg, #0e7490 0%, #1d4ed8 100%)', // cyan-700 to blue-700
        'wallet-connect-gradient': 'linear-gradient(90deg, #0e7490 0%, #0891b2 20%, #67e8f9 50%, #0891b2 80%, #0e7490 100%)', // smoother gradient transition
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-in-top': 'slideInFromTop 0.25s ease-out forwards',
        'slide-in-bottom': 'slideInFromBottom 0.25s ease-out forwards',
        'spring-in': 'springIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'shimmer': 'shimmer 1.5s infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'gradient-flow': 'gradientFlow 10s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glow-primary': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-success': '0 0 20px rgba(104, 211, 145, 0.4)',
        'glow-error': '0 0 20px rgba(252, 129, 129, 0.4)',
        'glow-warning': '0 0 20px rgba(246, 173, 85, 0.4)',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideInFromTop: {
          'from': { transform: 'translateY(-100%)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInFromBottom: {
          'from': { transform: 'translateY(100%)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        springIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.02)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleIn: {
          'from': { transform: 'scale(0.8)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
          '70%': { transform: 'scale(0.9)', opacity: '0.9' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        gradientFlow: {
          '0%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '-100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 7%': { transform: 'rotateZ(0)' },
          '15%': { transform: 'rotateZ(-15deg)' },
          '20%': { transform: 'rotateZ(10deg)' },
          '25%': { transform: 'rotateZ(-10deg)' },
          '30%': { transform: 'rotateZ(6deg)' },
          '35%': { transform: 'rotateZ(-4deg)' },
          '40%, 100%': { transform: 'rotateZ(0)' },
        },
      },
    },
  },
  plugins: [
    // Custom plugin to add our utility classes
    function({ addUtilities, addBase, theme }: any) {
      // Add CSS custom properties to base
      addBase({
        ':root': {
          '--background-dark': '#0a0b0d',
          '--background-secondary': '#111318',
          '--card-background': 'rgba(16, 18, 22, 0.8)',
          '--card-background-hover': 'rgba(22, 25, 31, 0.9)',
          '--border-color': 'rgba(255, 255, 255, 0.1)',
          '--border-color-hover': 'rgba(255, 255, 255, 0.2)',
          '--text-primary': '#ffffff',
          '--text-secondary': '#a0aec0',
          '--primary-gradient': 'linear-gradient(135deg, #06b6d4 0%, #1e3a8a 100%)',
          '--success': '#48bb78',
          '--error': '#f56565',
          '--warning': '#ed8936',
          '--glass-bg': 'rgba(255, 255, 255, 0.05)',
          '--glass-border': 'rgba(255, 255, 255, 0.1)',
          '--glass-backdrop': 'blur(8px)',
          '--glass-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          '--glass-hover-bg': 'rgba(255, 255, 255, 0.08)',
          // Spacing tokens
          '--space-1': '0.25rem',
          '--space-2': '0.5rem',
          '--space-3': '0.75rem',
          '--space-4': '1rem',
          '--space-6': '1.5rem',
          '--space-8': '2rem',
          // Radius tokens
          '--radius-sm': '0.125rem',
          '--radius-md': '0.375rem',
          '--radius-lg': '0.5rem',
          '--radius-xl': '0.75rem',
          '--radius-2xl': '1rem',
          // Shadow tokens
          '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        'html.dark': {
          '--card-background': 'rgba(16, 18, 22, 0.9)',
          '--card-background-hover': 'rgba(22, 25, 31, 0.95)',
          '--border-color': 'rgba(255, 255, 255, 0.08)',
          '--border-color-hover': 'rgba(255, 255, 255, 0.15)',
        }
      });
      
      const newUtilities = {
        // Text gradient utility
        '.text-gradient': {
          background: 'var(--primary-gradient)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        // Glass morphism utilities
        '.glass-card': {
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-backdrop)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
        },
        // Card utilities
        '.card-base': {
          background: 'var(--card-background)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          transition: 'all 0.25s cubic-bezier(0, 0, 0.2, 1)',
        },
        '.card-hover': {
          background: 'var(--card-background)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          transition: 'all 0.25s cubic-bezier(0, 0, 0.2, 1)',
          '&:hover': {
            background: 'var(--card-background-hover)',
            borderColor: 'var(--border-color-hover)',
            transform: 'translateY(-2px)',
            boxShadow: 'var(--shadow-lg)',
          },
        },
        // Button utilities
        '.btn-primary': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '500',
          textAlign: 'center',
          borderRadius: '0.5rem',
          padding: '0.75rem 1.5rem',
          transition: 'all 0.25s cubic-bezier(0, 0, 0.2, 1)',
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--primary-gradient)',
          color: 'white',
          border: 'none',
          '&:hover': {
            background: 'var(--primary-gradient-hover)',
            transform: 'translateY(-1px)',
            boxShadow: 'var(--shadow-lg)',
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
            transform: 'none',
          },
        },
        '.btn-secondary': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '500',
          textAlign: 'center',
          borderRadius: '0.5rem',
          padding: '0.75rem 1.5rem',
          transition: 'all 0.25s cubic-bezier(0, 0, 0.2, 1)',
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          overflow: 'hidden',
          background: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          '&:hover': {
            background: 'var(--card-background-hover)',
            borderColor: 'var(--border-color-hover)',
          },
        },
        // Loading spinner
        '.loading-spinner': {
          width: '1rem',
          height: '1rem',
          border: '2px solid var(--border-color)',
          borderTop: '2px solid var(--primary-500)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}
export default config