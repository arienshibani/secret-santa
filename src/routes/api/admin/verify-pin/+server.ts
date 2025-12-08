import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase/server';
import { createAdminSession, setAdminSessionCookie } from '$lib/auth/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { eventName, pin } = await request.json();

		if (!eventName || !pin || typeof pin !== 'string' || pin.length !== 6) {
			return json({ error: 'Invalid request' }, { status: 400 });
		}

		// Fetch admin config using service role (bypasses RLS)
		const { data: config, error } = await supabaseAdmin
			.from('admin_config')
			.select('pin')
			.eq('event_name', eventName)
			.single();

		if (error || !config) {
			// Don't reveal if event exists or not
			return json({ valid: false }, { status: 200 });
		}

		// Server-side PIN validation
		const isValid = config.pin === pin;

		if (isValid) {
			const sessionToken = createAdminSession(eventName);
			setAdminSessionCookie({ cookies } as any, sessionToken);
			return json({ valid: true });
		} else {
			return json({ valid: false }, { status: 200 });
		}
	} catch (error) {
		console.error('Error verifying PIN:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

