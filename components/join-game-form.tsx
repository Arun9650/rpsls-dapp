'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RPSabi } from '@/constants/abi';
import {
	MOVES,
	MOVE_EMOJIS,
	MOVE_NAMES,
	formatAddress,
} from '@/lib/contract-utils';
import { useEffect, useState } from 'react';
import { formatEther, isAddress, parseEther } from 'viem';
import {
	useAccount,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';

interface JoinGameFormProps {
	account: string;
}

interface GameInfo {
	contractAddress: string;
	player1: string;
	player2: string;
	stake: string;
	status: 'waiting' | 'joined' | 'completed' | 'error';
	lastAction: bigint;
}

export function JoinGameForm({ account }: JoinGameFormProps) {
	const { address } = useAccount();
	const [contractAddress, setContractAddress] = useState('');
	console.log('🚀 ~ JoinGameForm ~ contractAddress:', contractAddress);
	const [selectedMove, setSelectedMove] = useState<number | null>(null);
	const [stakeAmount, setStakeAmount] = useState('');
	const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
	const [joinedGame, setJoinedGame] = useState<{
		contractAddress: string;
		move: number;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Contract read hooks
	const { data: j1Data } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'j1',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});

	const { data: j2Data } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'j2',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});
	console.log('🚀 ~ JoinGameForm ~ j2Data:', j2Data);

	const { data: stakeData } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'stake',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});
	console.log('🚀 ~ JoinGameForm ~ stakeData:', stakeData);

	const { data: c2Data } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'c2',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});

	const { data: lastActionData } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'lastAction',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});

	// Contract write hooks
	const {
		writeContract,
		data: hash,
		isPending: isWritePending,
	} = useWriteContract();

	const { isLoading: isConfirming, isSuccess: isConfirmed } =
		useWaitForTransactionReceipt({
			hash,
		});

	const isLoading = isWritePending || isConfirming;

	// Auto-fetch game info when contract address changes
	useEffect(() => {
		if (
			contractAddress &&
			isAddress(contractAddress) &&
			stakeData !== undefined &&
			j1Data
		) {
			const player2 = j2Data || '0x0000000000000000000000000000000000000000';
			const hasPlayer2 =
				player2 !== '0x0000000000000000000000000000000000000000';
			const isCurrentUserPlayer2 = address === player2;

			// Check if player2 has actually made a move (c2Data should be > 0)
			const player2HasMoved = c2Data && c2Data !== 0;

			const stakeInEth = formatEther(stakeData as bigint);
			setStakeAmount(stakeInEth);

			// Determine game status
			let status: 'waiting' | 'joined' | 'completed' | 'error' = 'waiting';

			// Game is only considered "joined" if player2 exists AND has made a move
			if (hasPlayer2 && player2HasMoved) {
				status = 'joined';
			} else if (hasPlayer2 && !player2HasMoved) {
				// Player2 is set but hasn't made a move yet
				status = 'waiting';
			}

			setGameInfo({
				contractAddress,
				player1: j1Data as string,
				player2: player2 as string,
				stake: stakeInEth,
				status,
				lastAction: (lastActionData as bigint) || BigInt(0),
			});

			setError(null);

			// Only show "already joined" if current user is player2 AND has made a move
			if (isCurrentUserPlayer2 && player2HasMoved) {
				setJoinedGame({
					contractAddress,
					move: c2Data as number,
				});
			} else {
				// Reset joinedGame state if user hasn't actually made a move
				setJoinedGame(null);
			}
		} else if (
			contractAddress &&
			isAddress(contractAddress) &&
			stakeData === undefined
		) {
			setError('Game not found or invalid contract address');
			setGameInfo(null);
			setStakeAmount('');
		}
	}, [
		contractAddress,
		stakeData,
		j1Data,
		j2Data,
		lastActionData,
		address,
		c2Data,
	]);

	const handleContractAddressChange = (value: string) => {
		setContractAddress(value);
		setError(null);
		setGameInfo(null);
		setStakeAmount('');
		setSelectedMove(null);
	};

	const handleCommitMove = async () => {
		setError(null);

		if (!contractAddress || !selectedMove || !stakeAmount) {
			setError(
				'Please enter contract address, select a move, and confirm stake amount'
			);
			return;
		}

		if (!gameInfo) {
			setError('Please wait for game info to load');
			return;
		}

		if (gameInfo.status !== 'waiting') {
			setError('Game is not waiting for a second player');
			return;
		}

		if (!address) {
			setError('Please connect your wallet');
			return;
		}

		// Validate stake amount matches
		if (parseFloat(stakeAmount) !== parseFloat(gameInfo.stake)) {
			setError(`Stake amount must match the game stake: ${gameInfo.stake} ETH`);
			return;
		}

		try {
			writeContract({
				address: contractAddress as `0x${string}`,
				abi: RPSabi,
				functionName: 'play',
				args: [selectedMove],
				value: parseEther(stakeAmount),
			});
		} catch (err) {
			console.error('Error committing move:', err);
			setError(err instanceof Error ? err.message : 'Failed to commit move');
		}
	};

	// Handle successful transaction
	useEffect(() => {
		if (isConfirmed && selectedMove && !joinedGame) {
			setJoinedGame({ contractAddress, move: selectedMove });

			// Don't automatically reset the form - let user manually start a new game
			// This prevents interference when checking other games

			// Optional: Add a small delay before allowing new interactions
			const timer = setTimeout(() => {
				// Only reset selectedMove to prevent accidental re-submissions
				setSelectedMove(null);
			}, 1000);

			return () => clearTimeout(timer);
		}
	}, [isConfirmed, selectedMove, joinedGame, contractAddress]);

	return (
		<div className="space-y-6">
			{/* Contract Address Input */}
			<div>
				<label className="mb-2 block text-sm font-medium text-white">
					Game Contract Address
				</label>
				<Input
					type="text"
					placeholder="0x..."
					value={contractAddress}
					onChange={(e) => handleContractAddressChange(e.target.value)}
					className="border-purple-500/20 bg-slate-800/50 text-white placeholder:text-slate-500"
					disabled={isLoading}
				/>
				<p className="mt-1 text-xs text-slate-400">
					Enter the contract address shared by Player 1
				</p>
			</div>

			{/* Game Info Display */}
			{gameInfo && (
				<Card className="border-blue-500/30 bg-blue-500/10 p-4">
					<div className="space-y-2">
						<p className="text-sm font-semibold text-blue-300">Game Found</p>
						<div className="space-y-1 text-xs text-blue-200">
							<p>
								<span className="font-medium">Player 1:</span>{' '}
								{formatAddress(gameInfo.player1)}
							</p>
							<p>
								<span className="font-medium">Required Stake:</span>{' '}
								{gameInfo.stake} ETH
							</p>
							<p>
								<span className="font-medium">Status:</span>{' '}
								{gameInfo.status === 'waiting'
									? 'Waiting for Player 2'
									: 'Already Joined'}
							</p>
						</div>
					</div>
				</Card>
			)}

			{/* Move Selection Form */}
			{gameInfo && gameInfo.status === 'waiting' && (
				<div className="space-y-4">
					{/* Move Selection */}
					<div>
						<label className="mb-3 block text-sm font-medium text-white">
							Select Your Move
						</label>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
							{Object.entries(MOVES).map(([name, value]) => (
								<button
									key={value}
									onClick={() => setSelectedMove(value)}
									disabled={isLoading}
									className={`rounded-lg border-2 p-4 text-center transition-all disabled:opacity-50 ${
										selectedMove === value
											? 'border-purple-500 bg-purple-500/20'
											: 'border-purple-500/20 bg-slate-800/50 hover:border-purple-500/50'
									}`}
								>
									<div className="text-2xl">{MOVE_EMOJIS[value]}</div>
									<div className="mt-2 text-xs font-medium text-purple-300">
										{name}
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Stake Amount Input */}
					<div>
						<label className="mb-2 block text-sm font-medium text-white">
							Stake Amount (ETH)
						</label>
						<Input
							type="number"
							placeholder="0.0"
							value={stakeAmount}
							onChange={(e) => setStakeAmount(e.target.value)}
							step="0.001"
							min="0"
							className="border-purple-500/20 bg-slate-800/50 text-white placeholder:text-slate-500"
							disabled={isLoading}
							readOnly
						/>
						<p className="mt-1 text-xs text-slate-400">
							Stake amount is automatically set from the game contract
						</p>
					</div>
				</div>
			)}

			{/* Error Display */}
			{error && (
				<Alert className="border-red-500/30 bg-red-500/10">
					<AlertDescription className="text-red-300">{error}</AlertDescription>
				</Alert>
			)}

			{/* Success Display */}
			{joinedGame && (
				<Card className="border-green-500/30 bg-green-500/10 p-4">
					<div className="space-y-2">
						<p className="text-sm font-semibold text-green-300">
							Move Committed Successfully!
						</p>
						<div className="space-y-1 text-xs text-green-200">
							<p>
								<span className="font-medium">Contract:</span>{' '}
								{joinedGame.contractAddress.slice(0, 10)}...
							</p>
							<p>
								<span className="font-medium">Your Move:</span>{' '}
								{MOVE_NAMES[joinedGame.move]} {MOVE_EMOJIS[joinedGame.move]}
							</p>
							<p>
								<span className="font-medium">Stake:</span> {gameInfo?.stake}{' '}
								ETH
							</p>
						</div>
						<p className="mt-3 text-xs text-green-300">
							Waiting for Player 1 to reveal their move. Check the "Play Move"
							tab to see if the game can be resolved.
						</p>
					</div>
				</Card>
			)}

			{/* Commit Move Button */}
			{gameInfo && gameInfo.status === 'waiting' && (
				<Button
					onClick={handleCommitMove}
					disabled={isLoading || !selectedMove || !stakeAmount || !gameInfo}
					className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
				>
					{isLoading ? 'Committing Move...' : 'Commit Your Move'}
				</Button>
			)}

			{/* Game Already Joined Message */}
			{gameInfo && gameInfo.status === 'joined' && (
				<Card className="border-yellow-500/30 bg-yellow-500/10 p-4">
					<p className="text-sm text-yellow-300">
						This game already has a second player. You cannot join this game.
					</p>
				</Card>
			)}
		</div>
	);
}
