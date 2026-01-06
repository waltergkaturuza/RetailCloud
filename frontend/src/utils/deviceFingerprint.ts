/**
 * Device Fingerprint Utility
 * Generates a unique fingerprint for the device/browser combination
 */
export function getDeviceFingerprint(): string {
  const components: string[] = []
  
  // User Agent
  components.push(navigator.userAgent || '')
  
  // Screen resolution
  components.push(`${screen.width}x${screen.height}`)
  
  // Color depth
  components.push(`${screen.colorDepth}`)
  
  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '')
  
  // Language
  components.push(navigator.language || '')
  
  // Platform
  components.push(navigator.platform || '')
  
  // Hardware concurrency (CPU cores)
  components.push(`${navigator.hardwareConcurrency || 0}`)
  
  // Create hash
  const fingerprintString = components.join('|')
  
  // Simple hash function (in production, you might want to use a proper hashing library)
  let hash = 0
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36) + fingerprintString.length.toString(36)
}

