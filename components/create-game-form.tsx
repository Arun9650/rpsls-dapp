'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { config } from '@/config';
import { HasherAbi, RPSabi } from '@/constants/abi';
import { byteCodehasher } from '@/constants/byteCodeHasher';
import { byteCodeRPS } from '@/constants/byteCodeRSP';
import {
	MOVES,
	MOVE_EMOJIS,
	MOVE_NAMES,
	formatAddress,
} from '@/lib/contract-utils';
import {
	deployContract,
	readContract,
	waitForTransactionReceipt,
} from '@wagmi/core';
import { useState } from 'react';
import { toast } from 'sonner';
import { isAddress, parseEther } from 'viem';
import {
	useAccount,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';

interface CreateGameFormProps {
	account: string;
}

type LoadingStep =
	| 'idle'
	| 'deploying-hasher'
	| 'waiting-hasher'
	| 'generating-commitment'
	| 'deploying-rps'
	| 'waiting-rps'
	| 'storing-data'
	| 'completed';

export function CreateGameForm({ account }: CreateGameFormProps) {
	const { address } = useAccount();
	const [selectedMove, setSelectedMove] = useState<number | null>(null);
	const [stake, setStake] = useState('');
	const [opponent, setOpponent] = useState('');
	const [gameCreated, setGameCreated] = useState<{
		commitment: string;
		contractAddress: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
	const [hasherTxHash, setHasherTxHash] = useState<string | null>(null);
	const [rpsTxHash, setRpsTxHash] = useState<string | null>(null);

	const { data: hash, isPending: isWritePending } = useWriteContract();

	const { isLoading: isConfirming, isSuccess: isConfirmed } =
		useWaitForTransactionReceipt({
			hash,
		});

	const isLoading = loadingStep !== 'idle' && loadingStep !== 'completed';

	const getLoadingMessage = (): string => {
		switch (loadingStep) {
			case 'deploying-hasher':
				return 'Deploying Hasher Contract...';
			case 'waiting-hasher':
				return 'Waiting for Hasher Contract confirmation...';
			case 'generating-commitment':
				return 'Generating commitment hash...';
			case 'deploying-rps':
				return 'Deploying RPS Game Contract...';
			case 'waiting-rps':
				return 'Waiting for Game Contract confirmation...';
			case 'storing-data':
				return 'Storing game data...';
			default:
				return 'Processing...';
		}
	};

	const getButtonText = (): string => {
		if (loadingStep === 'idle') return 'Create Game';
		return getLoadingMessage();
	};

	const handleCreateGame = async () => {
		setError(null);
		setLoadingStep('idle');

		// Validation
		if (!selectedMove) {
			setError('Please select a move');
			return;
		}
		if (!stake || !validateStakeAmount(stake)) {
			setError('Please enter a valid stake amount (0.000001 - 10 ETH)');
			return;
		}
		if (!opponent || !isAddress(opponent)) {
			setError('Please enter a valid opponent address');
			return;
		}
		if (!address) {
			setError('Please connect your wallet');
			return;
		}
		if (opponent.toLowerCase() === address.toLowerCase()) {
			setError('You cannot play against yourself');
			return;
		}

		// Check sufficient balance
		const hasSufficientBalance = await checkSufficientBalance(stake);
		if (!hasSufficientBalance) {
			setError('Insufficient ETH balance for this stake amount');
			return;
		}

		try {
			await deployHasherContract();
		} catch (err) {
			console.error('Error creating game:', err);
			setError(err instanceof Error ? err.message : 'Failed to create game');
			setLoadingStep('idle');
		}
	};

	const generateSaltWeb = async (): Promise<bigint> => {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		const hexString =
			'0x' +
			Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
		return BigInt(hexString);
	};

	// Function to deploy a new RPS contract
	const deployHasherContract = async () => {
		try {
			setLoadingStep('deploying-hasher');

			const salt = await generateSaltWeb();
			console.log('Generated salt:', salt.toString());

			// Deploy Hasher Contract
			const hasherTxHash = await deployContract(config, {
				abi: HasherAbi,
				bytecode: byteCodehasher as `0x${string}`,
				account: address,
				gas: BigInt(570560),
			});

			setHasherTxHash(hasherTxHash);
			console.log('🚀 ~ deployHasherContract ~ hasherTxHash:', hasherTxHash);

			setLoadingStep('waiting-hasher');

			// Wait for hasher deployment
			const hasherReceipt = await waitForTransactionReceipt(config, {
				hash: hasherTxHash,
			});

			const hasherAddress = hasherReceipt.contractAddress;
			console.log('Hasher deployed at:', hasherAddress);

			if (hasherAddress && selectedMove !== null) {
				setLoadingStep('generating-commitment');

				// Generate commitment hash
				const commitmentHash = await readContract(config, {
					abi: HasherAbi,
					address: hasherAddress as `0x${string}`,
					functionName: 'hash',
					args: [selectedMove, salt],
				});

				console.log('Commitment hash:', commitmentHash);

				setLoadingStep('deploying-rps');

				// Deploy RPS Contract
				const rpsTxHash = await deployContract(config, {
					abi: RPSabi,
					bytecode: byteCodeRPS as `0x${string}`,
					account: address,
					gas: BigInt(5705600),
					value: parseEther(stake),
					args: [commitmentHash, opponent as `0x${string}`],
				});

				setRpsTxHash(rpsTxHash);
				console.log('🚀 ~ deployHasherContract ~ rpsTxHash:', rpsTxHash);

				setLoadingStep('waiting-rps');

				// Wait for RPS deployment
				const rpsReceipt = await waitForTransactionReceipt(config, {
					hash: rpsTxHash,
				});

				console.log(
					'🚀 ~ deployHasherContract ~ RSPTransactionHash:',
					rpsReceipt.contractAddress
				);

				const RSPContractAddress = rpsReceipt.contractAddress as string;

				setLoadingStep('storing-data');

				// Store the game data for later use
				storeGameDataWithSalt(
					RSPContractAddress,
					selectedMove,
					salt,
					commitmentHash as string
				);

				// Add small delay for better UX
				await new Promise((resolve) => setTimeout(resolve, 500));

				setLoadingStep('completed');

				setGameCreated({
					commitment: commitmentHash as string,
					contractAddress: RSPContractAddress as string,
				});

				// Reset form
				setSelectedMove(null);
				setStake('');
				setOpponent('');

				// Show success toast
				toast.success(
					'🎮 Game created successfully! Share the contract address with your opponent.'
				);
			}
		} catch (error) {
			console.error('Deployment error:', error);
			setLoadingStep('idle');
			throw error;
		}
	};

	// Add this function to store the game data for later revelation
	const storeGameDataWithSalt = (
		contractAddress: string,
		move: number,
		salt: bigint,
		commitment: string
	) => {
		const gameData = {
			move,
			salt: salt.toString(), // Store as string to avoid JSON serialization issues
			commitment,
			timestamp: Date.now(),
		};

		localStorage.setItem(`game_${contractAddress}`, JSON.stringify(gameData));
		console.log('Stored game data for address:', contractAddress, gameData);
	};

	// Simulate contract deployment (replace with real deployment when bytecode is available)
	const simulateContractDeployment = async (
		commitment: string,
		opponentAddress: string,
		stakeAmount: string
	): Promise<string> => {
		// Simulate deployment delay
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Generate a deterministic-looking address based on inputs
		const hash = await crypto.subtle.digest(
			'SHA-256',
			new TextEncoder().encode(
				commitment + opponentAddress + stakeAmount + Date.now()
			)
		);
		const hashArray = Array.from(new Uint8Array(hash));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		return `0x${hashHex.slice(0, 40)}`;
	};

	// Real contract deployment function (for when you have the contract bytecode)
	const deployRealRPSContract = async (
		commitment: string,
		opponentAddress: string,
		stakeAmount: string
	) => {
		// This would be the real implementation with contract bytecode
		// Example implementation:
		/*
        writeContract({
            abi: RPS_DEPLOYMENT_ABI,
            bytecode: RPS_BYTECODE,
            args: [commitment, opponentAddress],
            value: parseEther(stakeAmount),
        });
        */

		// For now, use the simulation
		return simulateContractDeployment(commitment, opponentAddress, stakeAmount);
	};

	// Validate stake amount
	const validateStakeAmount = (amount: string): boolean => {
		const stake = parseFloat(amount);
		return stake >= 0.000001 && stake <= 10; // Min 0.000001 ETH, Max 10 ETH
	};

	// Format stake display
	const formatStakeDisplay = (amount: string): string => {
		const stake = parseFloat(amount);
		if (isNaN(stake)) return '0 ETH';
		return `${stake.toFixed(4)} ETH`;
	};

	// Check if user has sufficient balance (placeholder)
	const checkSufficientBalance = async (
		stakeAmount: string
	): Promise<boolean> => {
		// In a real implementation, you would check the user's ETH balance
		// For now, assume user has sufficient balance
		return true;
	};

	// Handle successful contract deployment
	const handleSuccessfulDeployment = (
		contractAddress: string,
		commitment: string
	) => {
		setGameCreated({
			commitment,
			contractAddress,
		});

		// Reset form
		setSelectedMove(null);
		setStake('');
		setOpponent('');

		// Optional: Show success notification
		console.log(`Game created successfully at ${contractAddress}`);
	};

	// Handle successful transaction (for when real deployment is implemented)
	if (isConfirmed && !gameCreated) {
		// This would be called when a real contract deployment succeeds
		// The contract address would come from the transaction receipt
	}

	return (
		<div className="space-y-6">
			{/* Loading Progress Card */}
			{isLoading && (
				<Card className="border-blue-500/30 bg-blue-500/10 p-4">
					<div className="space-y-3">
						<div className="flex items-center space-x-3">
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
							<p className="text-sm font-medium text-blue-300">
								{getLoadingMessage()}
							</p>
						</div>

						{/* Progress Steps */}
						<div className="space-y-2">
							<div className="flex items-center space-x-2 text-xs">
								<div
									className={`h-2 w-2 rounded-full ${
										[
											'deploying-hasher',
											'waiting-hasher',
											'generating-commitment',
											'deploying-rps',
											'waiting-rps',
											'storing-data',
											'completed',
										].includes(loadingStep)
											? 'bg-green-500'
											: 'bg-gray-500'
									}`}
								></div>
								<span className="text-slate-400">Deploy Hasher Contract</span>
								{hasherTxHash && (
									<span className="text-blue-400">
										({hasherTxHash.slice(0, 10)}...)
									</span>
								)}
							</div>

							<div
								className={`flex items-center space-x-2 text-xs transition-opacity ${
									[
										'generating-commitment',
										'deploying-rps',
										'waiting-rps',
										'storing-data',
										'completed',
									].includes(loadingStep)
										? 'opacity-100'
										: 'opacity-50'
								}`}
							>
								<div
									className={`h-2 w-2 rounded-full ${
										[
											'generating-commitment',
											'deploying-rps',
											'waiting-rps',
											'storing-data',
											'completed',
										].includes(loadingStep)
											? 'bg-green-500'
											: 'bg-gray-500'
									}`}
								></div>
								<span className="text-slate-400">Generate Commitment</span>
							</div>

							<div
								className={`flex items-center space-x-2 text-xs transition-opacity ${
									[
										'deploying-rps',
										'waiting-rps',
										'storing-data',
										'completed',
									].includes(loadingStep)
										? 'opacity-100'
										: 'opacity-50'
								}`}
							>
								<div
									className={`h-2 w-2 rounded-full ${
										[
											'deploying-rps',
											'waiting-rps',
											'storing-data',
											'completed',
										].includes(loadingStep)
											? 'bg-green-500'
											: 'bg-gray-500'
									}`}
								></div>
								<span className="text-slate-400">Deploy Game Contract</span>
								{rpsTxHash && (
									<span className="text-blue-400">
										({rpsTxHash.slice(0, 10)}...)
									</span>
								)}
							</div>

							<div
								className={`flex items-center space-x-2 text-xs transition-opacity ${
									['storing-data', 'completed'].includes(loadingStep)
										? 'opacity-100'
										: 'opacity-50'
								}`}
							>
								<div
									className={`h-2 w-2 rounded-full ${
										['storing-data', 'completed'].includes(loadingStep)
											? 'bg-green-500'
											: 'bg-gray-500'
									}`}
								></div>
								<span className="text-slate-400">Store Game Data</span>
							</div>
						</div>
					</div>
				</Card>
			)}

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

			{/* Stake Input */}
			<div>
				<label className="mb-2 block text-sm font-medium text-white">
					Stake (ETH)
				</label>
				<Input
					type="number"
					placeholder="0.01"
					value={stake}
					onChange={(e) => setStake(e.target.value)}
					className="border-purple-500/20 bg-slate-800/50 text-white placeholder:text-slate-500"
					step="0.001"
					min="0"
					disabled={isLoading}
				/>
				<p className="mt-1 text-xs text-slate-400">
					Minimum stake: 0.000001 ETH
				</p>
			</div>

			{/* Opponent Address Input */}
			<div>
				<label className="mb-2 block text-sm font-medium text-white">
					Opponent Address
				</label>
				<Input
					type="text"
					placeholder="0x..."
					value={opponent}
					onChange={(e) => setOpponent(e.target.value)}
					className="border-purple-500/20 bg-slate-800/50 text-white placeholder:text-slate-500"
					disabled={isLoading}
				/>
				<p className="mt-1 text-xs text-slate-400">
					Enter the Ethereum address of your opponent
				</p>
			</div>

			{error && (
				<Alert className="border-red-500/30 bg-red-500/10">
					<AlertDescription className="text-red-300">{error}</AlertDescription>
				</Alert>
			)}

			{gameCreated && (
				<Card className="border-green-500/30 bg-green-500/10 p-4">
					<div className="space-y-2">
						<p className="text-sm font-semibold text-green-300">
							Game Created Successfully!
						</p>
						<div className="space-y-1 text-xs text-green-200">
							<p>
								<span className="font-medium">Contract Address:</span>{' '}
								{gameCreated.contractAddress}
							</p>
							<p>
								<span className="font-medium">Your Move:</span>{' '}
								{selectedMove !== null ? MOVE_NAMES[selectedMove] : ''}{' '}
								{selectedMove !== null ? MOVE_EMOJIS[selectedMove] : ''}
							</p>
							<p>
								<span className="font-medium">Stake:</span> {stake} ETH
							</p>
							<p>
								<span className="font-medium">Opponent:</span>{' '}
								{formatAddress(opponent)}
							</p>
						</div>
						<p className="mt-3 text-xs text-green-300">
							Share the Contract Address with your opponent so they can join.
							Your move is securely committed and will be revealed after they
							join.
						</p>
					</div>
				</Card>
			)}

			<Button
				onClick={handleCreateGame}
				disabled={isLoading || !selectedMove}
				className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
			>
				{isLoading && (
					<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
				)}
				{getButtonText()}
			</Button>
		</div>
	);
}
