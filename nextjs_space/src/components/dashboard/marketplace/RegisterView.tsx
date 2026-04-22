'use client';

import { cn } from '@/lib/utils';
import { CATEGORIES } from './constants';
import type { FeeInfo, RegisterFormState } from './types';

interface RegisterViewProps {
  regForm: RegisterFormState;
  setRegForm: React.Dispatch<React.SetStateAction<RegisterFormState>>;
  regError: string;
  registering: boolean;
  feeInfo: FeeInfo | null;
  onBack: () => void;
  onSubmit: () => void;
}

export function RegisterView({
  regForm,
  setRegForm,
  regError,
  registering,
  feeInfo,
  onBack,
  onSubmit,
}: RegisterViewProps) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        ← Back to Bubble Store
      </button>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white/90 mb-1">🏗️ Register Your Agent</h2>
        <p className="text-xs text-white/40 mb-4">List your agent on the Bubble Store for others to discover and use.</p>

        {regError && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-4">{regError}</div>
        )}

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Agent Name *</label>
              <input
                value={regForm.name}
                onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
                placeholder="My Research Agent"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Developer Name *</label>
              <input
                value={regForm.developerName}
                onChange={e => setRegForm(p => ({ ...p, developerName: e.target.value }))}
                placeholder="Your name or org"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Short Description *</label>
            <input
              value={regForm.description}
              onChange={e => setRegForm(p => ({ ...p, description: e.target.value }))}
              placeholder="One-liner about what your agent does"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Detailed Description</label>
            <textarea
              value={regForm.longDescription}
              onChange={e => setRegForm(p => ({ ...p, longDescription: e.target.value }))}
              placeholder="Full description, capabilities, limitations... (Markdown supported)"
              rows={4}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
            />
          </div>

          {/* Endpoint */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-3">🔌 Connection</h3>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Endpoint URL *</label>
              <input
                value={regForm.endpointUrl}
                onChange={e => setRegForm(p => ({ ...p, endpointUrl: e.target.value }))}
                placeholder="https://your-agent.example.com/api/execute"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Auth Method</label>
                <select
                  value={regForm.authMethod}
                  onChange={e => setRegForm(p => ({ ...p, authMethod: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="header">Custom Header</option>
                </select>
              </div>
              {regForm.authMethod !== 'none' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">
                    {regForm.authMethod === 'bearer' ? 'Bearer Token' : regForm.authMethod === 'api_key' ? 'API Key' : 'Token Value'}
                  </label>
                  <input
                    type="password"
                    value={regForm.authToken}
                    onChange={e => setRegForm(p => ({ ...p, authToken: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 font-mono"
                  />
                </div>
              )}
              {regForm.authMethod === 'header' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Header Name</label>
                  <input
                    value={regForm.authHeader}
                    onChange={e => setRegForm(p => ({ ...p, authHeader: e.target.value }))}
                    placeholder="X-Custom-Key"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Category & Tags */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-3">🏷️ Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Category</label>
                <select
                  value={regForm.category}
                  onChange={e => setRegForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Input Format</label>
                <select
                  value={regForm.inputFormat}
                  onChange={e => setRegForm(p => ({ ...p, inputFormat: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="json">JSON</option>
                  <option value="a2a">A2A Protocol</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Output Format</label>
                <select
                  value={regForm.outputFormat}
                  onChange={e => setRegForm(p => ({ ...p, outputFormat: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="json">JSON</option>
                  <option value="a2a">A2A Protocol</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Tags (comma-separated)</label>
              <input
                value={regForm.tags}
                onChange={e => setRegForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="research, summarization, academic, papers"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div className="mt-3">
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Sample Prompts (one per line)</label>
              <textarea
                value={regForm.samplePrompts}
                onChange={e => setRegForm(p => ({ ...p, samplePrompts: e.target.value }))}
                placeholder={"Summarize this research paper\nFind recent publications on..."}
                rows={3}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
              />
            </div>
          </div>

          {/* Agent Integration Kit */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-1">🧠 Agent Integration Kit</h3>
            <p className="text-[10px] text-white/30 mb-3">
              This is how other users&apos; Divis learn to work with your agent. The better you define this, the better the results.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Task Types (comma-separated)</label>
                <input
                  value={regForm.taskTypes}
                  onChange={e => setRegForm(p => ({ ...p, taskTypes: e.target.value }))}
                  placeholder="research, summarization, code-review, data-analysis"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                />
                <p className="text-[10px] text-white/25 mt-0.5">What kinds of work this agent handles. Other Divis match tasks to agents using these.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Context Instructions</label>
                <textarea
                  value={regForm.contextInstructions}
                  onChange={e => setRegForm(p => ({ ...p, contextInstructions: e.target.value }))}
                  placeholder={"Before calling this agent, gather:\n- The full text or URL of the document to analyze\n- Specify the desired output format (bullet points, narrative, table)\n- Include any domain-specific terminology or context\n\nDo NOT send raw HTML — extract clean text first."}
                  rows={5}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Tell other Divis exactly how to prepare context before calling your agent. Markdown supported.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Preparation Steps (one per line)</label>
                <textarea
                  value={regForm.contextPreparation}
                  onChange={e => setRegForm(p => ({ ...p, contextPreparation: e.target.value }))}
                  placeholder={"Collect the source material URL or text\nIdentify the target audience\nSpecify output length preference\nNote any topics to exclude"}
                  rows={4}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Step-by-step checklist Divi follows before executing. Think of it as a pre-flight checklist.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Input Schema (JSON)</label>
                  <textarea
                    value={regForm.requiredInputSchema}
                    onChange={e => setRegForm(p => ({ ...p, requiredInputSchema: e.target.value }))}
                    placeholder={'{\n  "prompt": "string (required)",\n  "format": "bullet|narrative|table",\n  "maxLength": "number (optional)"\n}'}
                    rows={5}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Output Schema (JSON)</label>
                  <textarea
                    value={regForm.outputSchema}
                    onChange={e => setRegForm(p => ({ ...p, outputSchema: e.target.value }))}
                    placeholder={'{\n  "summary": "string",\n  "keyPoints": ["string"],\n  "confidence": "number 0-1"\n}'}
                    rows={5}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Usage Examples (JSON array)</label>
                <textarea
                  value={regForm.usageExamples}
                  onChange={e => setRegForm(p => ({ ...p, usageExamples: e.target.value }))}
                  placeholder={'[\n  {\n    "input": "Summarize this paper on quantum computing",\n    "output": "A 3-paragraph summary covering...",\n    "description": "Basic summarization task"\n  }\n]'}
                  rows={5}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Real input/output examples teach other Divis the pattern. The more, the better.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Execution Notes</label>
                <textarea
                  value={regForm.executionNotes}
                  onChange={e => setRegForm(p => ({ ...p, executionNotes: e.target.value }))}
                  placeholder={"Rate limit: 10 requests/minute. Best results with prompts under 2000 chars. Agent may take 15-30s for complex queries."}
                  rows={2}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Rate limits, quirks, best practices — anything Divi should know at execution time.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">📋 Install Guide (Markdown)</label>
                <textarea
                  value={regForm.installGuide}
                  onChange={e => setRegForm(p => ({ ...p, installGuide: e.target.value }))}
                  placeholder={"## Setup\n1. Connect your API key in Settings → Integrations\n2. Configure the response format preference\n3. Test with: \"Summarize the latest quarterly report\""}
                  rows={4}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Shown to users after install. Guide them through configuration and first use.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">⚡ Commands (JSON array)</label>
                <textarea
                  value={regForm.commands}
                  onChange={e => setRegForm(p => ({ ...p, commands: e.target.value }))}
                  placeholder={'[\n  {"name": "research", "description": "Deep research on a topic", "usage": "!your-slug.research <query>"},\n  {"name": "summarize", "description": "Summarize a document", "usage": "!your-slug.summarize <url>"}\n]'}
                  rows={4}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Users invoke these via <code className="text-brand-400/60">!slug.command</code> in chat. Divi routes the task to your agent.</p>
              </div>
            </div>
          </div>

          {/* Protocol support */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
              <input type="checkbox" checked={regForm.supportsA2A} onChange={e => setRegForm(p => ({ ...p, supportsA2A: e.target.checked }))} className="rounded" />
              A2A Compatible
            </label>
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
              <input type="checkbox" checked={regForm.supportsMCP} onChange={e => setRegForm(p => ({ ...p, supportsMCP: e.target.checked }))} className="rounded" />
              MCP Compatible
            </label>
          </div>

          {/* Pricing */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-3">💰 Pricing & Revenue Split</h3>

            {/* Fee info banner */}
            {feeInfo && regForm.pricingModel !== 'free' && (
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-brand-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-400 text-sm font-semibold">{feeInfo.developerPercent}% to you</span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/40 text-xs">{feeInfo.feePercent}% DiviDen routing fee</span>
                </div>
                <p className="text-[10px] text-white/35">
                  {feeInfo.isSelfHosted
                    ? 'Internal transactions: 0% fee. Network transactions: minimum 3% routing fee.'
                    : `You keep ${feeInfo.developerPercent}% of every transaction. DiviDen takes a ${feeInfo.feePercent}% routing fee for discovery, execution proxy, and infrastructure.`}
                </p>
                {regForm.pricingModel === 'per_task' && regForm.pricePerTask && (
                  <div className="mt-2 text-[10px] text-white/40">
                    Example: ${regForm.pricePerTask}/task → you earn <span className="text-emerald-400">${(parseFloat(regForm.pricePerTask) * feeInfo.developerPercent / 100).toFixed(2)}</span> per execution
                  </div>
                )}
                {regForm.pricingModel === 'subscription' && regForm.subscriptionPrice && (
                  <div className="mt-2 text-[10px] text-white/40">
                    Example: ${regForm.subscriptionPrice}/mo → you earn <span className="text-emerald-400">${(parseFloat(regForm.subscriptionPrice) * feeInfo.developerPercent / 100).toFixed(2)}</span>/subscriber/mo
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Pricing Model</label>
                <select
                  value={regForm.pricingModel}
                  onChange={e => setRegForm(p => ({ ...p, pricingModel: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  <option value="free">Free</option>
                  <option value="per_task">Per Task</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
              {regForm.pricingModel === 'per_task' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Price Per Task ($)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={regForm.pricePerTask}
                    onChange={e => setRegForm(p => ({ ...p, pricePerTask: e.target.value }))}
                    placeholder="1.00"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              )}
              {regForm.pricingModel === 'subscription' && (
                <>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Monthly Price ($)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={regForm.subscriptionPrice}
                      onChange={e => setRegForm(p => ({ ...p, subscriptionPrice: e.target.value }))}
                      placeholder="29.99"
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Task Limit (blank = unlimited)</label>
                    <input
                      type="number" min="0"
                      value={regForm.taskLimit}
                      onChange={e => setRegForm(p => ({ ...p, taskLimit: e.target.value }))}
                      placeholder="100"
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Access Password */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-1">🔑 Access Password</h3>
            <p className="text-[10px] text-white/30 mb-3">
              Set a password that you can share with people to give them free access to your agent — even if it&apos;s a paid agent. They enter the password when subscribing and skip payment entirely.
            </p>
            <input
              value={regForm.accessPassword}
              onChange={e => setRegForm(p => ({ ...p, accessPassword: e.target.value }))}
              placeholder="Leave blank for no password access"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          {/* Developer URL */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Developer Website / GitHub</label>
            <input
              value={regForm.developerUrl}
              onChange={e => setRegForm(p => ({ ...p, developerUrl: e.target.value }))}
              placeholder="https://github.com/your-org"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={registering || !regForm.name || !regForm.description || !regForm.endpointUrl || !regForm.developerName}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-medium transition-all',
              registering
                ? 'bg-white/5 text-white/30 cursor-wait'
                : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
            )}
          >
            {registering ? 'Registering...' : '🚀 Register Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}
