export const dynamic = 'force-dynamic';

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') || 'DiviDen';
  const subtitle = searchParams.get('subtitle') || 'The Agentic Working Protocol';
  const tag = searchParams.get('tag') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          background: 'linear-gradient(145deg, #0a0a0a 0%, #111827 50%, #0a0a0a 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4F7CFF 0%, #6B9AFF 50%, #4F7CFF 100%)',
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div
            style={{
              fontSize: '48px',
              color: '#4F7CFF',
            }}
          >
            ⬡
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#4F7CFF',
              letterSpacing: '-0.02em',
            }}
          >
            DiviDen
          </div>
          {tag && (
            <div
              style={{
                fontSize: '14px',
                color: '#6B9AFF',
                border: '1px solid rgba(79, 124, 255, 0.3)',
                borderRadius: '9999px',
                padding: '4px 14px',
                marginLeft: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {tag}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 40 ? '48px' : '56px',
            fontWeight: 700,
            color: '#f5f5f5',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            maxWidth: '900px',
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '24px',
            color: '#a1a1a1',
            lineHeight: 1.5,
            maxWidth: '800px',
          }}
        >
          {subtitle}
        </div>

        {/* Bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '80px',
            right: '80px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '16px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            dividen.ai
          </div>
          <div style={{ fontSize: '14px', color: '#444' }}>
            Open Source · MIT License
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
