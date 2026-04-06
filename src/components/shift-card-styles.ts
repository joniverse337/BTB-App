/**
 * Shared inline style constants for the ShiftCard print layout.
 * These are used across ShiftCard and its sub-components.
 * Print layout uses inline styles instead of Tailwind because
 * they need to work in detached print windows.
 */

export const FONT_FAMILY = "var(--font-ibm-plex-sans), sans-serif"
export const FONT_FAMILY_HEADER = "var(--font-inter), sans-serif"
export const COLOR_TEXT = '#222'
export const COLOR_LABEL = '#999'
export const COLOR_HEADER = '#1a2040'
export const COLOR_BORDER = '#e8e8e8'
export const COLOR_BG_FAINT = '#fafafa'

export const inputStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  borderBottom: `1px solid ${COLOR_BORDER}`,
  background: 'transparent',
  fontFamily: FONT_FAMILY,
  fontSize: '9pt',
  color: COLOR_TEXT,
  outline: 'none',
  padding: '1px 2px',
}

export const labelStyle: React.CSSProperties = {
  fontSize: '9pt',
  color: COLOR_LABEL,
  display: 'block',
  marginBottom: '1px',
}

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: '9pt',
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: '#888',
  borderBottom: '1px solid #ddd',
  paddingBottom: '2px',
  marginBottom: '5px',
}

export const sectionStyle: React.CSSProperties = {
  marginBottom: '5px',
  flexShrink: 0,
}

export const pageStyle: React.CSSProperties = {
  padding: '7mm 9mm 22mm 9mm',
  height: '100%',
  position: 'relative',
  fontFamily: FONT_FAMILY,
  fontSize: '8.5pt',
  color: COLOR_TEXT,
  background: '#fff',
}

export const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  borderBottom: `2.5px solid ${COLOR_HEADER}`,
  paddingBottom: '6px',
  marginBottom: '6px',
}

export const tableHeaderStyle: React.CSSProperties = {
  background: COLOR_HEADER,
  color: '#fff',
  padding: '2px 5px',
  textAlign: 'left',
  fontSize: '6pt',
  letterSpacing: '0.5px',
}

export const tableCellStyle: React.CSSProperties = {
  padding: '2px 5px',
  borderBottom: '1px solid #eee',
}
