// Game result calculation (aligned with Solidity enum order)
export function calculateResult(
	move1: number,
	move2: number
): 'win' | 'loss' | 'draw' {
	if (move1 === move2) return 'draw';

	// Corrected winning combinations for Solidity's enum order
	// 1: Rock, 2: Paper, 3: Scissors, 4: Spock, 5: Lizard
	const winningMoves: Record<number, number[]> = {
		1: [3, 5], // Rock crushes Scissors & crushes Lizard
		2: [1, 4], // Paper covers Rock & disproves Spock
		3: [2, 5], // Scissors cuts Paper & decapitates Lizard
		4: [1, 3], // Spock vaporizes Rock & smashes Scissors
		5: [2, 4], // Lizard eats Paper & poisons Spock
	};

	console.log('🚀 calculateResult:', { move1, move2, winsOver: winningMoves[move1] });

	return winningMoves[move1]?.includes(move2) ? 'win' : 'loss';
}

// Corrected move descriptions
export function getMoveDescription(move: number): string {
	const descriptions: Record<number, string> = {
		1: 'Rock crushes Scissors & crushes Lizard',
		2: 'Paper covers Rock & disproves Spock',
		3: 'Scissors cuts Paper & decapitates Lizard',
		4: 'Spock vaporizes Rock & smashes Scissors',
		5: 'Lizard eats Paper & poisons Spock',
	};
	return descriptions[move] || '';
}
