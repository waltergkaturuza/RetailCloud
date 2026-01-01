export const theme = {
  colors: {
    primary: '#3498db',
    primaryDark: '#2980b9',
    secondary: '#2ecc71',
    secondaryDark: '#27ae60',
    danger: '#e74c3c',
    dangerDark: '#c0392b',
    warning: '#f39c12',
    warningDark: '#d68910',
    info: '#3498db',
    success: '#2ecc71',
    dark: '#2c3e50',
    light: '#ecf0f1',
    gray: '#95a5a6',
    grayDark: '#7f8c8d',
    white: '#ffffff',
    black: '#000000',
    sidebar: '#2c3e50',
    sidebarHover: '#34495e',
    border: '#ecf0f1',
    background: '#f5f7fa',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.15)',
  },
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
};

export type Theme = typeof theme;




