import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import FederatedDeveloperView from './FederatedDeveloperView';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

function parseJson(val: string | null, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // slug format: "developerName--instanceId" (double-dash separator)
  const agent = await prisma.marketplaceAgent.findFirst({
    where: { slug: params.slug, sourceInstanceId: { not: null } },
    select: { developerName: true, sourceInstanceUrl: true },
  });
  if (!agent) return { title: 'Developer Not Found' };
  const hostname = agent.sourceInstanceUrl ? new URL(agent.sourceInstanceUrl).hostname : 'Federated';
  return {
    title: `${agent.developerName} · ${hostname} | DiviDen`,
    description: `View ${agent.developerName}'s federated developer profile on DiviDen`,
  };
}

export default async function FederatedDeveloperPage({ params }: Props) {
  // Find the agent by slug (this is the agent slug that the link came from)
  const agent = await prisma.marketplaceAgent.findFirst({
    where: { slug: params.slug, sourceInstanceId: { not: null } },
    select: {
      developerName: true,
      developerUrl: true,
      sourceInstanceId: true,
      sourceInstanceUrl: true,
    },
  });

  if (!agent || !agent.sourceInstanceId) notFound();

  // Fetch instance info
  const instance = await prisma.instanceRegistry.findUnique({
    where: { id: agent.sourceInstanceId },
    select: {
      id: true, name: true, baseUrl: true, metadata: true,
      agentCount: true, createdAt: true,
    },
  });

  // Fetch all agents from this developer on this instance
  const allAgents = await prisma.marketplaceAgent.findMany({
    where: {
      sourceInstanceId: agent.sourceInstanceId,
      developerName: agent.developerName,
      status: 'active',
    },
    select: {
      id: true, name: true, slug: true, description: true,
      category: true, pricingModel: true, pricePerTask: true,
      subscriptionPrice: true, avgRating: true, totalRatings: true,
      totalExecutions: true, version: true, tags: true,
      supportsA2A: true, supportsMCP: true,
    },
    orderBy: { totalExecutions: 'desc' },
  });

  // Fetch federated capabilities from this instance
  const capabilities = await prisma.marketplaceCapability.findMany({
    where: {
      sourceInstanceId: agent.sourceInstanceId,
      approvalStatus: 'approved',
      status: 'active',
    },
    select: {
      id: true, name: true, slug: true, description: true,
      category: true, icon: true, pricingModel: true, price: true,
      avgRating: true, totalPurchases: true,
    },
    orderBy: { totalPurchases: 'desc' },
    take: 20,
  });

  const hostname = agent.sourceInstanceUrl ? (() => { try { return new URL(agent.sourceInstanceUrl!).hostname; } catch { return 'Unknown'; } })() : 'Unknown';
  const instanceMeta = parseJson(instance?.metadata || null, {});

  return (
    <FederatedDeveloperView
      developer={{
        name: agent.developerName,
        url: agent.developerUrl,
        instanceName: instance?.name || hostname,
        instanceUrl: agent.sourceInstanceUrl || '',
        instanceType: instanceMeta.instanceType || 'self-hosted',
        instanceDescription: instanceMeta.description || null,
        instanceAgentCount: instance?.agentCount || 0,
        memberSince: instance?.createdAt?.toISOString() || null,
      }}
      agents={allAgents.map((a: any) => ({
        id: a.id, name: a.name, slug: a.slug, description: a.description,
        category: a.category, pricingModel: a.pricingModel,
        price: a.pricePerTask || a.subscriptionPrice || null,
        avgRating: a.avgRating, totalRatings: a.totalRatings,
        totalExecutions: a.totalExecutions, version: a.version,
        tags: parseJson(a.tags),
        supportsA2A: a.supportsA2A, supportsMCP: a.supportsMCP,
      }))}
      capabilities={capabilities.map((c: any) => ({
        id: c.id, name: c.name, slug: c.slug, description: c.description,
        category: c.category, icon: c.icon, pricingModel: c.pricingModel,
        price: c.price, avgRating: c.avgRating, totalPurchases: c.totalPurchases,
      }))}
    />
  );
}
