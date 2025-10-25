"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MOVE_EMOJIS, MOVE_NAMES, formatAddress } from "@/lib/contract-utils"
import {
  type GameRecord,
  getMockGameHistory,
  formatGameStatus,
  getStatusColor,
  getResultColor,
  formatResult,
} from "@/lib/game-state"

interface GameHistoryProps {
  account: string
}

export function GameHistory({ account }: GameHistoryProps) {
  const [games, setGames] = useState<GameRecord[]>([])
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    loadGameHistory()
  }, [account])

  const loadGameHistory = () => {
    // In a real app, you would fetch this from the smart contract
    const mockGames = getMockGameHistory()
    setGames(mockGames)
  }

  const completedGames = games.filter((g) => g.status === "completed")
  const activeGames = games.filter((g) => g.status !== "completed" && g.status !== "timeout")
  const winCount = games.filter((g) => g.result === "win").length
  const lossCount = games.filter((g) => g.result === "loss").length
  const drawCount = games.filter((g) => g.result === "draw").length

  const totalEarnings = games.reduce((sum, g) => {
    if (g.earnings) {
      return sum + Number.parseFloat(g.earnings)
    }
    return sum
  }, 0)

  const getFilteredGames = () => {
    switch (activeTab) {
      case "active":
        return activeGames
      case "completed":
        return completedGames
      default:
        return games
    }
  }

  const filteredGames = getFilteredGames()

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-purple-500/20 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">Total Games</p>
          <p className="text-2xl font-bold text-white">{games.length}</p>
        </Card>
        <Card className="border-green-500/20 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">Wins</p>
          <p className="text-2xl font-bold text-green-400">{winCount}</p>
        </Card>
        <Card className="border-red-500/20 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">Losses</p>
          <p className="text-2xl font-bold text-red-400">{lossCount}</p>
        </Card>
        <Card className="border-yellow-500/20 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">Draws</p>
          <p className="text-2xl font-bold text-yellow-400">{drawCount}</p>
        </Card>
      </div>

      {/* Earnings Card */}
      <Card className="border-purple-500/20 bg-slate-900/50 p-4">
        <p className="text-xs text-slate-400">Net Earnings</p>
        <p className={`text-2xl font-bold ${totalEarnings >= 0 ? "text-green-400" : "text-red-400"}`}>
          {totalEarnings >= 0 ? "+" : ""}
          {totalEarnings.toFixed(4)} ETH
        </p>
      </Card>

      {/* Game History Tabs */}
      <Card className="border-purple-500/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-4">
          <h3 className="mb-4 font-bold text-white">Game History</h3>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
                All ({games.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
                Active ({activeGames.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-purple-600">
                Completed ({completedGames.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-3">
              {filteredGames.length === 0 ? (
                <p className="text-sm text-purple-300">No games in this category yet.</p>
              ) : (
                filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className={`rounded-lg border-2 bg-slate-800/50 p-3 transition-all hover:bg-slate-800/70 ${getStatusColor(game.status)}`}
                  >
                    {/* Game Header */}
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">{game.id.slice(0, 10)}...</span>
                      <span className="text-xs font-medium">{formatGameStatus(game.status)}</span>
                    </div>

                    {/* Game Details */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Opponent:</span>
                        <span className="font-mono text-slate-300">
                          {game.player2 ? formatAddress(game.player2) : "Waiting..."}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Stake:</span>
                        <span className="font-mono text-slate-300">{game.stake} ETH</span>
                      </div>

                      {/* Moves Display */}
                      {game.player1Move !== undefined && game.player2Move !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Moves:</span>
                          <span className="flex gap-2">
                            <span title={MOVE_NAMES[game.player1Move]}>{MOVE_EMOJIS[game.player1Move]}</span>
                            <span className="text-slate-500">vs</span>
                            <span title={MOVE_NAMES[game.player2Move]}>{MOVE_EMOJIS[game.player2Move]}</span>
                          </span>
                        </div>
                      )}

                      {/* Result */}
                      {game.result && (
                        <div className="flex items-center justify-between border-t border-slate-700/50 pt-2">
                          <span className="text-slate-400">Result:</span>
                          <span className={getResultColor(game.result)}>{formatResult(game.result)}</span>
                        </div>
                      )}

                      {/* Earnings */}
                      {game.earnings !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Earnings:</span>
                          <span
                            className={`font-mono font-semibold ${
                              Number.parseFloat(game.earnings) > 0
                                ? "text-green-400"
                                : Number.parseFloat(game.earnings) < 0
                                  ? "text-red-400"
                                  : "text-slate-400"
                            }`}
                          >
                            {Number.parseFloat(game.earnings) > 0 ? "+" : ""}
                            {game.earnings} ETH
                          </span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center justify-between border-t border-slate-700/50 pt-2 text-slate-500">
                        <span>Created:</span>
                        <span className="text-xs">
                          {new Date(game.createdAt).toLocaleDateString()}{" "}
                          {new Date(game.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  )
}
