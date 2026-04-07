export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAvailableProvider } from '@/lib/llm';

// POST: Import LinkedIn profile data (user pastes text or JSON)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const { linkedinText, linkedinUrl } = await request.json();

  if (!linkedinText) {
    return NextResponse.json({ success: false, error: 'Please paste your LinkedIn profile text' }, { status: 400 });
  }

  // Use LLM to parse the pasted LinkedIn profile into structured data
  const apiConfig = await getAvailableProvider(undefined, userId);
  if (!apiConfig) {
    return NextResponse.json({ success: false, error: 'No API key configured. Add an API key in Settings to use LinkedIn import.' }, { status: 400 });
  }
  const baseUrl = apiConfig.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com/v1';
  const model = apiConfig.provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307';

  const systemPrompt = `You are a profile data extractor. Given raw LinkedIn profile text, extract structured data.
Return ONLY valid JSON with these fields (use empty arrays/null for missing data):
{
  "headline": "string or null",
  "bio": "string or null - the About section",
  "skills": ["string"],
  "experience": [{"title": "string", "company": "string", "startYear": number, "endYear": number|null, "description": "string|null"}],
  "education": [{"institution": "string", "degree": "string", "field": "string|null", "year": number|null}],
  "certifications": ["string"],
  "languages": [{"language": "string", "proficiency": "native|fluent|conversational|basic"}]
}
Do NOT include any explanation, markdown, or text outside the JSON.`;

  try {
    const response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this LinkedIn profile:\n\n${linkedinText}` },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('LLM API error:', err);
      return NextResponse.json({ success: false, error: 'Failed to parse LinkedIn data' }, { status: 500 });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```(?:json)?\n?/g, '').replace(/```$/g, '').trim();
    }
    
    const parsed = JSON.parse(jsonStr);

    // Build update data
    const updateData: Record<string, any> = {};
    if (parsed.headline) updateData.headline = parsed.headline;
    if (parsed.bio) updateData.bio = parsed.bio;
    if (parsed.skills?.length) updateData.skills = JSON.stringify(parsed.skills);
    if (parsed.experience?.length) updateData.experience = JSON.stringify(parsed.experience);
    if (parsed.education?.length) updateData.education = JSON.stringify(parsed.education);
    if (parsed.languages?.length) updateData.languages = JSON.stringify(parsed.languages);
    if (linkedinUrl) updateData.linkedinUrl = linkedinUrl;
    updateData.linkedinData = JSON.stringify({ raw: linkedinText, parsed, importedAt: new Date().toISOString() });

    await prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        user: { connect: { id: userId } },
        capacity: 'available',
        visibility: 'connections',
        sharedSections: JSON.stringify(['professional', 'lived_experience', 'availability', 'values', 'superpowers']),
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      imported: parsed,
      message: 'LinkedIn data imported successfully. Review and edit as needed.',
    });
  } catch (e: any) {
    console.error('LinkedIn import error:', e);
    return NextResponse.json({ success: false, error: 'Failed to parse LinkedIn data: ' + (e.message || 'Unknown error') }, { status: 500 });
  }
}
