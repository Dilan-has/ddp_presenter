---
name: Transmisión Pro
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#ffb3ad'
  on-secondary: '#68000a'
  secondary-container: '#a40217'
  on-secondary-container: '#ffaea8'
  tertiary: '#4ae176'
  on-tertiary: '#003915'
  tertiary-container: '#00a74b'
  on-tertiary-container: '#003111'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ad'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#930013'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-live:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  panel-gap: 1px
  container-padding: 8px
  item-gap: 4px
  thumbnail-grid-gap: 12px
---

## Brand & Style
The design system focuses on a **Professional / Modern** aesthetic with high-density utility. It is designed for live environments where focus, speed, and reliability are paramount. The interface minimizes visual noise to ensure that the operator's attention remains on the content and the live output.

The style utilizes a "Command Center" philosophy:
- **High Information Density:** Maximum utilization of screen real estate for complex workflows.
- **Visual Hierarchy through Tones:** Layers of dark slate and charcoal to differentiate functional zones without using distracting borders.
- **Active State Priority:** Vibrant accent colors are used sparingly but intensely to denote "Live" or "Active" status, ensuring no ambiguity during a presentation.

## Colors
The palette is optimized for low-light environments (booths, backstage, auditoriums).

- **Background (Deep):** Slate-900 is used for the application shell and "Canvas" areas where slides are staged.
- **Surface (Panels):** Slate-800 provides the base for sidebars, media bins, and inspectors.
- **Accents:** 
    - **Blue (Action):** Selection states, focus rings, and primary buttons.
    - **Red (Clear/Warning):** "Clear All" functions and emergency stop buttons.
    - **Green (Live):** Indicates the current active slide or output stream.
- **Borders:** Slate-700 creates subtle definition between resizable panels without adding visual bulk.

## Typography
This design system utilizes **Inter** for its exceptional legibility at small sizes and high-density tracking. 

- **Scale:** The scale is intentionally tight, favoring `12px` and `14px` for most UI elements to allow for maximum data visibility.
- **Labels:** Uppercase labels with slight tracking are used for panel headers (e.g., "BIBLIOTECA", "PROPIEDADES") to distinguish navigation from content.
- **Numerics:** For timers and clocks, a monospaced variant is preferred to prevent layout shift during live countdowns.
- **Language:** All system labels are in Spanish, ensuring terms like "En Vivo", "Siguiente", and "Limpiar" fit within the compact constraints.

## Layout & Spacing
The layout follows a **Fixed-Panel Grid** model, typical of professional production software.

- **Panel System:** The UI is divided into regions (Library, Playlist, Slide Area, Media Bin, Inspector). Panels are separated by 1px borders (Slate-700) to maximize space.
- **Density:** We use an 4px base unit. Most internal padding is `8px` (2 units), while element gaps are `4px` (1 unit).
- **Responsive Behavior:** This is a desktop-first application. On smaller screens, panels collapse into tabs or side-drawers rather than stacking vertically, preserving the relationship between the "Live Monitor" and the "Slide Grid."

## Elevation & Depth
Elevation is achieved through **Tonal Layering** rather than shadows to avoid "muddiness" in a dark interface.

- **Level 0 (Slate-950):** Application backdrop and gutter space.
- **Level 1 (Slate-900):** Main workspace and content areas.
- **Level 2 (Slate-800):** Functional panels and sidebars.
- **Level 3 (Slate-700):** Popovers, context menus, and tooltips.
- **Interactions:** Subtle inner glows (0.5px white at 10% opacity) are used on active thumbnails to simulate a "lit" button effect.

## Shapes
A **Soft** (0.25rem) radius is applied to standard UI elements like buttons and input fields to keep the interface approachable but professional.

- **Slide Thumbnails:** Use a slightly larger radius (`rounded-lg`) to distinguish content from the UI framework.
- **Active Indicators:** "Live" status indicators on slides use a pill-shape to act as a clear, high-visibility signal.

## Components
- **Slide Grid:** Thumbnails should maintain a 16:9 aspect ratio. The active slide must have a 2px solid Green-500 border and a "VIVO" badge in the top right.
- **Tree-Views (Library/Playlists):** Rows are 28px high with chevron icons for nesting. Selection state uses Blue-500 background at 20% opacity with a solid 2px left-accent.
- **Buttons:** 
    - *Primary:* Solid Blue-500.
    - *Destructive (Clear All):* Solid Red-500.
    - *Ghost:* No background, Slate-400 text, appearing only on hover to reduce clutter.
- **Input Fields:** Inset appearance with Slate-950 background and Slate-700 border.
- **Media Bin:** Larger thumbnails with file-type icons (Video, Image, Audio) overlaid in the bottom-left corner.
- **Live Monitor:** A dedicated region with a 1px Blue-500 border when "On Air," providing a high-fidelity preview of the output.
