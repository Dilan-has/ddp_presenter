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
        "tertiary-fixed": "#74f0b9",
        "surface-bright": "#2e3547",
        "on-surface-variant": "#a3abbd",
        "outline-variant": "#333a4d",
        "surface-container-high": "#1a1e28",
        "on-surface": "#eceff6",
        "on-error": "#5c0008",
        "error": "#ff8a8a",
        "surface-tint": "#6ea8ff",
        "on-background": "#eceff6",
        "on-tertiary-fixed-variant": "#005140",
        "on-tertiary": "#00382a",
        "surface-container-lowest": "#090b0f",
        "on-secondary-fixed-variant": "#930013",
        "on-tertiary-fixed": "#002117",
        "on-secondary-fixed": "#410004",
        "on-primary-fixed": "#02143a",
        "primary": "#6ea8ff",
        "on-primary": "#04204a",
        "on-secondary-container": "#ffaea8",
        "secondary-fixed-dim": "#ffb3ad",
        "on-tertiary-container": "#00261a",
        "surface-container": "#13161d",
        "tertiary-container": "#1fae74",
        "secondary-container": "#a40217",
        "surface-container-low": "#10131a",
        "on-primary-container": "#ffffff",
        "inverse-on-surface": "#1a1e28",
        "surface-container-highest": "#242a38",
        "tertiary-fixed-dim": "#3ddc97",
        "on-secondary": "#68000a",
        "primary-fixed-dim": "#6ea8ff",
        "surface": "#0d0f14",
        "outline": "#8089a0",
        "on-primary-fixed-variant": "#1d4fb0",
        "background": "#0d0f14",
        "inverse-primary": "#2563d6",
        "surface-dim": "#0d0f14",
        "primary-container": "#2f6fe0",
        "surface-variant": "#242a38",
        "error-container": "#dc2626",
        "secondary-fixed": "#ffdad7",
        "tertiary": "#3ddc97",
        "on-error-container": "#ffffff",
        "inverse-surface": "#eceff6",
        "primary-fixed": "#d6e4ff",
        "secondary": "#ffb3ad",
        "accent": "#ff7a59",
        "accent-container": "#d03e22",
        "warning": "#ffc857",
        "on-warning": "#3a2a00"
      },
      borderRadius: {
        "sm": "0.125rem",
        "DEFAULT": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      boxShadow: {
        "panel": "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 1px 2px rgba(0,0,0,0.35)",
        "pop": "0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(51,58,77,0.7)",
        "focus-ring": "0 0 0 2px #0d0f14, 0 0 0 4px #6ea8ff",
        "live-glow": "0 0 0 2px #3ddc97, 0 0 16px rgba(61,220,151,0.35)"
      },
      fontSize: {
        "display-live": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-sm": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-caps": ["11px", { lineHeight: "14px", letterSpacing: "0.05em", fontWeight: "700" }],
        "mono-label": ["12px", { lineHeight: "16px", fontWeight: "500" }]
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
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-out': 'fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'zoom-in': 'zoomIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'zoom-out': 'zoomOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-out': 'slideOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      }
    }
  },
  plugins: [],
}
