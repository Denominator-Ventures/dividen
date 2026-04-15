import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authLimiter, getRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const TERMS_VERSION = '1.0';

export async function POST(request: NextRequest) {
  // Rate limit: 10 signup attempts per minute per IP
  const rlKey = getRateLimitKey(request, 'signup');
  const rlResult = authLimiter.check(rlKey);
  if (!rlResult.allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again shortly.' },
      { status: 429, headers: authLimiter.headers(rlResult) }
    );
  }

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

    // Fire-and-forget: link CRM contacts + create onboarding project
    import('@/lib/contact-platform-bridge').then(({ linkContactsByEmail }) => {
      linkContactsByEmail(user.id, user.email).catch(() => {});
    });
    import('@/lib/onboarding-project').then(({ createOnboardingProject }) => {
      createOnboardingProject(prisma, user.id).catch((e) => console.error('Onboarding project creation:', e));
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
