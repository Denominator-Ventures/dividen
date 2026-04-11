/**
 * Contact ↔ Platform User Bridge
 * 
 * Handles auto-linking CRM contacts to platform users when:
 * 1. A new user signs up → scan all contacts for email match
 * 2. An invite is accepted → link the contact to the new/existing user
 * 3. A connection is created → check if either party has a Contact for the other
 * 4. Manual match → user explicitly links a contact to a platform user
 */

import { prisma } from '@/lib/prisma';

/**
 * Scan all contacts across all users for email match and link them.
 * Called when a new user signs up or logs in for the first time.
 * Fire-and-forget — never breaks the caller.
 */
export async function linkContactsByEmail(platformUserId: string, email: string): Promise<number> {
  try {
    if (!email) return 0;

    const normalizedEmail = email.toLowerCase().trim();

    // Find all contacts across all users that match this email
    // but aren't already linked to a platform user
    const result = await prisma.contact.updateMany({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        platformUserId: null,
        // Don't link contacts owned by the user themselves
        NOT: { userId: platformUserId },
      },
      data: {
        platformUserId,
        platformUserStatus: 'matched',
        matchedAt: new Date(),
      },
    });

    if (result.count > 0) {
      console.log(`[contact-bridge] Linked ${result.count} contact(s) to platform user ${platformUserId} via email ${normalizedEmail}`);
    }

    return result.count;
  } catch (err) {
    console.error('[contact-bridge] Error linking contacts by email:', err);
    return 0;
  }
}

/**
 * When a connection is created between two users, check if either has
 * a CRM contact for the other and link it.
 */
export async function linkContactsOnConnection(
  userAId: string,
  userAEmail: string,
  userBId: string,
  userBEmail: string
): Promise<void> {
  try {
    // User A might have a Contact for User B
    if (userBEmail) {
      await prisma.contact.updateMany({
        where: {
          userId: userAId,
          email: { equals: userBEmail.toLowerCase().trim(), mode: 'insensitive' },
          platformUserId: null,
        },
        data: {
          platformUserId: userBId,
          platformUserStatus: 'confirmed',
          matchedAt: new Date(),
        },
      });
    }

    // User B might have a Contact for User A
    if (userAEmail) {
      await prisma.contact.updateMany({
        where: {
          userId: userBId,
          email: { equals: userAEmail.toLowerCase().trim(), mode: 'insensitive' },
          platformUserId: null,
        },
        data: {
          platformUserId: userAId,
          platformUserStatus: 'confirmed',
          matchedAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.error('[contact-bridge] Error linking contacts on connection:', err);
  }
}

/**
 * Mark a contact as "invited" when an invitation is sent to their email.
 */
export async function markContactAsInvited(
  ownerUserId: string,
  inviteeEmail: string
): Promise<void> {
  try {
    if (!inviteeEmail) return;

    await prisma.contact.updateMany({
      where: {
        userId: ownerUserId,
        email: { equals: inviteeEmail.toLowerCase().trim(), mode: 'insensitive' },
        platformUserId: null,
        platformUserStatus: null,
      },
      data: {
        platformUserStatus: 'invited',
      },
    });
  } catch (err) {
    console.error('[contact-bridge] Error marking contact as invited:', err);
  }
}

/**
 * Get platform user info for a contact (if linked).
 * Returns basic user data for display in CRM views.
 */
export async function getContactPlatformUser(contactId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      platformUserId: true,
      platformUserStatus: true,
      matchedAt: true,
      platformUser: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: {
              headline: true,
              capacity: true,
              visibility: true,
            },
          },
        },
      },
    },
  });

  return contact;
}
