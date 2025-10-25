// Timeout configuration (in seconds)
export const TIMEOUT_DURATION = 3600 // 1 hour

// Calculate time remaining until timeout
export function getTimeRemaining(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  const now = new Date().getTime()
  const elapsed = (now - created) / 1000 // Convert to seconds
  const remaining = Math.max(0, TIMEOUT_DURATION - elapsed)
  return remaining
}

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

// Check if timeout has been reached
export function isTimeoutReached(createdAt: string): boolean {
  return getTimeRemaining(createdAt) <= 0
}

// Get timeout status
export function getTimeoutStatus(
  gameState: "created" | "joined" | "revealed" | "completed",
  createdAt: string,
): "active" | "timeout_reached" | "completed" {
  if (gameState === "completed") return "completed"
  if (isTimeoutReached(createdAt)) return "timeout_reached"
  return "active"
}
