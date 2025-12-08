import type { Participant } from './types';

/**
 * Creates a derangement (permutation with no fixed points) to ensure:
 * 1. No self-assignments
 * 2. No duplicate assignments (each person is assigned to exactly one other person)
 * 
 * Algorithm: Creates a circular permutation by shuffling and assigning each person
 * to the next in the shuffled array. This guarantees uniqueness since each shuffled
 * person appears exactly once as a target.
 */
export const shuffleAssignments = (participants: Participant[]): Map<string, string> => {
	if (participants.length < 2) {
		throw new Error('Need at least 2 participants');
	}

	// Special case: 2 participants - they must assign to each other
	if (participants.length === 2) {
		const assignments = new Map<string, string>();
		assignments.set(participants[0].id, participants[1].id);
		assignments.set(participants[1].id, participants[0].id);
		return assignments;
	}

	const assignments = new Map<string, string>();
	
	// Create a shuffled copy for assignment targets
	// This ensures randomness while maintaining the circular structure
	const shuffled = [...participants];
	
	// Fisher-Yates shuffle
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	// Create circular assignments: each participant gets the next person in shuffled array
	// This guarantees uniqueness because each shuffled person appears exactly once
	for (let i = 0; i < participants.length; i++) {
		const participant = participants[i];
		const nextIndex = (i + 1) % shuffled.length;
		const assignedTo = shuffled[nextIndex];
		
		assignments.set(participant.id, assignedTo.id);
	}

	// Handle self-assignments (can occur if participant[i] == shuffled[i+1])
	// Fix by swapping with another assignment
	for (const [participantId, assignedToId] of assignments.entries()) {
		if (participantId === assignedToId) {
			// Find a participant who is not assigned to themselves and not assigned to this participant
			let swapped = false;
			for (const [otherId, otherAssigned] of assignments.entries()) {
				if (otherId !== participantId && 
				    otherAssigned !== participantId && 
				    otherId !== assignedToId &&
				    otherAssigned !== otherId) {
					// Swap: this participant gets other's assignment, other gets this participant
					assignments.set(participantId, otherAssigned);
					assignments.set(otherId, assignedToId);
					swapped = true;
					break;
				}
			}
			
			// If swap didn't work (edge case), regenerate
			if (!swapped) {
				console.warn('Could not fix self-assignment, regenerating...');
				return shuffleAssignments(participants);
			}
		}
	}

	// Final validation: ensure no duplicates and no self-assignments
	const assignedToIds = Array.from(assignments.values());
	const uniqueAssignedToIds = new Set(assignedToIds);
	
	if (assignedToIds.length !== uniqueAssignedToIds.size) {
		throw new Error('CRITICAL: Duplicate assignments detected! This should never happen.');
	}
	
	for (const [participantId, assignedToId] of assignments.entries()) {
		if (participantId === assignedToId) {
			throw new Error('CRITICAL: Self-assignment detected! This should never happen.');
		}
	}

	// Verify all participants have assignments
	if (assignments.size !== participants.length) {
		throw new Error('CRITICAL: Not all participants have assignments!');
	}

	return assignments;
};


