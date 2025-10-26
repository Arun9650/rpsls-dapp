// Timeout configuration (in seconds)
export const TIMEOUT_DURATION = 300 // 5 minutes

// Format seconds to readable time
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Timeout reached"

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

