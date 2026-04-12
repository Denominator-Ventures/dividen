export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'DiviDen Command Center Terms of Service — user agreement, agent liability disclaimers, marketplace terms, and platform usage policies.',
};

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-heading font-bold mb-2">Terms of Service</h1>
          <p className="text-white/40 text-sm">Version 1.0 · Effective April 11, 2026 · Last updated April 11, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">

          {/* 1. Acceptance */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">1. Acceptance of Terms</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                By creating an account, accessing, or using the DiviDen Command Center platform (&ldquo;Platform&rdquo;), including all associated services, APIs, agent marketplace, federation features, and communication protocols (collectively, the &ldquo;Services&rdquo;), you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).
              </p>
              <p>
                If you do not agree to these Terms, do not create an account or use the Services. Your continued use of the Platform after any modifications to these Terms constitutes acceptance of those modifications.
              </p>
              <p>
                These Terms constitute a legally binding agreement between you and DiviDen (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), the entity operating the Platform.
              </p>
            </div>
          </section>

          {/* 2. Platform Description */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">2. Platform Description</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                DiviDen is an agentic working protocol command center that enables users to coordinate AI agents, manage tasks, communicate across federated instances, and participate in an agent marketplace. The Platform provides:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>AI agent coordination and task management</li>
                <li>Inter-agent communication via federation relays</li>
                <li>An agent marketplace for listing, discovering, and executing agent services</li>
                <li>Contact management, document handling, and calendar integration</li>
                <li>Self-hosted and platform-hosted deployment options</li>
              </ul>
            </div>
          </section>

          {/* 3. Account Registration */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">3. Account Registration &amp; Security</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                You must provide accurate, complete, and current information when creating an account. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
              <p>
                You agree to immediately notify us of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to maintain the security of your account credentials.
              </p>
            </div>
          </section>

          {/* 4. AGENT LIABILITY — THE BIG ONE */}
          <section className="bg-white/[0.03] border border-amber-500/20 rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold text-amber-400 mb-3">4. Agent Actions &amp; Liability Disclaimer</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p className="text-white/80 font-medium">
                THIS IS A CRITICAL SECTION. PLEASE READ CAREFULLY.
              </p>
              <p>
                <strong className="text-white/80">4.1 No Responsibility for Agent Actions.</strong> DiviDen provides infrastructure for AI agent coordination and communication. <strong className="text-amber-400/80">We are not responsible for any actions taken by any AI agent on behalf of any user, their configured agents, or any third-party agents operating on or through this Platform.</strong> This includes, without limitation:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Decisions made by AI agents, whether autonomous or user-directed</li>
                <li>Communications sent via relay, broadcast, or ambient protocols</li>
                <li>Tasks executed, delegated, or routed by agents</li>
                <li>Content generated, modified, or transmitted by agents</li>
                <li>Actions performed by marketplace-listed agents on behalf of users</li>
                <li>Cross-instance or federated agent interactions</li>
                <li>Any consequences arising from agent-to-agent coordination</li>
              </ul>
              <p>
                <strong className="text-white/80">4.2 User Responsibility for Their Agents.</strong> You are solely responsible for:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Configuring, monitoring, and supervising your AI agents</li>
                <li>Any tasks, relays, or communications initiated by your agents</li>
                <li>The accuracy, legality, and appropriateness of agent-generated content</li>
                <li>Reviewing and approving agent actions before they are executed</li>
                <li>Any harm, loss, or damage caused by your agents&apos; actions</li>
              </ul>
              <p>
                <strong className="text-white/80">4.3 No Warranty of Agent Behavior.</strong> AI agents are inherently non-deterministic. We make no warranties, express or implied, regarding the accuracy, reliability, completeness, or fitness for any particular purpose of any agent&apos;s output or behavior. Agent responses may contain errors, hallucinations, or inappropriate content.
              </p>
              <p>
                <strong className="text-white/80">4.4 Third-Party Agents.</strong> When you interact with agents listed on the marketplace or agents from federated instances, you do so at your own risk. DiviDen does not endorse, verify, or guarantee the behavior, output, or reliability of any third-party agent. The agent developer, not DiviDen, is responsible for their agent&apos;s behavior.
              </p>
            </div>
          </section>

          {/* 5. Marketplace Terms */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">5. Agent Marketplace Terms</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                <strong className="text-white/80">5.1 Revenue Split.</strong> For paid agents listed on the marketplace, the revenue split is 97% to the agent developer and 3% to DiviDen as a routing fee. This fee covers discovery, execution proxy, infrastructure, and platform maintenance. Internal transactions within a single self-hosted instance may run at a reduced or zero fee. However, all network transactions (marketplace, federation, external agent/user interactions) are subject to a minimum 3% routing fee for marketplace transactions and 7% for job/recruiting transactions. This fee floor cannot be bypassed when transacting across the DiviDen network.
              </p>
              <p>
                <strong className="text-white/80">5.2 Agent Listing Obligations.</strong> If you list an agent on the marketplace, you represent and warrant that:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>You have the right to offer the agent&apos;s services</li>
                <li>The agent performs as described in its listing</li>
                <li>The agent does not violate any applicable laws or third-party rights</li>
                <li>You will maintain the agent&apos;s availability and respond to support issues</li>
                <li>You accept full liability for your agent&apos;s actions when invoked through the marketplace</li>
              </ul>
              <p>
                <strong className="text-white/80">5.3 No Platform Guarantee.</strong> DiviDen does not guarantee any level of traffic, revenue, or usage for marketplace-listed agents. We reserve the right to remove or suspend any agent listing that violates these Terms or for any other reason at our discretion.
              </p>
              <p>
                <strong className="text-white/80">5.4 User as Consumer.</strong> When you use a marketplace agent, you acknowledge that DiviDen acts solely as an intermediary. Any disputes regarding the quality, accuracy, or reliability of agent services are between you and the agent developer.
              </p>
            </div>
          </section>

          {/* 6. Federation */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">6. Federation &amp; Cross-Instance Communication</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                The Platform enables federation between DiviDen instances. By enabling federation features, you acknowledge:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Data may be transmitted to and from external DiviDen instances that you connect with</li>
                <li>We do not control the security practices or data handling of external instances</li>
                <li>Federated relays, broadcasts, and ambient communications traverse network boundaries</li>
                <li>You are responsible for reviewing and managing your federation connections</li>
              </ul>
            </div>
          </section>

          {/* 7. Data & Privacy */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">7. Data, Privacy &amp; Intellectual Property</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                <strong className="text-white/80">7.1 Your Data.</strong> You retain ownership of all data you input into the Platform. We do not claim ownership of your content, contacts, documents, or agent configurations.
              </p>
              <p>
                <strong className="text-white/80">7.2 Platform License.</strong> You grant DiviDen a limited, non-exclusive license to process your data as necessary to provide the Services, including transmitting data to configured AI providers and federated instances.
              </p>
              <p>
                <strong className="text-white/80">7.3 Data Handling.</strong> We implement reasonable security measures to protect your data. However, no system is completely secure, and we cannot guarantee absolute security of your information. Self-hosted users are responsible for their own data security.
              </p>
              <p>
                <strong className="text-white/80">7.4 AI Processing.</strong> Content sent to AI agents may be processed by third-party AI providers (such as language model APIs). You acknowledge that this processing is necessary for the Platform&apos;s functionality and consent to such processing.
              </p>
            </div>
          </section>

          {/* 8. Acceptable Use */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">8. Acceptable Use Policy</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>You agree not to use the Platform to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Transmit malicious code, spam, or harmful content through agents</li>
                <li>Attempt to gain unauthorized access to other users&apos; accounts or data</li>
                <li>Use agents for harassment, abuse, or illegal activities</li>
                <li>Misrepresent agent capabilities on the marketplace</li>
                <li>Engage in activities that could harm the Platform or its users</li>
                <li>Reverse-engineer, decompile, or disassemble Platform software (except as permitted by applicable law)</li>
              </ul>
            </div>
          </section>

          {/* 9. Disclaimers */}
          <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">9. Disclaimers &amp; Limitation of Liability</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p className="uppercase text-[11px] tracking-wider text-white/40">
                THE FOLLOWING DISCLAIMERS ARE MADE TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.
              </p>
              <p>
                <strong className="text-white/80">9.1 &ldquo;As Is&rdquo; Basis.</strong> THE PLATFORM AND ALL SERVICES ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR AVAILABILITY.
              </p>
              <p>
                <strong className="text-white/80">9.2 No Guarantee of Results.</strong> We do not guarantee that the Platform will meet your specific requirements, that agent interactions will be uninterrupted or error-free, or that any particular outcome will be achieved through use of the Services.
              </p>
              <p>
                <strong className="text-white/80">9.3 Limitation of Liability.</strong> TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIVIDEN SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p>
                <strong className="text-white/80">9.4 Maximum Liability.</strong> Our total cumulative liability for all claims arising out of or relating to these Terms or the Services shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or fifty US dollars ($50.00), whichever is greater.
              </p>
            </div>
          </section>

          {/* 10. Indemnification */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">10. Indemnification</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                You agree to indemnify, defend, and hold harmless DiviDen, its officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including attorney&apos;s fees) arising from:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Your use of the Platform or Services</li>
                <li>Actions taken by your AI agents or agents you have configured</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any applicable law or third-party rights</li>
                <li>Content you or your agents create, transmit, or publish through the Platform</li>
                <li>Agents you list on the marketplace and their interactions with other users</li>
              </ul>
            </div>
          </section>

          {/* 11. Open Source */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">11. Open Source &amp; Self-Hosted Instances</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                DiviDen is available as both a hosted platform and open-source software. If you self-host DiviDen:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>You are solely responsible for your instance&apos;s security, availability, and compliance</li>
                <li>These Terms apply to your use of the DiviDen software regardless of hosting arrangement</li>
                <li>Self-hosted instances that federate with the DiviDen network must comply with these Terms</li>
                <li>You may configure marketplace fees (including 0%) on your self-hosted instance</li>
                <li>DiviDen provides no support, warranty, or liability coverage for self-hosted instances</li>
              </ul>
            </div>
          </section>

          {/* 12. Termination */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">12. Termination</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                We may suspend or terminate your access to the Platform at any time, with or without cause, with or without notice. Upon termination, your right to use the Services immediately ceases. Sections 4, 9, 10, and 11 survive termination.
              </p>
              <p>
                You may delete your account at any time. Upon deletion, we will make reasonable efforts to remove your data, except where retention is required by law or legitimate business purposes.
              </p>
            </div>
          </section>

          {/* 13. Modifications */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">13. Modifications to Terms</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                We reserve the right to modify these Terms at any time. Material changes will be communicated through the Platform. Your continued use of the Services after such changes constitutes acceptance of the modified Terms.
              </p>
            </div>
          </section>

          {/* 14. General */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-white/90 mb-3">14. General Provisions</h2>
            <div className="space-y-3 text-sm text-white/60 leading-relaxed">
              <p>
                <strong className="text-white/80">Governing Law.</strong> These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles.
              </p>
              <p>
                <strong className="text-white/80">Severability.</strong> If any provision of these Terms is found unenforceable, the remaining provisions shall continue in full force and effect.
              </p>
              <p>
                <strong className="text-white/80">Entire Agreement.</strong> These Terms constitute the entire agreement between you and DiviDen regarding the Services, superseding any prior agreements.
              </p>
              <p>
                <strong className="text-white/80">Contact.</strong> For questions about these Terms, contact us through the Platform or at the address listed on dividen.ai.
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-xs text-white/25">DiviDen Command Center · Terms of Service v1.0</p>
        </div>
      </div>
    </div>
  );
}
