import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminSession } from '$lib/auth/session';
import { supabaseAdmin } from '$lib/supabase/server';

export const PATCH: RequestHandler = async (event) => {
	const session = getAdminSession(event);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { participantId, giftReady } = await event.request.json();

		if (typeof participantId !== 'string' || typeof giftReady !== 'boolean') {
			return json({ error: 'Invalid request' }, { status: 400 });
		}

		// Verify participant belongs to the event
		const { data: participant, error: fetchError } = await supabaseAdmin
			.from('participants')
			.select('event_name')
			.eq('id', participantId)
			.single();

		if (fetchError || !participant || participant.event_name !== session.eventName) {
			return json({ error: 'Participant not found' }, { status: 404 });
		}

		const { error } = await supabaseAdmin
			.from('participants')
			.update({ gift_ready: giftReady })
			.eq('id', participantId);

		if (error) throw error;
		return json({ success: true });
	} catch (error) {
		console.error('Error updating gift status:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

