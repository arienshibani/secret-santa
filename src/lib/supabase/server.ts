import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

if (!PUBLIC_SUPABASE_URL) {
	throw new Error('Missing PUBLIC_SUPABASE_URL');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - required for server-side admin operations');
}

// Server-side client with service role key (bypasses RLS)
// This should NEVER be exposed to the client
export const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

