import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearAdminSessionCookie } from '$lib/auth/session';

export const POST: RequestHandler = async (event) => {
	clearAdminSessionCookie(event);
	return json({ success: true });
};

