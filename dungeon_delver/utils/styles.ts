// =============================================================================
// 📘 FILE: utils/styles.ts
// =============================================================================
// 🎯 PURPOSE: Shared CSS-in-JS style objects used across components. Provides
//    a consistent design system through reusable style objects rather than
//    repeating inline styles everywhere.
//
// 🧠 REACT CONCEPT: Design System Constants
//    Before this file, components might have had scattered inline styles like
//    `background: '#1a1714'` — this file centralizes ALL design tokens (colors,
//    spacing, radii, typography) into a single source of truth.
//
//    Components import and spread: <div style={{...cardPanel}}>
//    If the gold color changes from #c9a84c to something else, edit ONE place.
//
// 🧠 Note: This file uses `React.CSSProperties` typing — TypeScript validates
//    that all style objects are valid CSS, catching typos like `borderRadius`
//    vs `boderRadius`.
//
// 🔧 HOW TO ALTER:
//    - Change the gold color: modify the `gold` value in colors
//    - Add a new button style: create a new exported style object
//    - Change spacing: modify the spacing map
// =============================================================================

// 🧠 Colors — All named colors used in the app.
export const colors = {
  bg: '#0c0e14',
  bgPanel: '#1a1714',
  bgCard: '#1a1714',
  bgCardHover: '#2a2520',
  border: '#3d3528',
  borderLight: '#2a2520',
  gold: '#c9a84c',
  goldDark: '#8a6e2f',
  goldFaded: 'rgba(201, 168, 76, 0.15)',
  goldBorder: 'rgba(201, 168, 76, 0.25)',
  text: '#e8dcc8',
  textBody: '#e8dcc8',
  textLight: '#d4c8a8',
  textMuted: '#8a7e6a',
  textDim: '#5a5248',
  accent: '#c9a84c',
  success: '#16a34a',
  danger: '#a83232',
  overlay: '#0c0e14',
};

// 🧠 Radii — Border radius values used throughout the app.
export const radii = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  round: '20px',
  pill: '25px',
  full: '50%',
};

// 🧠 Spacing — Consistent spacing sizes.
export const spacing = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

export const transitions = {
  fast: '0.15s',
  normal: '0.25s',
};

// ============================================================
// COMPOSABLE STYLE OBJECTS
// ============================================================

// 🧠 Each style object below is a reusable building block.
//    Usage: <div style={{...cardPanel, ...flexCenter}}>
//    The spread operator merges them — later spreads override earlier ones.

export const resetButton: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
};

export const flexColumn: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
};

export const flexCenter: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export const flexBetween: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};

export const formInput: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#0c0e14',
  border: '1px solid #3d3528', borderRadius: radii.md,
  color: colors.text, fontSize: '0.85rem', outline: 'none',
};

export const formSelect: React.CSSProperties = {
  ...formInput, cursor: 'pointer',
};

export const primaryButton: React.CSSProperties = {
  background: colors.gold, border: 'none', color: '#1a1714',
  padding: '10px 22px', borderRadius: radii.md, fontWeight: 'bold',
  cursor: 'pointer', fontSize: '0.85rem', letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

export const secondaryButton: React.CSSProperties = {
  background: 'transparent', border: '1px solid #3d3528',
  color: colors.text, padding: '8px 18px', borderRadius: radii.md,
  fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem',
};

export const ghostButton: React.CSSProperties = {
  ...resetButton, color: colors.textDim, padding: '6px 12px', borderRadius: radii.md,
};

export const cardPanel: React.CSSProperties = {
  background: colors.bgCard, borderRadius: radii.lg, padding: spacing.lg,
  border: '1px solid #3d3528', position: 'relative',
};

export const cardPanelDark: React.CSSProperties = {
  ...cardPanel, background: '#0c0e14', borderColor: '#2a2520',
};

export const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000,
};

export const sectionLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 'bold', color: colors.gold,
  letterSpacing: '2px', marginBottom: spacing.sm, textTransform: 'uppercase',
};

export const sectionTitle: React.CSSProperties = {
  fontSize: '2rem', margin: '10px 0 24px 0',
  fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif',
  color: colors.gold,
};

export const badge: React.CSSProperties = {
  background: 'rgba(201, 168, 76, 0.1)', border: '1px solid #3d3528',
  padding: '4px 12px', borderRadius: radii.round, fontSize: '0.7rem',
  fontWeight: 'bold', color: colors.textLight, textTransform: 'uppercase',
  letterSpacing: '1px',
};

export const goldBadge: React.CSSProperties = {
  display: 'inline-block', background: colors.gold, color: '#1a1714',
  padding: '2px 10px', borderRadius: radii.sm, fontSize: '0.8rem',
  fontWeight: 'bold', marginTop: spacing.xs,
};

export const statBonusBadge: React.CSSProperties = {
  padding: '2px 8px', border: `1px solid ${colors.gold}`,
  borderRadius: radii.sm, fontSize: '0.75rem', fontWeight: 'bold',
  color: colors.text, background: colors.goldFaded,
};

export const pillToggle: React.CSSProperties = {
  display: 'inline-flex', background: '#0c0e14', padding: '4px',
  borderRadius: '30px', border: '1px solid #2a2520', marginBottom: spacing.md,
};

export const pillToggleBtn: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '25px', border: 'none',
  fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
  transition: transitions.fast, textTransform: 'uppercase', letterSpacing: '0.5px',
};

export const scrollableGrid: React.CSSProperties = {
  flex: 1, overflowY: 'auto', marginTop: spacing.md,
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.xs,
  paddingRight: spacing.xs,
};

export const pageOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: colors.bg,
  zIndex: 1000, display: 'flex', color: colors.text,
};

export const detailOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: colors.overlay, zIndex: 1200, overflowY: 'auto',
};

export const optionLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 'bold', color: colors.gold,
  letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase',
};

export const loreText: React.CSSProperties = {
  color: colors.textLight, lineHeight: '1.7', fontSize: '1.05rem',
};

export const disabledMuted: React.CSSProperties = {
  color: colors.textDim, fontSize: '0.8rem',
};
