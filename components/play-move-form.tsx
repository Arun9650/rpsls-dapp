'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RPSabi } from '@/constants/abi';
import {
	MOVE_EMOJIS,
	MOVE_NAMES,
	getGameDataByAddress,
} from '@/lib/contract-utils';
import { calculateResult, getMoveDescription } from '@/lib/game-logic';
import { useEffect, useState } from 'react';
import { isAddress } from 'viem';
import {
	useAccount,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';

interface PlayMoveFormProps {
	account: string;
}

interface RevealResult {
	contractAddress: string;
	yourMove: number;
	opponentMove: number;
	result: 'win' | 'loss' | 'draw';
	stake: string;
}

export function PlayMoveForm({ account }: PlayMoveFormProps) {
	const { address } = useAccount();
	const [contractAddress, setContractAddress] = useState('');
	const [yourMove, setYourMove] = useState<number | null>(null);
	const [revealed, setRevealed] = useState<RevealResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Contract read hooks
	const { data: j1Data } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'j1',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});
	console.log('🚀 ~ PlayMoveForm ~ j1Data:', j1Data);

	const { data: j2Data } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'j2',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});

	const { data: c2Data } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'c2',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});
	console.log("🚀 ~ PlayMoveForm ~ c2Data:", c2Data)

	const { data: stakeData } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'stake',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});
	console.log('🚀 ~ PlayMoveForm ~ stakeData:', stakeData);

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

	const handleRevealMove = async () => {
		setError(null);

		if (!contractAddress || contractAddress.trim().length === 0) {
			setError('Please enter a contract address');
			return;
		}

		if (!isAddress(contractAddress)) {
			setError('Invalid contract address');
			return;
		}

		if (yourMove === null) {
			setError("Please enter your move to calculate result");
			return;
		}

		if (!address) {
			setError('Please connect your wallet');
			return;
		}

		console.log('🚀 ~ handleRevealMove ~ j1Data:', j1Data);
		console.log('🚀 ~ handleRevealMove ~ j2Data:', j2Data);
		console.log('🚀 ~ handleRevealMove ~ c2Data:', c2Data);
		console.log('🚀 ~ handleRevealMove ~ stakeData:', stakeData);
		if (!j1Data || !j2Data || !stakeData) {
			setError('Failed to read contract data. Please try again.');
			return;
		}

		// Check if we are player 1 (the one who created the game)
		if ((j1Data as string).toLowerCase() !== address.toLowerCase()) {
			setError('Only the game creator (Player 1) can reveal their move');
			return;
		}

		// Check if player 2 has already played
		if ((c2Data as number) === 0) {
			setError("Player 2 hasn't played yet");
			return;
		}

		try {
			// Retrieve game data from localStorage using contract address as key
			const gameData = getGameDataByAddress(contractAddress);
			console.log('🚀 ~ handleRevealMove ~ gameData:', gameData);
			// if (!gameData) {
			// 	setError('Game data not found. Make sure you created this game.');
			// 	return;
			// }

			const { move: yourMove, salt } = gameData;

			// Call the solve function on the contract
			// const salt = '69349484593542972304635356719251858778965769238419088392771497576324667704853'
			console.log('🚀 ~ handleRevealMove ~ salt:', salt);
			const a = await writeContract({
				address: contractAddress as `0x${string}`,
				abi: RPSabi,
				functionName: 'solve',
				args: [yourMove, BigInt(salt)],
			});

			// Calculate result for UI display
			const result = calculateResult(yourMove, c2Data as number);
			const stakeInEth = (Number(stakeData) / 1e18).toString();

			setRevealed({
				contractAddress,
				yourMove,
				opponentMove: c2Data as number,
				result,
				stake: stakeInEth,
			});
		} catch (err) {
			console.error('Error revealing move:', err);
			setError(err instanceof Error ? err.message : 'Failed to reveal move');
		}
	};

	// Handle successful transaction
	useEffect(() => {
		if (isConfirmed && revealed) {
			// Add a small delay to let user see the result
			const timer = setTimeout(() => {
				// Reset form after successful reveal
				setContractAddress('');
				setYourMove(null);
			}, 3000); // 3 seconds delay

			return () => clearTimeout(timer);
		}
	}, [isConfirmed]); // Only depend on isConfirmed, not revealed

	const getResultColor = (result: string) => {
		switch (result) {
			case 'win':
				return 'bg-green-500/10 border-green-500/30 text-green-300';
			case 'loss':
				return 'bg-red-500/10 border-red-500/30 text-red-300';
			case 'draw':
				return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
			default:
				return 'bg-slate-500/10 border-slate-500/30 text-slate-300';
		}
	};

	const getResultMessage = (result: string) => {
		switch (result) {
			case 'win':
				return 'You Won!';
			case 'loss':
				return 'You Lost';
			case 'draw':
				return "It's a Draw";
			default:
				return 'Unknown';
		}
	};

	return (
		<div className="space-y-6">
			{/* Contract Address Input */}
			<div>
				<label className="mb-2 block text-sm font-medium text-white">
					Contract Address to Reveal
				</label>
				<Input
					type="text"
					placeholder="0x..."
					value={contractAddress}
					onChange={(e) => setContractAddress(e.target.value)}
					className="border-purple-500/20 bg-slate-800/50 text-white placeholder:text-slate-500"
					disabled={isLoading}
				/>
				<p className="mt-1 text-xs text-slate-400">
					Enter the contract address of the game you created
				</p>
			</div>

			{/* Opponent Move Selection */}
			<div>
				<label className="mb-3 block text-sm font-medium text-white">
					Your Move
				</label>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
					{[1, 2, 3, 4, 5].map((move) => (
						<button
							key={move}
							onClick={() => setYourMove(move)}
							disabled={isLoading}
							className={`rounded-lg border-2 p-4 text-center transition-all disabled:opacity-50 ${
								yourMove === move
									? 'border-purple-500 bg-purple-500/20'
									: 'border-purple-500/20 bg-slate-800/50 hover:border-purple-500/50'
							}`}
						>
							<div className="text-2xl">{MOVE_EMOJIS[move]}</div>
							<div className="mt-2 text-xs font-medium text-purple-300">
								{MOVE_NAMES[move]}
							</div>
						</button>
					))}
				</div>
				<p className="mt-2 text-xs text-slate-400">
					Select the move your played
				</p>
			</div>

			{/* Info Card */}
			{/* <Card className="border-blue-500/30 bg-blue-500/10 p-4">
				<p className="text-sm text-blue-300">
					<span className="font-semibold">How it works:</span> Enter the
					opponent's move and your commitment will be revealed on-chain. The
					smart contract will verify your move matches the commitment and
					calculate the result.
				</p>
			</Card> */}

			{error && (
				<Alert className="border-red-500/30 bg-red-500/10">
					<AlertDescription className="text-red-300">{error}</AlertDescription>
				</Alert>
			)}

			{revealed && (
				<Card className={`border-2 p-6 ${getResultColor(revealed.result)}`}>
					<div className="space-y-4">
						<div className="text-center">
							<p className="text-sm font-semibold">
								{getResultMessage(revealed.result)}
							</p>
							<p className="text-3xl font-bold">
								{revealed.result === 'win'
									? '🎉'
									: revealed.result === 'loss'
									? '😔'
									: '🤝'}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-lg bg-slate-800/50 p-3 text-center">
								<p className="text-xs text-slate-400">Your Move</p>
								<p className="mt-2 text-2xl">
									{MOVE_EMOJIS[revealed.yourMove]}
								</p>
								<p className="mt-1 text-xs font-medium text-purple-300">
									{MOVE_NAMES[revealed.yourMove]}
								</p>
							</div>
							<div className="rounded-lg bg-slate-800/50 p-3 text-center">
								<p className="text-xs text-slate-400">Opponent's Move</p>
								<p className="mt-2 text-2xl">
									{MOVE_EMOJIS[revealed.opponentMove]}
								</p>
								<p className="mt-1 text-xs font-medium text-purple-300">
									{MOVE_NAMES[revealed.opponentMove]}
								</p>
							</div>
						</div>

						<div className="space-y-2 text-xs">
							<p className="text-slate-300">
								<span className="font-medium">
									{MOVE_NAMES[revealed.yourMove]}:
								</span>{' '}
								{getMoveDescription(revealed.yourMove)}
							</p>
							<p className="text-slate-300">
								<span className="font-medium">
									{MOVE_NAMES[revealed.opponentMove]}:
								</span>{' '}
								{getMoveDescription(revealed.opponentMove)}
							</p>
						</div>

						{revealed.result === 'win' && (
							<div className="rounded-lg bg-green-500/20 p-3 text-center">
								<p className="text-sm font-semibold text-green-300">
									You won {revealed.stake} ETH!
								</p>
							</div>
						)}
						{revealed.result === 'loss' && (
							<div className="rounded-lg bg-red-500/20 p-3 text-center">
								<p className="text-sm font-semibold text-red-300">
									You lost {revealed.stake} ETH
								</p>
							</div>
						)}
						{revealed.result === 'draw' && (
							<div className="rounded-lg bg-yellow-500/20 p-3 text-center">
								<p className="text-sm font-semibold text-yellow-300">
									Draw! Your {revealed.stake} ETH is returned
								</p>
							</div>
						)}
					</div>
				</Card>
			)}

			<Button
				onClick={handleRevealMove}
				disabled={isLoading || !contractAddress || yourMove === null}
				className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
			>
				{isLoading ? 'Revealing Move...' : 'Reveal Move & Calculate Result'}
			</Button>
		</div>
	);
}
