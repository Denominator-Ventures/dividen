/**
 * Gemini Meeting Notes Generator
 * 
 * Uses the Gemini API (via user's Google project) to generate structured meeting notes
 * from calendar events and their associated recordings/transcripts.
 * 
 * Requires:
 * - GEMINI_API_KEY in .env (from the user's Google Cloud project)
 * - Calendar event with attendees and metadata
 * - Recording with transcript (optional — generates from event context alone if no transcript)
 */

import { prisma } from './prisma';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface MeetingNotesInput {
  eventTitle: string;
  eventDescription?: string | null;
  startTime: Date;
  endTime?: Date | null;
  attendees?: string | null; // JSON array
  location?: string | null;
  transcript?: string | null;
  recordingSource?: string;
}

interface MeetingNotesOutput {
  summary: string;
  keyDecisions: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    deadline?: string;
  }>;
  topics: string[];
  followUps: string[];
  sentiment: string;
  rawMarkdown: string;
}

/**
 * Generate structured meeting notes using Gemini.
 * Works with or without a transcript — if no transcript, generates contextual notes
 * from event metadata (title, description, attendees).
 */
export async function generateMeetingNotes(input: MeetingNotesInput): Promise<MeetingNotesOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to Settings → Integrations or .env.');
  }

  // Parse attendees
  let attendeeList: string[] = [];
  if (input.attendees) {
    try {
      const parsed = JSON.parse(input.attendees);
      attendeeList = Array.isArray(parsed)
        ? parsed.map((a: any) => typeof a === 'string' ? a : (a.displayName || a.email || a.name || 'Unknown'))
        : [];
    } catch { /* ignore parse errors */ }
  }

  const hasTranscript = !!input.transcript && input.transcript.trim().length > 50;
  const duration = input.endTime
    ? Math.round((input.endTime.getTime() - input.startTime.getTime()) / 60000)
    : null;

  const prompt = hasTranscript
    ? buildTranscriptPrompt(input, attendeeList, duration)
    : buildContextOnlyPrompt(input, attendeeList, duration);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[gemini-meeting-notes] API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('No content in Gemini response');
  }

  // Parse the JSON response
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Fallback: extract from markdown code block if present
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      // Last resort: return raw as markdown
      return {
        summary: content.slice(0, 300),
        keyDecisions: [],
        actionItems: [],
        topics: [],
        followUps: [],
        sentiment: 'neutral',
        rawMarkdown: content,
      };
    }
  }

  return {
    summary: parsed.summary || '',
    keyDecisions: parsed.keyDecisions || parsed.key_decisions || [],
    actionItems: (parsed.actionItems || parsed.action_items || []).map((item: any) => ({
      task: item.task || item.description || item,
      assignee: item.assignee || item.owner || undefined,
      deadline: item.deadline || item.due || undefined,
    })),
    topics: parsed.topics || parsed.discussionTopics || [],
    followUps: parsed.followUps || parsed.follow_ups || [],
    sentiment: parsed.sentiment || 'neutral',
    rawMarkdown: parsed.rawMarkdown || parsed.markdown || buildMarkdown(parsed),
  };
}

function buildTranscriptPrompt(input: MeetingNotesInput, attendees: string[], duration: number | null): string {
  return `You are a professional meeting notes assistant. Analyze this meeting transcript and generate structured notes.

## Meeting Details
- **Title**: ${input.eventTitle}
- **Date**: ${input.startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- **Time**: ${input.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${input.endTime ? ' – ' + input.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
${duration ? `- **Duration**: ${duration} minutes` : ''}
${attendees.length > 0 ? `- **Attendees**: ${attendees.join(', ')}` : ''}
${input.location ? `- **Location**: ${input.location}` : ''}
${input.eventDescription ? `- **Description**: ${input.eventDescription}` : ''}

## Transcript
${input.transcript!.slice(0, 30000)}

## Instructions
Generate a JSON object with these fields:
- "summary": A 2-3 sentence executive summary of the meeting
- "keyDecisions": Array of decisions made during the meeting
- "actionItems": Array of {"task": "...", "assignee": "person name or null", "deadline": "inferred date or null"}
- "topics": Array of main discussion topics
- "followUps": Array of items that need follow-up
- "sentiment": Overall meeting sentiment ("positive", "neutral", "tense", "productive", "inconclusive")
- "rawMarkdown": Full meeting notes in clean markdown format with headers, bullets, and bold for key items

Extract SPECIFIC action items with assignees where possible. Be concise but thorough.`;
}

