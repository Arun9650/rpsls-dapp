// Game state types and utilities
export type GameStatus = "created" | "joined" | "revealed" | "completed" | "claimed" | "timeout"
export type GameResult = "win" | "loss" | "draw" | "pending" | "timeout_claimed"

export interface GameRecord {
  id: string
  player1: string
  player2?: string
  stake: string
  status: GameStatus
  result?: GameResult
  player1Move?: number
  player2Move?: number
  createdAt: string
  joinedAt?: string
  revealedAt?: string
  completedAt?: string
  earnings?: string
}


// Get result color
export function getResultColor(result?: GameResult): string {
  switch (result) {
    case "win":
      return "text-green-400 font-semibold"
    case "loss":
      return "text-red-400 font-semibold"
    case "draw":
      return "text-yellow-400 font-semibold"
    case "timeout_claimed":
      return "text-orange-400 font-semibold"
    case "pending":
      return "text-slate-400"
    default:
      return "text-slate-400"
  }
}
