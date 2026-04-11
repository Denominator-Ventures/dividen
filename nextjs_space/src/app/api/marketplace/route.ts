export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/marketplace — Browse agents (public-facing, but auth required)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const pricing = url.searchParams.get('pricing');
    const status = url.searchParams.get('status') || 'active';
    const featured = url.searchParams.get('featured');
    const sort = url.searchParams.get('sort') || 'popular'; // popular | newest | rating
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const where: any = { status };
    if (category && category !== 'all') where.category = category;
    if (pricing && pricing !== 'all') where.pricingModel = pricing;
    if (featured === 'true') where.featured = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { developerName: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any =
      sort === 'newest' ? { createdAt: 'desc' } :
      sort === 'rating' ? { avgRating: 'desc' } :
      { totalExecutions: 'desc' };

    const [agents, total] = await Promise.all([
      prisma.marketplaceAgent.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true, name: true, slug: true, description: true,
          category: true, tags: true, pricingModel: true,
          pricePerTask: true, subscriptionPrice: true, taskLimit: true,
          status: true, featured: true, totalExecutions: true,
          avgRating: true, totalRatings: true, avgResponseTime: true,
          successRate: true, developerName: true, developerUrl: true,
          supportsA2A: true, supportsMCP: true,
          inputFormat: true, outputFormat: true,
          taskTypes: true, contextInstructions: true,
          createdAt: true,
          _count: { select: { subscriptions: true } },
        },
      }),
      prisma.marketplaceAgent.count({ where }),
    ]);

    return NextResponse.json({ agents, total, limit, offset });
  } catch (error: any) {
    console.error('Marketplace browse error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

// POST /api/marketplace — Register a new agent
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await req.json();

    const {
      name, description, longDescription, endpointUrl,
      authMethod, authHeader, authToken,
      developerName, developerUrl,
      category, tags, inputFormat, outputFormat, samplePrompts,
      pricingModel, pricePerTask, subscriptionPrice, taskLimit, pricingDetails,
      supportsA2A, supportsMCP, agentCardUrl,
      // Agent Integration Kit
      taskTypes, contextInstructions, requiredInputSchema, outputSchema,
      usageExamples, contextPreparation, executionNotes,
    } = body;

    if (!name || !description || !endpointUrl || !developerName) {
      return NextResponse.json(
        { error: 'name, description, endpointUrl, and developerName are required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await prisma.marketplaceAgent.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const agent = await prisma.marketplaceAgent.create({
      data: {
        name,
        slug,
        description,
        longDescription: longDescription || null,
        endpointUrl,
        authMethod: authMethod || 'bearer',
        authHeader: authHeader || null,
        authToken: authToken || null,
        developerId: userId,
        developerName,
        developerUrl: developerUrl || null,
        category: category || 'general',
        tags: tags ? JSON.stringify(tags) : null,
        inputFormat: inputFormat || 'text',
        outputFormat: outputFormat || 'text',
        samplePrompts: samplePrompts ? JSON.stringify(samplePrompts) : null,
        pricingModel: pricingModel || 'free',
        pricePerTask: pricePerTask ? parseFloat(pricePerTask) : null,
        subscriptionPrice: subscriptionPrice ? parseFloat(subscriptionPrice) : null,
        taskLimit: taskLimit ? parseInt(taskLimit) : null,
        pricingDetails: pricingDetails ? JSON.stringify(pricingDetails) : null,
        supportsA2A: supportsA2A || false,
        supportsMCP: supportsMCP || false,
        agentCardUrl: agentCardUrl || null,
        // Agent Integration Kit
        taskTypes: taskTypes ? JSON.stringify(taskTypes) : null,
        contextInstructions: contextInstructions || null,
        requiredInputSchema: requiredInputSchema || null,
        outputSchema: outputSchema || null,
        usageExamples: usageExamples ? JSON.stringify(usageExamples) : null,
        contextPreparation: contextPreparation ? JSON.stringify(contextPreparation) : null,
        executionNotes: executionNotes || null,
        status: 'active', // auto-approve for Phase 1
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    console.error('Marketplace registration error:', error);
    return NextResponse.json({ error: 'Failed to register agent' }, { status: 500 });
  }
}
