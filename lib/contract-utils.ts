import { ethers } from 'ethers';

// RPS Contract ABI (simplified for game creation and joining)
export const RPS_ABI = [
	'function createGame(bytes32 commitment, address opponent, uint256 stake) payable returns (uint256)',
	'function joinGame(uint256 gameId, uint256 move) payable',
	'function revealMove(uint256 gameId, uint256 move, bytes32 salt)',
	'function claimTimeout(uint256 gameId)',
	'function getGameState(uint256 gameId) view returns (tuple(address player1, address player2, bytes32 commitment, uint256 move2, uint256 stake, uint256 status, uint256 createdAt))',
];

// Game states
export const GAME_STATES = {
	CREATED: 0,
	JOINED: 1,
	REVEALED: 2,
	COMPLETED: 3,
	CLAIMED: 4,
};

// Move mappings
export const MOVES = {
	ROCK: 1,
	PAPER: 2,
	SCISSORS: 3,
	SPOCK: 4,
	LIZARD: 5,
};

export const MOVE_NAMES: Record<number, string> = {
	1: 'ROCK',
	2: 'PAPER',
	3: 'SCISSORS',
	4: 'SPOCK',
	5: 'LIZARD',
};

export const MOVE_EMOJIS: Record<number, string> = {
	1: '🪨',
	2: '📄',
	3: '✂️',
	4: '🖖',
	5: '🦎',
};

// Create commitment hash for move
export function createCommitment(move: number, salt: string): string {
	return ethers.keccak256(
		ethers.solidityPacked(['uint256', 'bytes32'], [move, salt])
	);
}

// Generate random salt
export function generateSalt(): string {
	return ethers.hexlify(ethers.randomBytes(32));
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
	return ethers.isAddress(address);
}

// Format address for display
export function formatAddress(address: string): string {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Store game data locally for later reveal
export function storeGameData(
	commitment: string,
	move: number,
	salt: string,
	opponent: string,
	stake: string
): void {
	const gameData = {
		commitment,
		move,
		salt,
		opponent,
		stake,
		createdAt: new Date().toISOString(),
	};
	localStorage.setItem(`game_${commitment}`, JSON.stringify(gameData));
}

// Retrieve game data
export function getGameData(commitment: string): any {
	const data = localStorage.getItem(`game_${commitment}`);
	return data ? JSON.parse(data) : null;
}

// Store game data by contract address for easier retrieval
export function storeGameDataByAddress(
	contractAddress: string,
	move: number,
	salt: string,
	opponent: string,
	stake: string
): void {
	const gameData = {
		contractAddress,
		move,
		salt,
		opponent,
		stake,
		createdAt: new Date().toISOString(),
	};
	localStorage.setItem(`contract_${contractAddress}`, JSON.stringify(gameData));
}

// Retrieve game data by contract address
export function getGameDataByAddress(contractAddress: string): any {
	const data = localStorage.getItem(`game_${contractAddress}`);
	return data ? JSON.parse(data) : null;
}

// Delete game data after completion
export function deleteGameData(key: string): void {
	localStorage.removeItem(`game_${key}`);
}

// Delete game data by contract address
export function deleteGameDataByAddress(contractAddress: string): void {
	localStorage.removeItem(`contract_${contractAddress}`);
}

// Get all stored games
export function getAllStoredGames(): any[] {
	const games = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && (key.startsWith('game_') || key.startsWith('contract_'))) {
			const data = localStorage.getItem(key);
			if (data) {
				games.push({
					key,
					...JSON.parse(data),
				});
			}
		}
	}
	return games;
}

// Validate move selection
export function isValidMove(move: number): boolean {
	return Object.values(MOVES).includes(move);
}

// Get move name safely
export function getMoveName(move: number): string {
	return MOVE_NAMES[move] || 'UNKNOWN';
}

// Get move emoji safely
export function getMoveEmoji(move: number): string {
	return MOVE_EMOJIS[move] || '❓';
}

// Calculate gas estimate for contract deployment (placeholder)
export function estimateDeploymentGas(): bigint {
	// This would typically call estimateGas on the contract
	// For now, return a reasonable estimate
	return BigInt(2000000); // 2M gas
}

// Format stake amount for display
export function formatStake(stake: string | number): string {
	const stakeNum = typeof stake === 'string' ? parseFloat(stake) : stake;
	if (stakeNum < 0.001) {
		return `${stakeNum.toFixed(6)} ETH`;
	} else if (stakeNum < 1) {
		return `${stakeNum.toFixed(4)} ETH`;
	} else {
		return `${stakeNum.toFixed(3)} ETH`;
	}
}

// Convert Wei to ETH string
export function weiToEth(wei: bigint | string): string {
	const weiValue = typeof wei === 'string' ? BigInt(wei) : wei;
	return (Number(weiValue) / 1e18).toString();
}

// Convert ETH to Wei
export function ethToWei(eth: string | number): bigint {
	const ethValue = typeof eth === 'string' ? parseFloat(eth) : eth;
	return BigInt(Math.floor(ethValue * 1e18));
}

// RPS Contract Bytecode (placeholder - would be the actual compiled bytecode)
export const RPS_BYTECODE =
	'0x608060405234801561001057600080fd5b506040516102bc3803806102bc8339810180604052604081101561003357600080fd5b810190808051906020019092919080519060200190929190505050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600181905550505061021f806100a76000396000f3fe';

// RPS Contract Constructor ABI
export const RPS_CONSTRUCTOR_ABI = [
	{
		inputs: [
			{
				name: '_c1Hash',
				type: 'bytes32',
			},
			{
				name: '_j2',
				type: 'address',
			},
		],
		payable: true,
		stateMutability: 'payable',
		type: 'constructor',
	},
];

// Factory Contract ABI (if using factory pattern)
export const FACTORY_ABI = [
	'function createGame(bytes32 _c1Hash, address _j2) payable returns (address)',
	'function getGamesByPlayer(address player) view returns (address[])',
	'function gameCount() view returns (uint256)',
];


// Validate deployment parameters
export function validateDeploymentParams(
	commitment: string,
	opponent: string,
	stake: string
): { isValid: boolean; error?: string } {
	if (!commitment || commitment.length !== 66) {
		return { isValid: false, error: 'Invalid commitment hash' };
	}

	if (!ethers.isAddress(opponent)) {
		return { isValid: false, error: 'Invalid opponent address' };
	}

	const stakeNum = parseFloat(stake);
	if (isNaN(stakeNum) || stakeNum <= 0) {
		return { isValid: false, error: 'Invalid stake amount' };
	}

	return { isValid: true };
}

// Generate deployment transaction data
export function generateDeploymentData(
	commitment: string,
	opponent: string
): string {
	// This would generate the deployment transaction data
	// For now, return a placeholder
	return (
		RPS_BYTECODE +
		ethers
			.solidityPacked(['bytes32', 'address'], [commitment, opponent])
			.slice(2)
	);
}
