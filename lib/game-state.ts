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

// Mock game history data
export function getMockGameHistory(): GameRecord[] {
  return [
    {
      id: "0x1234567890",
      player1: "0xabcdef1234567890",
      player2: "0x9876543210abcdef",
      stake: "0.05",
      status: "completed",
      result: "win",
      player1Move: 1, // Rock
      player2Move: 3, // Scissors
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      joinedAt: new Date(Date.now() - 86300000).toISOString(),
      revealedAt: new Date(Date.now() - 86200000).toISOString(),
      completedAt: new Date(Date.now() - 86100000).toISOString(),
      earnings: "0.05",
    },
    {
      id: "0x0987654321",
      player1: "0xabcdef1234567890",
      player2: "0x1111111111111111",
      stake: "0.02",
      status: "joined",
      result: "pending",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      joinedAt: new Date(Date.now() - 3500000).toISOString(),
    },
    {
      id: "0xabcdefabcd",
      player1: "0xabcdef1234567890",
      player2: "0x2222222222222222",
      stake: "0.1",
      status: "completed",
      result: "loss",
      player1Move: 2, // Paper
      player2Move: 3, // Scissors
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      joinedAt: new Date(Date.now() - 172700000).toISOString(),
      revealedAt: new Date(Date.now() - 172600000).toISOString(),
      completedAt: new Date(Date.now() - 172500000).toISOString(),
      earnings: "-0.1",
    },
    {
      id: "0xfedcbafed",
      player1: "0xabcdef1234567890",
      player2: "0x3333333333333333",
      stake: "0.03",
      status: "completed",
      result: "draw",
      player1Move: 4, // Lizard
      player2Move: 4, // Lizard
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      joinedAt: new Date(Date.now() - 259100000).toISOString(),
      revealedAt: new Date(Date.now() - 259000000).toISOString(),
      completedAt: new Date(Date.now() - 258900000).toISOString(),
      earnings: "0",
    },
    {
      id: "0x5555555555",
      player1: "0xabcdef1234567890",
      player2: "0x4444444444444444",
      stake: "0.075",
      status: "timeout",
      result: "timeout_claimed",
      createdAt: new Date(Date.now() - 345600000).toISOString(),
      joinedAt: new Date(Date.now() - 345500000).toISOString(),
      completedAt: new Date(Date.now() - 342000000).toISOString(),
      earnings: "0.075",
    },
  ]
}

// Format game status for display
export function formatGameStatus(status: GameStatus): string {
  const statusMap: Record<GameStatus, string> = {
    created: "Waiting for Player 2",
    joined: "Waiting for Reveal",
    revealed: "Revealed",
    completed: "Completed",
    claimed: "Claimed",
    timeout: "Timeout Claimed",
  }
  return statusMap[status] || status
}

// Get status color
export function getStatusColor(status: GameStatus): string {
  switch (status) {
    case "created":
      return "bg-blue-500/10 text-blue-300 border-blue-500/30"
    case "joined":
      return "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
    case "revealed":
      return "bg-purple-500/10 text-purple-300 border-purple-500/30"
    case "completed":
      return "bg-green-500/10 text-green-300 border-green-500/30"
    case "claimed":
      return "bg-green-500/10 text-green-300 border-green-500/30"
    case "timeout":
      return "bg-orange-500/10 text-orange-300 border-orange-500/30"
    default:
      return "bg-slate-500/10 text-slate-300 border-slate-500/30"
  }
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

// Format result for display
export function formatResult(result?: GameResult): string {
  if (!result) return "Pending"
  const resultMap: Record<GameResult, string> = {
    win: "Won",
    loss: "Lost",
    draw: "Draw",
    pending: "Pending",
    timeout_claimed: "Timeout Won",
  }
  return resultMap[result] || result
}