function buildContextOnlyPrompt(input: MeetingNotesInput, attendees: string[], duration: number | null): string {
  return `You are a professional meeting notes assistant. Based on the meeting context below, generate a meeting preparation/post-meeting template with reasonable inferences.

## Meeting Details
- **Title**: ${input.eventTitle}
- **Date**: ${input.startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- **Time**: ${input.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${input.endTime ? ' – ' + input.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
${duration ? `- **Duration**: ${duration} minutes` : ''}
${attendees.length > 0 ? `- **Attendees**: ${attendees.join(', ')}` : ''}
${input.location ? `- **Location**: ${input.location}` : ''}
${input.eventDescription ? `- **Description**: ${input.eventDescription}` : ''}

## Instructions
No transcript is available. Generate a JSON object with intelligent inferences:
- "summary": A brief description of what this meeting was likely about based on title/description
- "keyDecisions": Empty array (no transcript to extract from)
- "actionItems": Array of suggested follow-up tasks based on the meeting context
- "topics": Array of likely discussion topics inferred from title/description/attendees
- "followUps": Array of standard follow-ups for this type of meeting
- "sentiment": "unknown"
- "rawMarkdown": A meeting notes template in markdown that the user can fill in

Be practical and useful. If the title clearly indicates a type (standup, 1:1, review, demo, etc.), tailor the template accordingly.`;
}

function buildMarkdown(parsed: any): string {
  let md = `# Meeting Notes\n\n`;
  if (parsed.summary) md += `## Summary\n${parsed.summary}\n\n`;
  if (parsed.topics?.length) {
    md += `## Topics Discussed\n`;
    parsed.topics.forEach((t: string) => md += `- ${t}\n`);
    md += '\n';
  }
  if (parsed.keyDecisions?.length) {
    md += `## Key Decisions\n`;
    (parsed.keyDecisions || parsed.key_decisions).forEach((d: string) => md += `- ✅ ${d}\n`);
    md += '\n';
  }
  if (parsed.actionItems?.length || parsed.action_items?.length) {
    md += `## Action Items\n`;
    (parsed.actionItems || parsed.action_items).forEach((a: any) => {
      const task = typeof a === 'string' ? a : a.task;
      const assignee = typeof a === 'object' ? a.assignee : null;
      md += `- [ ] ${task}${assignee ? ` → **${assignee}**` : ''}\n`;
    });
    md += '\n';
  }
  if (parsed.followUps?.length || parsed.follow_ups?.length) {
    md += `## Follow-ups\n`;
    (parsed.followUps || parsed.follow_ups).forEach((f: string) => md += `- ${f}\n`);
  }
  return md;
}

/**
 * Generate meeting notes for a calendar event and optionally link to a recording.
 * Saves notes as a Document and optionally updates the Recording summary.
 */
export async function generateAndSaveMeetingNotes(
  userId: string,
  eventId: string,
  recordingId?: string,
): Promise<{ documentId: string; notes: MeetingNotesOutput }> {
  // Fetch the calendar event
  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
  });
  if (!event) throw new Error('Calendar event not found');

  // Fetch recording transcript if available
  let transcript: string | null = null;
  let recording: any = null;
  if (recordingId) {
    recording = await prisma.recording.findFirst({
      where: { id: recordingId, userId },
    });
    if (recording?.transcript) {
      transcript = recording.transcript;
    }
  }

  // Generate notes
  const notes = await generateMeetingNotes({
    eventTitle: event.title,
    eventDescription: event.description,
    startTime: event.startTime,
    endTime: event.endTime,
    attendees: event.attendees,
    location: event.location,
    transcript,
    recordingSource: recording?.source,
  });

  // Save as a Document
  const doc = await prisma.document.create({
    data: {
      title: `Meeting Notes: ${event.title}`,
      content: notes.rawMarkdown,
      type: 'meeting_notes',
      tags: `gemini,meeting-notes,event:${eventId}${recordingId ? `,recording:${recordingId}` : ''}`,
      userId,
    },
  });

  // Update recording summary if present
  if (recording) {
    await prisma.recording.update({
      where: { id: recording.id },
      data: {
        summary: notes.summary,
        status: 'processed',
      },
    });
  }

  // Link document to the event's card if one exists
  if (event.cardId) {
    // Link document to card as artifact
    try {
      await prisma.cardArtifact.create({
        data: {
          cardId: event.cardId,
          artifactType: 'document',
          artifactId: doc.id,
          label: `Meeting Notes: ${event.title}`,
        },
      });
    } catch { /* ignore if already linked */ }
  }

  // Log the activity
  await prisma.activityLog.create({
    data: {
      action: 'meeting_notes_generated',
      actor: 'divi',
      summary: `Generated meeting notes for "${event.title}" using Gemini`,
      metadata: JSON.stringify({
        eventId,
        documentId: doc.id,
        recordingId: recordingId || null,
        hasTranscript: !!transcript,
        topicCount: notes.topics.length,
        actionItemCount: notes.actionItems.length,
      }),
      userId,
    },
  });

  return { documentId: doc.id, notes };
}
