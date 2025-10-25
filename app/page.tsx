'use client';

import { GameBoard } from '@/components/game-board';
import { WalletConnect } from '@/components/wallet-connect';
import { useAccount } from 'wagmi';

export default function Home() {
	const { address, isConnected, isConnecting } = useAccount();

	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
			{/* Header */}
			<header className="border-b border-purple-500/20 bg-slate-950/50 backdrop-blur-sm">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
								<span className="text-lg font-bold text-white">⚔️</span>
							</div>
							<h1 className="text-2xl font-bold text-white">RPSLS</h1>
							<span className="text-sm text-purple-300">Blockchain Game</span>
						</div>
						<WalletConnect />
					</div>
				</div>
			</header>

			{/* Main Content */}
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
				{isConnected && address ? (
					<div className="grid gap-8">
						<div className="lg:col-span-2">
							<GameBoard account={address} />
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center rounded-xl border border-purple-500/20 bg-slate-900/50 py-20 text-center backdrop-blur-sm">
						<div className="mb-6 text-5xl">🎮</div>
						<h2 className="mb-2 text-2xl font-bold text-white">
							{isConnecting ? 'Connecting...' : 'Connect Your Wallet'}
						</h2>
						<p className="mb-8 text-purple-300">
							{isConnecting
								? 'Please check your wallet...'
								: 'Connect to Sepolia testnet to start playing'}
						</p>
						{isConnecting ? (
							<div className="flex items-center gap-2">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
								<span className="text-purple-300">Connecting...</span>
							</div>
						) : (
							<WalletConnect />
						)}
					</div>
				)}
			</div>
		</main>
	);
}
