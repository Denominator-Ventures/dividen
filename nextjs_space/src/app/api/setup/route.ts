export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const TERMS_VERSION = '1.0';

const setupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  acceptedTerms: z.boolean().optional(),
});

// GET: Check if setup is needed (also doubles as health check)
export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      success: true,
      data: { needsSetup: userCount === 0, userCount },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Database connection failed. Check your DATABASE_URL.' },
      { status: 500 }
    );
  }
}

// POST: Create a new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = setupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, acceptedTerms } = result.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // First user gets admin role, subsequent users get 'user' role
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'admin' : 'user';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
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
    console.error('Setup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Account creation failed' },
      { status: 500 }
    );
  }
}
