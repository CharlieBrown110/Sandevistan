import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/tournaments/store';
import { generateDefaultUsername, registerSession, removeSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { all: string[] } }) {
  const path = params.all?.join('/') || '';

  // Get current session endpoint
  if (path === 'session') {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }
    const user = store.getUser(token.replace('sess_', ''));
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
      },
    });
  }

  return NextResponse.json({ status: 'ok' });
}

export async function POST(req: NextRequest, { params }: { params: { all: string[] } }) {
  const path = params.all?.join('/') || '';

  // Demo / Fast Cyberpunk Sign-in (for testing without external OAuth credentials)
  if (path === 'sign-in/demo' || path === 'demo-login') {
    const body = await req.json().catch(() => ({}));
    const customName = body.name || 'David Martinez';
    const customUsername = body.username || generateDefaultUsername(customName);
    const userId = body.id || `usr_${Date.now().toString(36)}`;

    const user = store.upsertUser({
      id: userId,
      name: customName,
      email: body.email || `${customUsername}@edgerunners.nc`,
      image: body.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${customUsername}`,
      username: customUsername,
    });

    const token = `sess_${user.id}`;
    registerSession(token, {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      username: user.username,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
      },
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return res;
  }

  // Sign out endpoint
  if (path === 'sign-out' || path === 'logout') {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      removeSession(token);
    }
    const res = NextResponse.json({ success: true });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  return NextResponse.json({ status: 'ok' });
}
