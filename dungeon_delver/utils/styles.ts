export const colors = {
  bg: '#12161d',
  bgPanel: '#1a202c',
  bgCard: '#2d3748',
  bgCardHover: '#3a4a62',
  border: '#4a5568',
  borderLight: '#2d3748',
  gold: '#b8860b',
  goldDark: '#822000',
  goldFaded: 'rgba(184, 134, 11, 0.2)',
  goldBorder: 'rgba(184, 134, 11, 0.3)',
  text: 'white',
  textBody: '#e2e8f0',
  textLight: '#cbd5e0',
  textMuted: '#a0aec0',
  textDim: '#718096',
  accent: '#6366f1',
  success: '#48bb78',
  danger: '#e53e3e',
  overlay: '#0a0d12',
};

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '15px',
  round: '20px',
  pill: '25px',
  full: '50%',
};

export const spacing = {
  xs: '10px',
  sm: '15px',
  md: '20px',
  lg: '30px',
  xl: '40px',
};

export const transitions = {
  fast: '0.2s',
  normal: '0.3s',
};

export const resetButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
};

export const flexColumn: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

export const flexCenter: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const flexBetween: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const formInput: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: colors.bgPanel,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  color: colors.text,
};

export const formSelect: React.CSSProperties = {
  ...formInput,
  cursor: 'pointer',
};

export const primaryButton: React.CSSProperties = {
  background: colors.gold,
  border: 'none',
  color: 'black',
  padding: '12px 25px',
  borderRadius: radii.pill,
  fontWeight: 'bold',
  cursor: 'pointer',
};

export const secondaryButton: React.CSSProperties = {
  background: colors.bgCard,
  border: `1px solid ${colors.border}`,
  color: colors.text,
  padding: '8px 20px',
  borderRadius: radii.sm,
  fontWeight: 'bold',
  cursor: 'pointer',
};

export const ghostButton: React.CSSProperties = {
  ...resetButton,
  color: colors.textDim,
};

export const cardPanel: React.CSSProperties = {
  background: colors.bgCard,
  borderRadius: radii.lg,
  padding: spacing.lg,
  border: `1px solid ${colors.border}`,
  position: 'relative',
};

export const cardPanelDark: React.CSSProperties = {
  ...cardPanel,
  background: colors.bgPanel,
  borderColor: colors.borderLight,
};

export const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 4000,
};

export const sectionLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 'bold',
  color: colors.gold,
  letterSpacing: '2px',
  marginBottom: spacing.sm,
};

export const sectionTitle: React.CSSProperties = {
  fontSize: '2.5rem',
  margin: '10px 0 30px 0',
  fontFamily: 'serif',
};

export const badge: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: `1px solid ${colors.border}`,
  padding: '5px 15px',
  borderRadius: radii.round,
  fontSize: '0.7rem',
  fontWeight: 'bold',
  color: colors.textLight,
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

export const goldBadge: React.CSSProperties = {
  display: 'inline-block',
  background: colors.gold,
  color: 'black',
  padding: '2px 10px',
  borderRadius: radii.sm,
  fontSize: '0.8rem',
  fontWeight: 'bold',
  marginTop: spacing.xs,
};

export const statBonusBadge: React.CSSProperties = {
  padding: '2px 8px',
  border: `1px solid ${colors.gold}`,
  borderRadius: radii.sm,
  fontSize: '0.75rem',
  fontWeight: 'bold',
  color: colors.text,
  background: colors.goldFaded,
};

export const pillToggle: React.CSSProperties = {
  display: 'inline-flex',
  background: colors.bg,
  padding: '4px',
  borderRadius: '30px',
  border: `1px solid ${colors.borderLight}`,
  marginBottom: spacing.md,
};

export const pillToggleBtn: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: '25px',
  border: 'none',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: transitions.fast,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

export const scrollableGrid: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  marginTop: spacing.md,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: spacing.xs,
  paddingRight: spacing.xs,
};

export const pageOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: colors.bg,
  zIndex: 1000,
  display: 'flex',
  color: 'white',
};

export const detailOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: colors.overlay,
  zIndex: 1200,
  overflowY: 'auto',
};

export const optionLabel: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 'bold',
  color: colors.gold,
  letterSpacing: '1px',
  marginBottom: '5px',
};

export const loreText: React.CSSProperties = {
  color: colors.textLight,
  lineHeight: '1.7',
  fontSize: '1.05rem',
};

export const disabledMuted: React.CSSProperties = {
  color: colors.textDim,
  fontSize: '0.8rem',
};
