import { cookies } from 'next/headers';

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('flipamaz_session');
    if (!sessionCookie) return null;
    
    const raw = Buffer.from(sessionCookie.value, 'base64').toString('utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get session:', e);
    return null;
  }
}

export async function setSession(user) {
  const cookieStore = await cookies();
  const sessionData = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
  const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
  
  cookieStore.set('flipamaz_session', encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('flipamaz_session');
}
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
