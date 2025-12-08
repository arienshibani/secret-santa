import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminSession, clearAdminSessionCookie } from '$lib/auth/session';
import { supabaseAdmin } from '$lib/supabase/server';

export const DELETE: RequestHandler = async (event) => {
	const session = getAdminSession(event);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const eventName = event.url.searchParams.get('eventName');
		if (!eventName || eventName !== session.eventName) {
			return json({ error: 'Invalid event' }, { status: 403 });
		}

		// Delete participants
		const { error: participantsError } = await supabaseAdmin
			.from('participants')
			.delete()
			.eq('event_name', eventName);

		if (participantsError) throw participantsError;

		// Delete admin config
		const { error: adminError } = await supabaseAdmin
			.from('admin_config')
			.delete()
			.eq('event_name', eventName);

		if (adminError) throw adminError;

		// Clear session
		clearAdminSessionCookie(event);

		return json({ success: true });
	} catch (error) {
		console.error('Error clearing data:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

