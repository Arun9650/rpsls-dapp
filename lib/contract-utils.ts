import { encodePacked, isAddress, keccak256, toHex } from 'viem';

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

// Create commitment hash for move using viem
export function createCommitment(move: number, salt: string): string {
	return keccak256(
		encodePacked(['uint256', 'bytes32'], [BigInt(move), salt as `0x${string}`])
	);
}

// Generate random salt using Web Crypto API
export function generateSalt(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return toHex(array);
}

// Generate salt as BigInt for contract interactions
export function generateSaltBigInt(): bigint {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	const hexString = toHex(array);
	return BigInt(hexString);
}

// Validate Ethereum address using viem
export function isValidAddress(address: string): boolean {
	return isAddress(address);
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
	salt: string | bigint,
	opponent: string,
	stake: string
): void {
	const gameData = {
		contractAddress,
		move,
		salt: typeof salt === 'bigint' ? salt.toString() : salt,
		opponent,
		stake,
		createdAt: new Date().toISOString(),
	};
	localStorage.setItem(`game_${contractAddress}`, JSON.stringify(gameData));
}

// Retrieve game data by contract address
export function getGameDataByAddress(contractAddress: string): {
	contractAddress: string;
	move: number;
	salt: string;
	opponent: string;
	stake: string;
	createdAt: string;
} | null {
	const data = localStorage.getItem(`game_${contractAddress}`);
	return data ? JSON.parse(data) : null;
}

// Convert hex string to BigInt for contract calls
export function hexToBigInt(hex: string): bigint {
	return BigInt(hex);
}

// Convert BigInt to hex string for storage
export function bigIntToHex(value: bigint): string {
	return toHex(value);
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

// Utility to create a random bytes32 value
export function randomBytes32(): `0x${string}` {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return toHex(array);
}

// Utility to pad hex strings to 32 bytes
export function padTo32Bytes(hex: string): `0x${string}` {
	if (hex.startsWith('0x')) {
		hex = hex.slice(2);
	}
	const padded = hex.padStart(64, '0');
	return `0x${padded}`;
}
