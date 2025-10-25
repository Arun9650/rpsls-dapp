"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateGameForm } from "./create-game-form"
import { JoinGameForm } from "./join-game-form"
import { PlayMoveForm } from "./play-move-form"
import { TimeoutClaimForm } from "./timeout-claim-form"

interface GameBoardProps {
  account: string
}

export function GameBoard({ account }: GameBoardProps) {
  const [activeTab, setActiveTab] = useState("create")

  return (
    <div className="space-y-6">
      <Card className="border-purple-500/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6">
          <h2 className="mb-6 text-xl font-bold text-white">Game Interface</h2>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
              <TabsTrigger value="create" className="data-[state=active]:bg-purple-600">
                Create Game
              </TabsTrigger>
              <TabsTrigger value="join" className="data-[state=active]:bg-purple-600">
                Join Game
              </TabsTrigger>
              <TabsTrigger value="play" className="data-[state=active]:bg-purple-600">
                Play Move
              </TabsTrigger>
              <TabsTrigger value="timeout" className="data-[state=active]:bg-purple-600">
                Claim Timeout
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-6">
              <CreateGameForm account={account} />
            </TabsContent>

            <TabsContent value="join" className="mt-6">
              <JoinGameForm account={account} />
            </TabsContent>

            <TabsContent value="play" className="mt-6">
              <PlayMoveForm account={account} />
            </TabsContent>

            <TabsContent value="timeout" className="mt-6">
              <TimeoutClaimForm account={account} />
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {/* Game Rules */}
      <Card className="border-purple-500/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6">
          <h3 className="mb-4 font-bold text-white">Game Rules</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm text-purple-200">
              <p>
                <span className="font-semibold">Rock</span> crushes Scissors & Lizard
              </p>
              <p>
                <span className="font-semibold">Paper</span> covers Rock & disproves Spock
              </p>
              <p>
                <span className="font-semibold">Scissors</span> cuts Paper & decapitates Lizard
              </p>
            </div>
            <div className="space-y-2 text-sm text-purple-200">
              <p>
                <span className="font-semibold">Lizard</span> eats Paper & poisons Spock
              </p>
              <p>
                <span className="font-semibold">Spock</span> vaporizes Rock & smashes Scissors
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
