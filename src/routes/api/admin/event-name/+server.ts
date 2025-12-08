import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminSession, createAdminSession, setAdminSessionCookie } from '$lib/auth/session';
import { supabaseAdmin } from '$lib/supabase/server';

export const PATCH: RequestHandler = async (event) => {
	const session = getAdminSession(event);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { oldEventName, newEventName } = await event.request.json();

		if (!oldEventName || !newEventName || typeof newEventName !== 'string') {
			return json({ error: 'Invalid request' }, { status: 400 });
		}

		if (oldEventName !== session.eventName) {
			return json({ error: 'Invalid event' }, { status: 403 });
		}

		// Validate new event name (not empty, reasonable length)
		const trimmedNewName = newEventName.trim();
		if (!trimmedNewName || trimmedNewName.length > 100) {
			return json({ error: 'Invalid event name' }, { status: 400 });
		}

		// Check if new event name already exists
		const { data: existing } = await supabaseAdmin
			.from('admin_config')
			.select('id')
			.eq('event_name', trimmedNewName)
			.single();

		if (existing) {
			return json({ error: 'Event name already exists' }, { status: 409 });
		}

		// Update admin_config event_name
		const { error: adminError } = await supabaseAdmin
			.from('admin_config')
			.update({ event_name: trimmedNewName })
			.eq('event_name', oldEventName);

		if (adminError) throw adminError;

		// Update participants event_name
		const { error: participantsError } = await supabaseAdmin
			.from('participants')
			.update({ event_name: trimmedNewName })
			.eq('event_name', oldEventName);

		if (participantsError) throw participantsError;

		// Update session with new event name
		const newSessionToken = createAdminSession(trimmedNewName);
		setAdminSessionCookie(event, newSessionToken);

		return json({ success: true, newEventName: trimmedNewName });
	} catch (error: any) {
		console.error('Error updating event name:', error);
		if (error.code === '23505') {
			// Unique constraint violation
			return json({ error: 'Event name already exists' }, { status: 409 });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

