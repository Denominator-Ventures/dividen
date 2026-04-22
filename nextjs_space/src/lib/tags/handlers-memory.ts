/* AUTO-EMITTED by extract_tags.ts — Phase 2.1 registry split */
import { prisma } from '../prisma';
import { deduplicatedQueueCreate } from '../queue-dedup';
import { pushRelayStateChanged } from '../webhook-push';
import { getPlatformFeePercent } from '../marketplace-config';
import { checkQueueGate, searchMarketplaceSuggestions } from '../queue-gate';
import { optimizeTaskForAgent } from '../smart-task-prompter';
import { checkAndAutoCompleteCard } from '../card-auto-complete';
import { logActivity } from '../activity';
import type { TagHandlerMap } from './_types';

export const handlers: TagHandlerMap = {
  'update_memory': async (params, userId, name) => {
        if (!params.key || !params.value) {
          return { tag: name, success: false, error: 'Missing key or value' };
        }
        const tier = params.tier || 1;
        const memory = await prisma.memoryItem.upsert({
          where: {
            userId_key: { userId, key: params.key },
          },
          create: {
            tier,
            category: params.category || (tier === 1 ? 'general' : tier === 2 ? 'workflow' : 'preference'),
            key: params.key,
            value: params.value,
            scope: params.scope || null,
            pinned: params.pinned || false,
            priority: params.priority || null,
            confidence: tier === 3 ? (params.confidence ?? 0.5) : null,
            approved: tier === 3 ? null : undefined,
            source: 'agent',
            userId,
          },
          update: {
            value: params.value,
            category: params.category || undefined,
            scope: params.scope !== undefined ? params.scope : undefined,
            pinned: params.pinned !== undefined ? params.pinned : undefined,
            priority: params.priority !== undefined ? params.priority : undefined,
            confidence: params.confidence !== undefined ? params.confidence : undefined,
          },
        });
        return { tag: name, success: true, data: { id: memory.id, key: memory.key, tier } };
      
  },

  'save_learning': async (params, userId, name) => {
        if (!params.observation) {
          return { tag: name, success: false, error: 'Missing observation' };
        }
        // Save as both UserLearning (legacy) and Tier 3 memory
        const learning = await prisma.userLearning.create({
          data: {
            category: params.category || 'preference',
            observation: params.observation,
            confidence: typeof params.confidence === 'number' ? params.confidence : 0.5,
            userId,
          },
        });
        // Also create a Tier 3 memory item
        const patternKey = `learning_${Date.now()}`;
        await prisma.memoryItem.create({
          data: {
            tier: 3,
            category: params.category || 'preference',
            key: patternKey,
            value: params.observation,
            confidence: typeof params.confidence === 'number' ? params.confidence : 0.5,
            approved: null,
            source: 'agent',
            userId,
          },
        });
        return { tag: name, success: true, data: { id: learning.id } };
      
  },

  'setup_webhook': async (params, userId, name) => {
        if (!params.name || !params.type) {
          return { tag: name, success: false, error: 'Missing name or type' };
        }
        const validTypes = ['calendar', 'email', 'transcript', 'generic'];
        const whType = validTypes.includes(params.type) ? params.type : 'generic';
        // Generate a cryptographic secret
        const crypto = await import('crypto');
        const whSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
        const webhook = await prisma.webhook.create({
          data: {
            name: params.name,
            type: whType,
            secret: whSecret,
            url: `/api/webhooks/${whType}`,
            isActive: true,
            userId,
          },
        });
        // Log activity
        await prisma.activityLog.create({
          data: {
            action: 'webhook_created',
            actor: 'divi',
            summary: `Divi created webhook "${params.name}" (${whType})`,
            metadata: JSON.stringify({ webhookId: webhook.id, type: whType }),
            userId,
          },
        }).catch(() => {});
        return {
          tag: name,
          success: true,
          data: {
            id: webhook.id,
            name: webhook.name,
            type: whType,
            secret: whSecret,
            url: webhook.url,
            note: `Webhook created. External services should POST to {your_domain}${webhook.url} with header X-Webhook-Secret: ${whSecret}`,
          },
        };
      
  },

  'save_api_key': async (params, userId, name) => {
        if (!params.provider || !params.apiKey) {
          return { tag: name, success: false, error: 'Missing provider or apiKey' };
        }
        const validProviders = ['openai', 'anthropic'];
        const keyProvider = validProviders.includes(params.provider.toLowerCase())
          ? params.provider.toLowerCase()
          : null;
        if (!keyProvider) {
          return { tag: name, success: false, error: `Invalid provider. Use: ${validProviders.join(', ')}` };
        }
        // Deactivate existing keys for this provider for this user, then create new
        await prisma.agentApiKey.updateMany({
          where: { provider: keyProvider, userId },
          data: { isActive: false },
        });
        const apiKeyRecord = await prisma.agentApiKey.create({
          data: {
            provider: keyProvider,
            apiKey: params.apiKey,
            label: params.label || `${keyProvider} key`,
            isActive: true,
            user: { connect: { id: userId } },
          },
        });
        // Log activity
        await prisma.activityLog.create({
          data: {
            action: 'api_key_saved',
            actor: 'divi',
            summary: `Divi saved ${keyProvider} API key`,
            metadata: JSON.stringify({ provider: keyProvider }),
            userId,
          },
        }).catch(() => {});
        return {
          tag: name,
          success: true,
          data: {
            id: apiKeyRecord.id,
            provider: keyProvider,
            note: `${keyProvider} API key saved and activated. You can now use ${keyProvider === 'openai' ? 'GPT-4o' : 'Claude'} through me.`,
          },
        };
      
  },

  'update_profile': async (params, userId, name) => {
        // params can include any profile field: skills, languages, countriesLived, etc.
        // Merge arrays rather than replace — add new items to existing lists
        const profile = await prisma.userProfile.findUnique({ where: { userId } });
        const parse = (v: string | null, fb: any = []) => { if (!v) return fb; try { return JSON.parse(v); } catch { return fb; } };

        // Map client field names to DB field names
        const fieldRemap: Record<string, string> = { capacityStatus: 'capacity', lifeMilestones: 'lifeExperiences' };
        const jsonFields = ['skills', 'experience', 'education', 'languages', 'countriesLived', 'lifeExperiences', 'volunteering', 'hobbies', 'personalValues', 'superpowers', 'taskTypes', 'outOfOffice'];
        const plainDbFields = ['headline', 'bio', 'linkedinUrl', 'capacity', 'capacityNote', 'timezone', 'workingHours', 'currentTitle', 'currentCompany', 'industry'];

        const data: Record<string, any> = {};

        // Handle plain fields (map client names to DB names)
        for (const [clientName, dbName] of Object.entries(fieldRemap)) {
          if (params[clientName] !== undefined) data[dbName] = params[clientName];
        }
        for (const f of plainDbFields) {
          if (params[f] !== undefined) data[f] = params[f];
        }

        // Handle JSON array fields
        for (const f of jsonFields) {
          const clientField = f === 'lifeExperiences' ? 'lifeMilestones' : f;
          const val = params[f] ?? params[clientField];
          if (val !== undefined) {
            const newItems = Array.isArray(val) ? val : [val];
            if (profile) {
              const existing = parse((profile as any)[f]);
              if (typeof newItems[0] === 'string') {
                const merged = [...new Set([...existing, ...newItems])];
                data[f] = JSON.stringify(merged);
              } else {
                data[f] = JSON.stringify([...existing, ...newItems]);
              }
            } else {
              data[f] = JSON.stringify(newItems);
            }
          }
        }

        if (Object.keys(data).length === 0) {
          return { tag: name, success: false, error: 'No profile fields to update.' };
        }

        await prisma.userProfile.upsert({
          where: { userId },
          update: data,
          create: {
            user: { connect: { id: userId } },
            capacity: 'available',
            visibility: 'connections',
            sharedSections: JSON.stringify(['professional', 'lived_experience', 'availability', 'values', 'superpowers']),
            ...data,
          },
        });

        return { tag: name, success: true, data: { fieldsUpdated: Object.keys(data) } };
      
  },

  'show_settings_widget': async (params, userId, name) => {
        // params: { group: 'working_style' | 'triage' | 'goals' | 'identity' | 'all' }
        const group = params.group || 'all';
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { workingStyle: true, triageSettings: true, goalsEnabled: true, diviName: true },
        });
        if (!user) return { tag: name, success: false, error: 'User not found' };

        const { getSettingsWidgets } = await import('@/lib/onboarding-phases');
        const ws = user.workingStyle ? JSON.parse(String(user.workingStyle)) : null;
        const ts = user.triageSettings ? JSON.parse(String(user.triageSettings)) : null;
        const widgets = getSettingsWidgets(group, ws, ts, user.goalsEnabled, user.diviName || 'Divi');

        return {
          tag: name,
          success: true,
          data: {
            isSettingsWidget: true,
            widgets,
            settingsGroup: group,
            onboardingPhase: -1,
          },
        };
      
  },

  'show_google_connect': async (params, userId, name) => {
        // Returns metadata that ChatView renders as an interactive Google Connect button.
        // Works both during onboarding and in regular chat.
        const identity = params.identity || 'operator';
        const accountIndex = params.accountIndex ?? 0;
        const label = params.label || (identity === 'agent' ? '🤖 Connect Divi\'s Gmail' : '🔗 Connect Gmail & Calendar');
        const description = params.description || 'Grant access to read your email and calendar so Divi can help you manage them.';

        // Check if already connected
        const existingAccount = await prisma.integrationAccount.findFirst({
          where: { userId, identity, service: 'email', isActive: true },
          select: { emailAddress: true },
        });

        return {
          tag: name,
          success: true,
          data: {
            widgetType: 'google_connect',
            identity,
            accountIndex,
            label,
            description,
            connected: !!existingAccount,
            connectedEmail: existingAccount?.emailAddress || null,
          },
        };
      
  },
};

export default handlers;
