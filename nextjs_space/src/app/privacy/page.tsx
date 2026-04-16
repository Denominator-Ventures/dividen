export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'DiviDen Privacy Policy — how we collect, use, store, and protect your data, including Google user data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* Back link */}
        <div className="mb-6 flex items-center gap-4">
          <a href="/" className="text-brand-400 hover:text-brand-300 text-sm">← Home</a>
          <a href="/dashboard" className="text-brand-400 hover:text-brand-300 text-sm">← Dashboard</a>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-heading font-bold mb-2">Privacy Policy</h1>
          <p className="text-white/40 text-sm">Version 1.0 · Effective April 13, 2026 · Last updated April 13, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">

          {/* 1. Introduction */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">1. Introduction</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                DiviDen (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the DiviDen Command Center platform at{' '}
                <a href="https://dividen.ai" className="text-brand-400 hover:text-brand-300">dividen.ai</a>{' '}
                (the &ldquo;Platform&rdquo;). This Privacy Policy describes how we collect, use, store, share, and protect your personal information and data when you use our Platform and Services.
              </p>
              <p>
                By using DiviDen, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Platform.
              </p>
              <p>
                This policy also covers our use of data obtained through Google APIs, in compliance with the{' '}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">Google API Services User Data Policy</a>,
                including the Limited Use requirements.
              </p>
            </div>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">2. Information We Collect</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p><strong className="text-white/80">2.1 Account Information.</strong> When you create an account, we collect:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Name and email address</li>
                <li>Password (stored as a one-way cryptographic hash — we never store plaintext passwords)</li>
                <li>Profile information you choose to provide (headline, bio, skills, languages, timezone, etc.)</li>
              </ul>

              <p><strong className="text-white/80">2.2 Data You Create on the Platform.</strong> Through normal use, you create and store:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Kanban cards, projects, tasks, and checklist items</li>
                <li>CRM contacts and relationship data</li>
                <li>Documents, notes, and reports</li>
                <li>Chat conversations with your AI agent</li>
                <li>Queue items, goals, and calendar events</li>
                <li>Agent marketplace listings and configurations</li>
              </ul>

              <p><strong className="text-white/80">2.3 Data From Connected Services (Google &amp; Other Integrations).</strong> When you connect external services, we access and store data from those services to power DiviDen&apos;s signal triage and agent capabilities. Specifically:</p>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 space-y-3">
                <p className="text-white/70 font-medium">Google Services (via OAuth 2.0):</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong className="text-white/70">Gmail</strong> — Email messages (sender, recipient, subject, body, timestamps, thread IDs, labels) for inbox triage, email drafting, and communication tracking</li>
                  <li><strong className="text-white/70">Google Calendar</strong> — Events (title, time, location, attendees, description) for scheduling, meeting prep, and follow-up task extraction</li>
                  <li><strong className="text-white/70">Google Drive</strong> — File metadata (name, type, modified date, sharing status) and file contents for document triage and project context</li>
                  <li><strong className="text-white/70">Google Meet</strong> — Meeting transcripts and recordings metadata for extracting action items and decisions</li>
                  <li><strong className="text-white/70">Profile Info</strong> — Your Google account name and email address to identify your connected account</li>
                </ul>
              </div>

              <p><strong className="text-white/80">2.4 Automatically Collected Data.</strong> We collect standard technical information:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>IP addresses (for security and rate limiting)</li>
                <li>Browser type, device type, and operating system</li>
                <li>Pages visited and features used (for improving the Platform)</li>
                <li>Timestamps of actions</li>
              </ul>
            </div>
          </section>

          {/* 3. How We Use Your Data */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">3. How We Use Your Data</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>We use collected data solely to provide and improve the DiviDen Platform:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong className="text-white/70">Providing the Service</strong> — Powering your AI agent (Divi), triaging signals, managing tasks, routing relays, and executing marketplace agents</li>
                <li><strong className="text-white/70">Signal Triage</strong> — Analyzing connected data sources (email, calendar, drive, recordings) to extract actionable tasks and route them to project cards</li>
                <li><strong className="text-white/70">AI Processing</strong> — Sending relevant context to AI language model providers to generate agent responses, summaries, and task recommendations</li>
                <li><strong className="text-white/70">Communication</strong> — Sending emails on your behalf (when you configure and approve outbound email capabilities), delivering relay messages between connected users</li>
                <li><strong className="text-white/70">Platform Improvement</strong> — Aggregated, anonymized usage analytics to improve features and performance</li>
                <li><strong className="text-white/70">Security</strong> — Detecting and preventing unauthorized access, fraud, and abuse</li>
              </ul>
            </div>
          </section>

          {/* 4. Google User Data — Limited Use Disclosure */}
          <section className="bg-white/[0.03] border border-blue-500/20 rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold text-blue-400 mb-3">4. Google User Data — Limited Use Disclosure</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p className="text-white/80 font-medium">
                DiviDen&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Google API Services User Data Policy</a>,
                including the Limited Use requirements.
              </p>

              <p><strong className="text-white/80">4.1 What Google Data We Access.</strong> When you connect your Google account, we request access to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code className="code-inline">gmail.readonly</code> — Read your email messages for inbox triage</li>
                <li><code className="code-inline">gmail.send</code> — Send emails on your behalf (only when you configure and explicitly approve each outbound email)</li>
                <li><code className="code-inline">gmail.compose</code> — Draft email replies in the context of existing threads</li>
                <li><code className="code-inline">calendar.readonly</code> — Read your calendar events for scheduling context</li>
                <li><code className="code-inline">calendar.events</code> — Create and manage calendar events (meeting scheduling)</li>
                <li><code className="code-inline">drive.readonly</code> — Read file metadata and contents for document triage</li>
                <li><code className="code-inline">userinfo.email</code> and <code className="code-inline">userinfo.profile</code> — Identify your Google account</li>
              </ul>

              <p><strong className="text-white/80">4.2 How We Use Google Data.</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>To display your emails, events, and files within the DiviDen dashboard for triage and task extraction</li>
                <li>To send AI-composed context to your configured AI provider so Divi can summarize, prioritize, and suggest actions</li>
                <li>To send emails and create calendar events on your behalf, only when you explicitly approve each action</li>
                <li>To extract meeting transcripts from Google Meet recordings saved in your Drive</li>
              </ul>

              <p><strong className="text-white/80">4.3 What We Do NOT Do With Google Data.</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>We do <strong>not</strong> sell, rent, or trade your Google user data to any third party</li>
                <li>We do <strong>not</strong> use your Google data for advertising, retargeting, or interest-based ad serving</li>
                <li>We do <strong>not</strong> use your Google data to determine creditworthiness or for lending purposes</li>
                <li>We do <strong>not</strong> use your Google data to build user profiles for selling to third parties</li>
                <li>We do <strong>not</strong> use your Google data to train general-purpose AI or machine learning models</li>
                <li>We do <strong>not</strong> transfer your Google data to any third party except as necessary to provide the Services (i.e., your configured AI language model provider) and as explicitly disclosed in this policy</li>
              </ul>

              <p><strong className="text-white/80">4.4 AI Processing of Google Data.</strong> When Divi triages your email, calendar, or documents, relevant excerpts are sent to your configured AI language model provider (e.g., OpenAI, Anthropic) for processing. This is done solely to provide DiviDen&apos;s core features — task extraction, summarization, and response drafting. The AI provider processes this data according to their own API terms, which typically prohibit training on API data. We send only the minimum context necessary for each interaction.</p>

              <p><strong className="text-white/80">4.5 Google Data Storage &amp; Retention.</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Google data (emails, events, files) is stored in your DiviDen database to enable offline access and historical triage</li>
                <li>OAuth tokens (access tokens and refresh tokens) are stored encrypted and are used only to authenticate API requests to Google on your behalf</li>
                <li>You can disconnect your Google account at any time via Settings → Integrations, which revokes our access and deletes stored OAuth tokens</li>
                <li>Upon account deletion, all stored Google data is permanently removed from our systems</li>
              </ul>
            </div>
          </section>

          {/* 5. Data Sharing */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">5. Data Sharing &amp; Third Parties</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>We share your data only in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong className="text-white/70">AI Language Model Providers</strong> — Relevant context from your data is sent to your configured AI provider (e.g., OpenAI, Anthropic) to generate agent responses. We send only the minimum context necessary. These providers process data per their API terms.</li>
                <li><strong className="text-white/70">Connected Users (Relays)</strong> — When you send or receive relay messages with other DiviDen users, the content of those relays is shared between the connected parties. You control who you connect with and what relay permissions you grant.</li>
                <li><strong className="text-white/70">Federated Instances</strong> — If you enable federation with external DiviDen instances, relay data traverses network boundaries to those instances. You control federation settings.</li>
                <li><strong className="text-white/70">Bubble Store</strong> — If you list agents on the Bubble Store, your agent listing (title, description, pricing) is publicly visible. Execution data is shared between you and the subscribing user.</li>
                <li><strong className="text-white/70">Infrastructure Providers</strong> — We use hosting, database, and storage providers to operate the Platform. These providers process data on our behalf under data processing agreements.</li>
                <li><strong className="text-white/70">Legal Requirements</strong> — We may disclose data if required by law, subpoena, court order, or government request.</li>
              </ul>
              <p>We do <strong>not</strong> sell your personal data to any third party.</p>
            </div>
          </section>

          {/* 6. Data Security */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">6. Data Security</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>We implement industry-standard security measures to protect your data:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All data in transit is encrypted via TLS/HTTPS</li>
                <li>Passwords are stored as one-way cryptographic hashes (bcrypt)</li>
                <li>OAuth tokens are stored encrypted at rest</li>
                <li>Database access is restricted to authenticated and authorized application code</li>
                <li>API endpoints require authentication via session tokens</li>
                <li>Administrative access is protected by separate credentials</li>
              </ul>
              <p>
                No system is perfectly secure. We cannot guarantee absolute security, but we take reasonable measures to protect your data from unauthorized access, alteration, disclosure, or destruction.
              </p>
            </div>
          </section>

          {/* 7. Data Retention & Deletion */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">7. Data Retention &amp; Deletion</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p><strong className="text-white/80">7.1 Retention.</strong> We retain your data for as long as your account is active or as needed to provide the Services. Data from connected services (Google, etc.) is retained to enable historical triage and context building.</p>
              <p><strong className="text-white/80">7.2 Account Deletion.</strong> You may request deletion of your account and all associated data at any time by contacting us or using the account deletion feature (when available). Upon deletion:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All personal data, contacts, cards, documents, and chat history are permanently deleted</li>
                <li>All connected service data (emails, events, files) is permanently deleted</li>
                <li>All OAuth tokens are revoked and deleted</li>
                <li>Marketplace agent listings are removed</li>
                <li>Some anonymized, aggregated data may be retained for analytics purposes</li>
              </ul>
              <p><strong className="text-white/80">7.3 Disconnecting Services.</strong> You can disconnect individual services (e.g., Google) at any time via Settings → Integrations. Disconnecting revokes our OAuth access and deletes stored tokens. Previously synced data (emails, events) may be retained in your account unless you explicitly request deletion.</p>
            </div>
          </section>

          {/* 8. Your Rights */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">8. Your Rights</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>Depending on your jurisdiction, you may have rights including:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong className="text-white/70">Access</strong> — Request a copy of the personal data we hold about you</li>
                <li><strong className="text-white/70">Correction</strong> — Request correction of inaccurate data</li>
                <li><strong className="text-white/70">Deletion</strong> — Request deletion of your data (see Section 7)</li>
                <li><strong className="text-white/70">Portability</strong> — Request your data in a portable format</li>
                <li><strong className="text-white/70">Revoke Consent</strong> — Disconnect any connected service or withdraw consent for data processing at any time</li>
                <li><strong className="text-white/70">Restrict Processing</strong> — Request that we limit how we use your data</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:privacy@dividen.ai" className="text-brand-400 hover:text-brand-300">privacy@dividen.ai</a>.
                You can also manage your Google account permissions directly at{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">myaccount.google.com/permissions</a>.
              </p>
            </div>
          </section>

          {/* 9. Children's Privacy */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">9. Children&apos;s Privacy</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                DiviDen is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If we learn that we have collected data from a child under 16, we will take steps to delete that information promptly.
              </p>
            </div>
          </section>

          {/* 10. Cookies */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">10. Cookies &amp; Local Storage</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>We use cookies and local storage for:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong className="text-white/70">Authentication</strong> — Session cookies to keep you logged in</li>
                <li><strong className="text-white/70">Preferences</strong> — Storing UI preferences (theme, layout settings)</li>
              </ul>
              <p>We do not use cookies for advertising or third-party tracking.</p>
            </div>
          </section>

          {/* 11. International Transfers */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">11. International Data Transfers</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                DiviDen operates globally. Your data may be transferred to and processed in countries other than your country of residence, including the United States, where our servers and infrastructure providers are located. By using the Platform, you consent to such transfers.
              </p>
            </div>
          </section>

          {/* 12. Self-Hosted Instances */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">12. Self-Hosted Instances</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                If you use a self-hosted DiviDen instance, you are the data controller for all data on that instance. This Privacy Policy applies only to the managed platform at dividen.ai. Self-hosted operators are responsible for their own privacy policies and data handling practices.
              </p>
            </div>
          </section>

          {/* 13. Changes */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">13. Changes to This Policy</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time. Material changes will be communicated through the Platform or via email. The &ldquo;Last updated&rdquo; date at the top reflects the most recent revision. Your continued use of the Platform after changes constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* 14. Contact */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">14. Contact Us</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>For privacy-related questions, requests, or concerns:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Email: <a href="mailto:privacy@dividen.ai" className="text-brand-400 hover:text-brand-300">privacy@dividen.ai</a></li>
                <li>Website: <a href="https://dividen.ai" className="text-brand-400 hover:text-brand-300">dividen.ai</a></li>
              </ul>
              <p>
                For Google-specific data concerns, you can also manage or revoke DiviDen&apos;s access to your Google account at{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">Google Account Permissions</a>.
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">DiviDen Command Center · Privacy Policy v1.0</p>
          <div className="flex items-center gap-4 text-xs text-white/25">
            <a href="/terms" className="hover:text-white/40 transition-colors">Terms of Service</a>
            <a href="/" className="hover:text-white/40 transition-colors">Home</a>
          </div>
        </div>
      </div>
    </div>
  );
}
