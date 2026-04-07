import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const setupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// GET: Check if setup is needed
export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      success: true,
      data: { needsSetup: userCount === 0 },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Database connection failed. Check your DATABASE_URL.' },
      { status: 500 }
    );
  }
}

// POST: Create initial admin account
export async function POST(request: NextRequest) {
  try {
    // Check if setup already completed
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Setup already completed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = setupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'admin',
        mode: 'cockpit',
      },
    });

    return NextResponse.json({
      success: true,
      data: { userId: user.id, email: user.email },
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Setup failed' },
      { status: 500 }
    );
  }
}
