/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tertiary-fixed": "#6bff8f",
        "surface-bright": "#31394d",
        "on-surface-variant": "#c2c6d6",
        "outline-variant": "#424754",
        "surface-container-high": "#222a3d",
        "on-surface": "#dae2fd",
        "on-error": "#690005",
        "error": "#ffb4ab",
        "surface-tint": "#adc6ff",
        "on-background": "#dae2fd",
        "on-tertiary-fixed-variant": "#005321",
        "on-tertiary": "#003915",
        "surface-container-lowest": "#060e20",
        "on-secondary-fixed-variant": "#930013",
        "on-tertiary-fixed": "#002109",
        "on-secondary-fixed": "#410004",
        "on-primary-fixed": "#001a42",
        "primary": "#adc6ff",
        "on-primary": "#002e6a",
        "on-secondary-container": "#ffaea8",
        "secondary-fixed-dim": "#ffb3ad",
        "on-tertiary-container": "#003111",
        "surface-container": "#171f33",
        "tertiary-container": "#00a74b",
        "secondary-container": "#a40217",
        "surface-container-low": "#131b2e",
        "on-primary-container": "#00285d",
        "inverse-on-surface": "#283044",
        "surface-container-highest": "#2d3449",
        "tertiary-fixed-dim": "#4ae176",
        "on-secondary": "#68000a",
        "primary-fixed-dim": "#adc6ff",
        "surface": "#0b1326",
        "outline": "#8c909f",
        "on-primary-fixed-variant": "#004395",
        "background": "#0b1326",
        "inverse-primary": "#005ac2",
        "surface-dim": "#0b1326",
        "primary-container": "#4d8eff",
        "surface-variant": "#2d3449",
        "error-container": "#93000a",
        "secondary-fixed": "#ffdad7",
        "tertiary": "#4ae176",
        "on-error-container": "#ffdad6",
        "inverse-surface": "#dae2fd",
        "primary-fixed": "#d8e2ff",
        "secondary": "#ffb3ad"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "item-gap": "4px",
        "thumbnail-grid-gap": "12px",
        "container-padding": "8px",
        "panel-gap": "1px"
      },
      fontFamily: {
        "display-live": ["Coolvetica", "Inter", "sans-serif"],
        "coolvetica": ["Coolvetica", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-caps": ["Inter", "sans-serif"],
        "mono-label": ["JetBrains Mono", "monospace"]
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        zoomOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-50px)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-out': 'fadeOut 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'zoom-in': 'zoomIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'zoom-out': 'zoomOut 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in': 'slideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-out': 'slideOut 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      }
    }
  },
  plugins: [],
}
