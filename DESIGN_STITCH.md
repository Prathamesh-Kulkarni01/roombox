---
name: Velvet Obsidian
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e6bdbd'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#ac8888'
  outline-variant: '#5c3f40'
  surface-tint: '#ffb3b4'
  primary: '#ffb3b4'
  on-primary: '#680016'
  primary-container: '#e61e43'
  on-primary-container: '#ffffff'
  inverse-primary: '#bf0031'
  secondary: '#e3bdc2'
  on-secondary: '#422a2e'
  secondary-container: '#5b3f44'
  on-secondary-container: '#d1acb1'
  tertiary: '#c6c6c7'
  on-tertiary: '#2f3131'
  tertiary-container: '#757676'
  on-tertiary-container: '#ffffff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad9'
  primary-fixed-dim: '#ffb3b4'
  on-primary-fixed: '#40000a'
  on-primary-fixed-variant: '#920023'
  secondary-fixed: '#ffd9de'
  secondary-fixed-dim: '#e3bdc2'
  on-secondary-fixed: '#2b1519'
  on-secondary-fixed-variant: '#5b3f44'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  unit-1: 4px
  unit-2: 8px
  unit-4: 16px
  unit-6: 24px
  unit-8: 32px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style

The brand personality is sophisticated, secure, and modern, tailored for the "PG" (Paying Guest) and property management ecosystem. It evokes a sense of premium reliability through a high-end SaaS aesthetic.

The visual style is a fusion of **Glassmorphism** and **Minimalism**. It utilizes deep, obsidian-like backgrounds layered with translucent surfaces that feature subtle primary-tinted borders. This creates a tactile, layered environment where importance is signaled by glowing accents and soft, colored shadows rather than heavy ornamentation. The interface prioritizes focus, clarity, and a premium "pro" feel for property owners.

## Colors

The palette is built on a foundation of deep blacks and rich, dark reds to maintain legibility in low-light environments while emphasizing brand identity.

- **Primary**: A vibrant, energetic crimson used for calls-to-action, active icons, and focal glows.
- **Secondary/Surface**: A muted, deep wine-tinted black used for card backgrounds and elevated containers to provide subtle warmth.
- **Neutral**: The background is a pure obsidian black to maximize contrast with glass layers.
- **Functional**: Borders use the primary color at extremely low opacity (10%) to create "clean borders" that define shape without cluttering the view.

## Typography

This design system utilizes **Inter** exclusively to lean into its systematic, utilitarian, and modern corporate nature. 

The type hierarchy is characterized by high contrast between bold headlines and secondary body text. Supporting text often uses reduced opacity (60-70%) to create a visual "depth" without needing multiple gray hex codes. For mobile screens, larger headings scale down slightly to ensure optimal line wrapping on narrow viewports while maintaining their characteristic weight.

## Layout & Spacing

The layout follows a **fluid grid** model optimized for mobile-first interaction. 

- **Grid**: A standard 4-column grid for mobile, expanding to 12 columns for desktop.
- **Rhythm**: An 8pt spacing system is used for most vertical elements, with a 4pt "micro-step" for tight components like labels and icons.
- **Padding**: Large internal card padding (24px) creates an expansive, high-end feel.
- **Safe Zones**: Consistent 20px horizontal margins ensure content remains clear of bezel edges on various device types.

## Elevation & Depth

Depth is communicated through **Glassmorphism** and **Primary Tinting** rather than traditional gray-scale shadows.

- **Surface 0 (Background)**: Pure Neutral Black.
- **Surface 1 (Cards/Containers)**: Translucent Secondary color with a `backdrop-filter: blur(20px)`.
- **Surface 2 (Floating elements/Popovers)**: Slightly lighter wine-tinted black with a 1px border at `primary/20%` opacity.
- **Shadows**: Soft, diffused "Glow Shadows" are used. Instead of black shadows, use the Primary color at 15-20% opacity with a large blur radius (30px+) for interactive elements like primary buttons or active state icons.

## Shapes

The shape language is consistently **Rounded**, reflecting a modern and approachable tactile feel.

- **Standard Elements**: Buttons and Input fields use a 0.5rem (8px) radius.
- **Large Elements**: Main containers and cards use a 1.5rem (24px) radius to create a soft, friendly silhouette.
- **Icons**: Icon backgrounds often utilize a "Squircle" or high-radius rounded box (12px) to stand out from the card geometry.

## Components

### Buttons
Primary buttons are solid fills of the primary crimson. Secondary buttons are glass-based with the `border-primary/10` and high backdrop blur.

### Cards
Cards are the core organizational unit. They must feature a subtle gradient (from top-left to bottom-right) using the secondary color, a 1px semi-transparent primary border, and generous internal padding.

### Chips & Badges
Used for status indicators (e.g., "SOON"). These should be low-contrast, using a dark gray or secondary-tinted fill with uppercase `label-md` typography to avoid distracting from primary actions.

### Inputs
Fields should be dark surfaces with `border-primary/10` that transitions to `border-primary/50` on focus.

### Tactile Feedback
Interactive rows and list items should feature a subtle "pressed" state where the background opacity increases slightly, providing physical feedback to the user's touch.
