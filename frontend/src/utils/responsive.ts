/**
 * Responsive utility functions and breakpoints
 */

export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  largeDesktop: 1920,
}

export const isMobile = (width: number) => width < breakpoints.mobile
export const isTablet = (width: number) => width >= breakpoints.mobile && width < breakpoints.tablet
export const isDesktop = (width: number) => width >= breakpoints.tablet

/**
 * Get responsive padding based on screen size
 */
export const getResponsivePadding = (width: number) => {
  if (isMobile(width)) return '12px'
  if (isTablet(width)) return '16px'
  return '24px'
}

/**
 * Get responsive grid columns for product grids
 */
export const getProductGridColumns = (width: number) => {
  if (isMobile(width)) return 'repeat(auto-fill, minmax(140px, 1fr))'
  if (isTablet(width)) return 'repeat(auto-fill, minmax(160px, 1fr))'
  return 'repeat(auto-fill, minmax(180px, 1fr))'
}

/**
 * Get responsive font size
 */
export const getResponsiveFontSize = (width: number, base: number) => {
  if (isMobile(width)) return `${base * 0.85}px`
  if (isTablet(width)) return `${base * 0.95}px`
  return `${base}px`
}

/**
 * Get responsive button size
 */
export const getResponsiveButtonSize = (width: number) => {
  if (isMobile(width)) return { padding: '12px 16px', fontSize: '14px', minHeight: '44px' }
  if (isTablet(width)) return { padding: '12px 20px', fontSize: '15px', minHeight: '40px' }
  return { padding: '12px 24px', fontSize: '16px', minHeight: '40px' }
}


