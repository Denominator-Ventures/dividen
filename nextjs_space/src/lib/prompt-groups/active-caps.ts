import { prisma } from '../prisma';

export async function buildActiveCapabilitiesContext(userId: string): Promise<string> {
  try {
    const capabilities = await prisma.agentCapability.findMany({
      where: { userId },
    });

    if (capabilities.length === 0) return '';

    let text = '## Active Outbound Capabilities\n';
    text += 'The operator has configured the following outbound capabilities. Use them proactively when appropriate.\n\n';

    for (const cap of capabilities) {
      let rawRules = cap.rules as unknown;
      // rules may be stored as a JSON string — parse it if so
      if (typeof rawRules === 'string') {
        try { rawRules = JSON.parse(rawRules); } catch { rawRules = []; }
      }
      const rules = Array.isArray(rawRules) ? rawRules : [];
      let rawConfig = cap.config as unknown;
      if (typeof rawConfig === 'string') {
        try { rawConfig = JSON.parse(rawConfig as string); } catch { rawConfig = {}; }
      }
      const config = (rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)) ? rawConfig as Record<string, any> : {};
      const enabledRules = rules.filter((r: any) => r.enabled !== false);

      text += `### ${cap.name} (${cap.status})\n`;
      text += `- Identity: ${cap.identity === 'operator' ? 'Send as user' : cap.identity === 'agent' ? 'Send as Divi (agent email)' : 'Both — you decide'}\n`;

      if (cap.identity === 'agent' || cap.identity === 'both') {
        if (config.agentEmail) {
          text += `- Agent email: ${config.agentEmail}\n`;
        }
      }

      if (enabledRules.length > 0) {
        text += `- Rules:\n`;
        for (const rule of enabledRules) {
          text += `  - ${rule.label || rule.text || JSON.stringify(rule)}\n`;
        }
      }

      if (cap.status === 'paused') {
        text += `⚠️ This capability is PAUSED — do NOT use it until the operator re-enables it.\n`;
      }
      text += '\n';
    }

    return text.trim();
  } catch (err) {
    console.error('buildActiveCapabilitiesContext error:', err);
    return '';
  }
}
