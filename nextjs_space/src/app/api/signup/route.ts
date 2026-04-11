import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TERMS_VERSION = '1.0';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, acceptedTerms } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        passwordHash,
        role: 'admin',
        mode: 'cockpit',
        ...(acceptedTerms ? {
          acceptedTermsAt: new Date(),
          termsVersion: TERMS_VERSION,
        } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: { userId: user.id, email: user.email },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Signup failed' },
      { status: 500 }
    );
  }
}
