import jwt from 'jsonwebtoken';
import type { RequestEvent } from '@sveltejs/kit';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

export interface AdminSession {
	eventName: string;
	verifiedAt: number;
}

export const createAdminSession = (eventName: string): string => {
	const session: AdminSession = {
		eventName,
		verifiedAt: Date.now()
	};
	return jwt.sign(session, JWT_SECRET, { expiresIn: SESSION_MAX_AGE });
};

export const verifyAdminSession = (token: string): AdminSession | null => {
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as AdminSession;
		return decoded;
	} catch {
		return null;
	}
};

export const getAdminSession = (event: RequestEvent): AdminSession | null => {
	const cookie = event.cookies.get(SESSION_COOKIE_NAME);
	if (!cookie) return null;
	return verifyAdminSession(cookie);
};

export const setAdminSessionCookie = (event: RequestEvent, token: string) => {
	event.cookies.set(SESSION_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: SESSION_MAX_AGE
	});
};

export const clearAdminSessionCookie = (event: RequestEvent) => {
	event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
};

