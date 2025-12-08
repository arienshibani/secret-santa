import { supabase } from './client';
import type { Participant, AdminConfig, ParticipantFormData } from '$lib/utils/types';

export const createParticipants = async (
	participants: ParticipantFormData[],
	eventName: string
): Promise<Participant[]> => {
	const { data, error } = await supabase
		.from('participants')
		.insert(
			participants.map((p) => ({
				event_name: eventName,
				name: p.name,
				email: p.email || null,
				sms: p.sms || null,
				token: crypto.randomUUID(),
				gift_ready: false
			}))
		)
		.select();

	if (error) throw error;
	return data as Participant[];
};

export const updateAssignments = async (
	assignments: { participantId: string; assignedToId: string }[]
): Promise<void> => {
	const updates = assignments.map((a) => ({
		id: a.participantId,
		assigned_to_id: a.assignedToId
	}));

	for (const update of updates) {
		const { error } = await supabase
			.from('participants')
			.update({ assigned_to_id: update.assigned_to_id })
			.eq('id', update.id);

		if (error) throw error;
	}
};

export const getParticipantByToken = async (token: string): Promise<Participant | null> => {
	const { data, error } = await supabase
		.from('participants')
		.select('*')
		.eq('token', token)
		.single();

	if (error || !data) return null;
	return data as Participant;
};

export const getAssignedParticipant = async (
	assignedToId: string
): Promise<Participant | null> => {
	const { data, error } = await supabase
		.from('participants')
		.select('*')
		.eq('id', assignedToId)
		.single();

	if (error || !data) return null;
	return data as Participant;
};

export const getAllParticipants = async (eventName: string): Promise<Participant[]> => {
	try {
		const response = await fetch(`/api/admin/participants?eventName=${encodeURIComponent(eventName)}`, {
			credentials: 'include' // Important: include cookies for session
		});
		if (!response.ok) {
			if (response.status === 401) {
				throw new Error('Unauthorized - please log in again');
			}
			if (response.status === 403) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Invalid event or session mismatch');
			}
			throw new Error('Failed to fetch participants');
		}
		const data = await response.json();
		return data.participants || [];
	} catch (error) {
		console.error('Error fetching participants:', error);
		throw error;
	}
};

export const updateGiftStatus = async (participantId: string, giftReady: boolean): Promise<void> => {
	const response = await fetch('/api/admin/gift-status', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ participantId, giftReady })
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw new Error('Unauthorized - please log in again');
		}
		const error = await response.json();
		throw new Error(error.error || 'Failed to update gift status');
	}
};

export const updateParticipant = async (
	participantId: string,
	updates: { name?: string; email?: string | null; sms?: string | null }
): Promise<void> => {
	const response = await fetch('/api/admin/participant', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ participantId, updates })
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw new Error('Unauthorized - please log in again');
		}
		const error = await response.json();
		throw new Error(error.error || 'Failed to update participant');
	}
};

// getAdminConfig removed - admin config should only be accessed via server-side API
// Use /api/admin/config endpoint if you need to read admin config (requires authentication)

export const createAdminConfig = async (eventName: string, pin: string): Promise<AdminConfig> => {
	const response = await fetch('/api/admin/create-config', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ eventName, pin })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create admin config');
	}

	const data = await response.json();
	return data.config as AdminConfig;
};

export const verifyAdminPin = async (eventName: string, pin: string): Promise<boolean> => {
	try {
		const response = await fetch('/api/admin/verify-pin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ eventName, pin })
		});
		const data = await response.json();
		return data.valid === true;
	} catch (error) {
		console.error('Error verifying PIN:', error);
		return false;
	}
};

export const clearAllData = async (eventName: string): Promise<void> => {
	const response = await fetch(`/api/admin/clear-data?eventName=${encodeURIComponent(eventName)}`, {
		method: 'DELETE'
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw new Error('Unauthorized - please log in again');
		}
		const error = await response.json();
		throw new Error(error.error || 'Failed to clear data');
	}
};

