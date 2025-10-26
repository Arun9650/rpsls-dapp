'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RPSabi } from '@/constants/abi';
import { formatAddress } from '@/lib/contract-utils';
import { formatTimeRemaining } from '@/lib/timeout-utils';
import { useEffect, useState } from 'react';
import { isAddress } from 'viem';
import {
	useAccount,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';

interface TimeoutClaimFormProps {
	account: string;
}

interface TimeoutGame {
	contractAddress: string;
	player1: string;
	player2: string;
	stake: string;
	lastAction: bigint;
	gameState: 'created' | 'joined' | 'revealed';
	timeRemaining: number;
	canPlayerClaim: boolean;
}

export function TimeoutClaimForm({ account }: TimeoutClaimFormProps) {
	const { address } = useAccount();
	const [contractAddress, setContractAddress] = useState('');
	const [gameInfo, setGameInfo] = useState<TimeoutGame | null>(null);
	const [claimed, setClaimed] = useState<{
		contractAddress: string;
		amount: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [timeRemaining, setTimeRemaining] = useState<number>(0);

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

	const { data: stakeData } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'stake',
		query: { enabled: !!contractAddress && isAddress(contractAddress) },
	});

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

	const { data: timeoutData } = useReadContract({
		address: contractAddress as `0x${string}`,
		abi: RPSabi,
		functionName: 'TIMEOUT',
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

	// Update time remaining every second
	useEffect(() => {
		if (!gameInfo || !address) return;

		const interval = setInterval(() => {
			const currentTime = Math.floor(Date.now() / 1000);
			const elapsed = currentTime - Number(gameInfo.lastAction);
			const timeoutSeconds = Number(timeoutData) || 300; // Default 5 minutes if not available
			const remaining = Math.max(0, timeoutSeconds - elapsed);
			setTimeRemaining(remaining);

			// Update gameInfo when timeout is reached
			if (remaining <= 0 && !gameInfo.canPlayerClaim) {
				const isPlayer1 =
					gameInfo.player1.toLowerCase() === address.toLowerCase();
				const isPlayer2 =
					gameInfo.player2.toLowerCase() === address.toLowerCase();
				const canPlayerClaim = isPlayer1 || isPlayer2;

				setGameInfo((prev) =>
					prev
						? {
								...prev,
								timeRemaining: 0,
								canPlayerClaim,
						  }
						: null
				);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [gameInfo, timeoutData, address]);

	const handleFetchGameInfo = async () => {
		setError(null);

		if (!contractAddress || contractAddress.trim().length === 0) {
			setError('Please enter a contract address');
			return;
		}

		if (!isAddress(contractAddress)) {
			setError('Invalid contract address');
			return;
		}

		if (!address) {
			setError('Please connect your wallet');
			return;
		}

		try {
			// Wait for contract data to be available
			if (j1Data && stakeData !== undefined && lastActionData !== undefined) {
				const player1 = j1Data as string;
				const player2 =
					(j2Data as string) || '0x0000000000000000000000000000000000000000';
				const hasPlayer2 =
					player2 !== '0x0000000000000000000000000000000000000000';
				const c2Move = (c2Data as number) || 0;

				// Determine game state
				let gameState: 'created' | 'joined' | 'revealed' = 'created';
				if (hasPlayer2) {
					gameState = c2Move > 0 ? 'joined' : 'joined';
				}

				// Calculate time remaining
				const currentTime = Math.floor(Date.now() / 1000);
				const elapsed = currentTime - Number(lastActionData);
				const timeoutSeconds = Number(timeoutData) || 300; // Default 5 minutes
				const remaining = Math.max(0, timeoutSeconds - elapsed);

				// Determine if current user can claim timeout
				const isPlayer1 = player1.toLowerCase() === address.toLowerCase();
				const isPlayer2 = player2.toLowerCase() === address.toLowerCase();
				const canPlayerClaim = (isPlayer1 || isPlayer2) && remaining <= 0;

				setGameInfo({
					contractAddress,
					player1,
					player2,
					stake: (Number(stakeData) / 1e18).toString(),
					lastAction: lastActionData as bigint,
					gameState,
					timeRemaining: remaining,
					canPlayerClaim,
				});

				setTimeRemaining(remaining);
			}
		} catch (err) {
			console.error('Error fetching game info:', err);
			setError('Game not found or invalid contract address');
			setGameInfo(null);
		}
	};

	const handleClaimTimeout = async () => {
		setError(null);

		if (!gameInfo) {
			setError('Please fetch game info first');
			return;
		}

		if (!gameInfo.canPlayerClaim) {
			setError('Timeout has not been reached yet or you are not a participant');
			return;
		}

		if (!address) {
			setError('Please connect your wallet');
			return;
		}

		try {
			const isPlayer1 =
				gameInfo.player1.toLowerCase() === address.toLowerCase();
			const isPlayer2 =
				gameInfo.player2.toLowerCase() === address.toLowerCase();

			// Determine which timeout function to call
			if (isPlayer1) {
				// Player 1 claims timeout (j1Timeout)
				writeContract({
					address: contractAddress as `0x${string}`,
					abi: RPSabi,
					functionName: 'j1Timeout',
					args: [],
				});
			} else if (isPlayer2) {
				// Player 2 claims timeout (j2Timeout)
				writeContract({
					address: contractAddress as `0x${string}`,
					abi: RPSabi,
					functionName: 'j2Timeout',
					args: [],
				});
			} else {
				setError('You are not a participant in this game');
				return;
			}
		} catch (err) {
			console.error('Error claiming timeout:', err);
			setError(err instanceof Error ? err.message : 'Failed to claim timeout');
		}
	};

	// Handle successful transaction
	if (isConfirmed && gameInfo && !claimed) {
		setClaimed({
			contractAddress: gameInfo.contractAddress,
			amount: gameInfo.stake,
		});
		setContractAddress('');
		setGameInfo(null);
	}

	const canClaim = gameInfo && gameInfo.canPlayerClaim;

	return (
		<div className="space-y-6">
			{/* Contract Address Input */}
			<div>
				<label className="mb-2 block text-sm font-medium text-white">
					Contract Address
				</label>
				<div className="flex gap-2">
					<Input
						type="text"
						placeholder="0x..."
						value={contractAddress}
						onChange={(e) => setContractAddress(e.target.value)}
						className="border-purple-500/20 bg-slate-800/50 text-white placeholder:text-slate-500"
						disabled={isLoading || !!gameInfo}
					/>
					<Button
						onClick={handleFetchGameInfo}
						disabled={isLoading || !contractAddress || !!gameInfo}
						variant="outline"
						className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 bg-transparent"
					>
						{isLoading ? 'Loading...' : 'Fetch'}
					</Button>
				</div>
				<p className="mt-1 text-xs text-slate-400">
					Enter the contract address to check timeout status
				</p>
			</div>

			{/* Game Info Display */}
			{gameInfo && (
				<Card className="border-blue-500/30 bg-blue-500/10 p-4">
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<p className="text-sm font-semibold text-blue-300">
								Game Information
							</p>
							<span
								className={`rounded px-2 py-1 text-xs font-medium ${
									canClaim
										? 'bg-red-500/20 text-red-300'
										: 'bg-yellow-500/20 text-yellow-300'
								}`}
							>
								{canClaim ? 'Timeout Reached' : 'Active'}
							</span>
						</div>

						<div className="space-y-2 text-xs text-blue-200">
							<p>
								<span className="font-medium">Contract:</span>{' '}
								{gameInfo.contractAddress.slice(0, 10)}...
							</p>
							<p>
								<span className="font-medium">Player 1:</span>{' '}
								{formatAddress(gameInfo.player1)}
							</p>
							<p>
								<span className="font-medium">Player 2:</span>{' '}
								{gameInfo.player2 !==
								'0x0000000000000000000000000000000000000000'
									? formatAddress(gameInfo.player2)
									: 'Not joined'}
							</p>
							<p>
								<span className="font-medium">Stake:</span> {gameInfo.stake} ETH
							</p>
							<p>
								<span className="font-medium">Game State:</span>{' '}
								{gameInfo.gameState}
							</p>
						</div>

						<div className="border-t border-blue-500/20 pt-3">
							<p className="text-xs text-blue-300">
								<span className="font-medium">Time Remaining:</span>{' '}
								<span className="font-mono text-sm">
									{canClaim
										? 'Timeout reached'
										: formatTimeRemaining(timeRemaining)}
								</span>
							</p>
						</div>
					</div>
				</Card>
			)}

			{/* Info Card */}
			<Card className="border-purple-500/30 bg-purple-500/10 p-4">
				<p className="text-sm text-purple-300">
					<span className="font-semibold">Timeout Mechanism:</span> If your
					opponent doesn't respond within 5 min, you can claim their stake. This
					protects you from abandoned games.
				</p>
			</Card>

			{error && (
				<Alert className="border-red-500/30 bg-red-500/10">
					<AlertDescription className="text-red-300">{error}</AlertDescription>
				</Alert>
			)}

			{claimed && (
				<Card className="border-green-500/30 bg-green-500/10 p-4">
					<div className="space-y-2">
						<p className="text-sm font-semibold text-green-300">
							Timeout Claimed Successfully!
						</p>
						<div className="space-y-1 text-xs text-green-200">
							<p>
								<span className="font-medium">Contract:</span>{' '}
								{claimed.contractAddress.slice(0, 10)}...
							</p>
							<p>
								<span className="font-medium">Amount Claimed:</span>{' '}
								{claimed.amount} ETH
							</p>
						</div>
						<p className="mt-3 text-xs text-green-300">
							The opponent's stake has been transferred to your account.
						</p>
					</div>
				</Card>
			)}

			<div className="flex gap-3">
				<Button
					onClick={handleFetchGameInfo}
					disabled={isLoading || !contractAddress || !!gameInfo}
					variant="outline"
					className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 bg-transparent"
				>
					Check Status
				</Button>
				<Button
					onClick={handleClaimTimeout}
					disabled={isLoading || !canClaim}
					className={`flex-1 ${
						canClaim
							? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
							: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 opacity-50'
					}`}
				>
					{isLoading ? 'Claiming...' : 'Claim Timeout'}
				</Button>
			</div>
		</div>
	);
}
