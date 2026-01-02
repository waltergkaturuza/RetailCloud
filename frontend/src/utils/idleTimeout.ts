/**
 * Idle timeout utility - logs out user after 30 minutes of inactivity
 */

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

let idleTimer: NodeJS.Timeout | null = null;
let lastActivityTime = Date.now();

/**
 * Reset the idle timer
 */
export function resetIdleTimer() {
  lastActivityTime = Date.now();
  
  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  
  idleTimer = setTimeout(() => {
    // Check if user is still idle
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    
    if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
      // User has been idle for 30+ minutes, trigger logout
      handleIdleTimeout();
    }
  }, IDLE_TIMEOUT_MS);
}

/**
 * Handle idle timeout - logout user
 */
function handleIdleTimeout() {
  // Clear auth data
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('tenant_slug');
  localStorage.removeItem('user');
  localStorage.removeItem('owner_user');
  
  // Trigger logout event
  window.dispatchEvent(new CustomEvent('auth:logout'));
  
  // Redirect to login
  if (!window.location.pathname.includes('/login') && 
      !window.location.pathname.includes('/owner/login')) {
    if (window.location.pathname.includes('/owner')) {
      window.location.href = '/owner/login';
    } else {
      window.location.href = '/login';
    }
  }
}

/**
 * Initialize idle timeout monitoring
 */
export function initIdleTimeout() {
  // Reset timer on user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.addEventListener(event, resetIdleTimer, { passive: true });
  });
  
  // Also reset on visibility change (user switches tabs back)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // User came back to the tab, check if they've been away too long
      const timeSinceLastActivity = Date.now() - lastActivityTime;
      if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
        handleIdleTimeout();
      } else {
        resetIdleTimer();
      }
    }
  });
  
  // Start the timer
  resetIdleTimer();
}

/**
 * Clear idle timeout (on logout)
 */
export function clearIdleTimeout() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

