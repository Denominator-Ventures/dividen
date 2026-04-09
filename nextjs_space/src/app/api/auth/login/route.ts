import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logRequest, logError, getClientIp } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const start = Date.now();
  const ip = getClientIp(request.headers);
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    logRequest({ userId: user.id, ip, method: 'POST', path: '/api/auth/login', statusCode: 200, duration: Date.now() - start });
    return NextResponse.json({
      success: true,
      data: { userId: user.id, email: user.email, name: user.name },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    logError({ ip, path: '/api/auth/login', method: 'POST', errorMessage: error?.message || 'Unknown', errorStack: error?.stack });
    logRequest({ ip, method: 'POST', path: '/api/auth/login', statusCode: 500, duration: Date.now() - start });
    return NextResponse.json(
      { success: false, error: error?.message || 'Login failed' },
      { status: 500 }
    );
  }
}
