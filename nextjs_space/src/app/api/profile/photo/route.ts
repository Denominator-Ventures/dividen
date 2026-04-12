export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';

// POST: Get presigned URL for profile photo upload
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const body = await request.json();
  const { fileName, contentType } = body;

  if (!fileName || !contentType) {
    return NextResponse.json({ success: false, error: 'fileName and contentType required' }, { status: 400 });
  }

  // Validate content type
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ success: false, error: 'Only image files are allowed' }, { status: 400 });
  }

  try {
    // Profile photos are public (displayed in chat, profiles, etc.)
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      `profile-${userId}-${fileName}`,
      contentType,
      true // public
    );

    return NextResponse.json({
      success: true,
      uploadUrl,
      cloud_storage_path,
    });
  } catch (err: any) {
    console.error('Failed to generate presigned URL:', err);
    return NextResponse.json({ success: false, error: 'Failed to generate upload URL' }, { status: 500 });
  }
}

// PUT: Confirm upload and save URL to user record
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const body = await request.json();
  const { cloud_storage_path } = body;

  if (!cloud_storage_path) {
    return NextResponse.json({ success: false, error: 'cloud_storage_path required' }, { status: 400 });
  }

  try {
    const publicUrl = await getFileUrl(cloud_storage_path, true);
    await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: publicUrl },
    });

    return NextResponse.json({ success: true, profilePhotoUrl: publicUrl });
  } catch (err: any) {
    console.error('Failed to save profile photo:', err);
    return NextResponse.json({ success: false, error: 'Failed to save profile photo' }, { status: 500 });
  }
}

// DELETE: Remove profile photo
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: null },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to remove profile photo:', err);
    return NextResponse.json({ success: false, error: 'Failed to remove profile photo' }, { status: 500 });
  }
}
