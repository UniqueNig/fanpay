import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import BackToTop from "../../components/BackToTop";
import SEO from "../../components/SEO";
import { FiCopy, FiCheck } from "react-icons/fi";

const CodeBlock = ({ children }) => {
  const [copied, setCopied] = useState(false);
  const text = children.trim();
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative bg-surface border border-line rounded-xl overflow-hidden">
      <button onClick={copy} className="absolute top-2.5 right-2.5 text-ink/40 hover:text-iris">
        {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
      </button>
      <pre className="p-4 pr-10 overflow-x-auto font-mono text-xs text-ink/80 leading-relaxed">{text}</pre>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-syne font-bold text-ink text-lg mb-3">{title}</h2>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const BASE_URL = "https://fanpay-api-iti0.onrender.com/api/v1";

const DeveloperDocs = () => (
  <div className="bg-surface min-h-screen">
    <SEO
      title="API Documentation"
      description="Everything needed to call the FanFi purchase API from your own app — authentication, endpoints, and examples."
      path="/developer/docs"
    />
    <Navbar />
    <div className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <span className="text-iris font-dm text-sm font-medium tracking-widest uppercase">Developer API</span>
      <h1 className="section-title mt-3 mb-6">API Documentation</h1>
      <p className="text-ink/60 font-dm text-base leading-relaxed mb-8">
        Everything needed to call the FanFi purchase API from your own app.
      </p>

      <Section title="Base URL">
        <p className="text-ink/60 font-dm text-sm">
          <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">{BASE_URL}</code> in production.
          Locally, this is <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">http://localhost:4000/api/v1</code> against
          a backend you're running yourself.
        </p>
      </Section>

      <Section title="Authentication">
        <p className="text-ink/60 font-dm text-sm">
          Every request needs an <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">X-Api-Key</code> header.
          Generate a key on the <Link to="/developer" className="text-iris hover:underline">Developer API</Link> page — it's shown
          in full exactly once at creation, so save it immediately.
        </p>
        <p className="text-ink/60 font-dm text-sm">
          Keys are prefixed <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">fk_sandbox_...</code> or{" "}
          <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">fk_live_...</code> so you can tell which
          environment a key belongs to at a glance.
        </p>
        <CodeBlock>{`curl -H "X-Api-Key: fk_sandbox_..." ${BASE_URL}/data-plans/mtn`}</CodeBlock>
      </Section>

      <Section title="Sandbox vs. Live">
        <p className="text-ink/60 font-dm text-sm">
          <strong>Sandbox</strong> keys work immediately after you generate one — no approval needed. Purchases return realistic
          simulated responses and never touch a real network or real money. Use this to build and test your integration.
        </p>
        <p className="text-ink/60 font-dm text-sm">
          <strong>Live</strong> keys deliver real airtime/data and debit your actual FanFi wallet balance — the same balance
          shown on your dashboard, not a separate one. Live keys need approval first; request it from your Developer API page
          once you've tested against sandbox.
        </p>
      </Section>

      <Section title="GET /data-plans/:network">
        <p className="text-ink/60 font-dm text-sm">
          Lists real, currently-priced data plans for a network (<code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">mtn</code>,{" "}
          <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">airtel</code>,{" "}
          <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">glo</code>, or{" "}
          <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">9mobile</code>). Call this before
          <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs mx-1">POST /data</code>
          — <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">variationCode</code> must come from here, not be guessed.
        </p>
        <CodeBlock>{`GET ${BASE_URL}/data-plans/mtn
X-Api-Key: fk_sandbox_...

200 OK
{
  "plans": [
    { "variationCode": "497", "name": "1.0GB (SME)", "amount": 250, "planType": "SME", "validity": "30 days", "size": "1.0GB" },
    ...
  ]
}`}</CodeBlock>
      </Section>

      <Section title="POST /airtime">
        <CodeBlock>{`POST ${BASE_URL}/airtime
X-Api-Key: fk_sandbox_...
Content-Type: application/json

{
  "network": "mtn",
  "phone": "08012345678",
  "amount": 500
}`}</CodeBlock>
        <p className="text-ink/60 font-dm text-sm">Response (same shape for both sandbox and live):</p>
        <CodeBlock>{`200 OK
{
  "success": true,
  "status": "successful",
  "requestId": "1785...",
  "reference": "AIR-1785...",
  "amountCharged": 500
}`}</CodeBlock>
      </Section>

      <Section title="POST /data">
        <CodeBlock>{`POST ${BASE_URL}/data
X-Api-Key: fk_sandbox_...
Content-Type: application/json

{
  "network": "mtn",
  "phone": "08012345678",
  "variationCode": "497"
}`}</CodeBlock>
        <p className="text-ink/60 font-dm text-sm">
          <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">amountCharged</code> is the real, server-resolved
          price for that plan — never trust or send a client-side amount for data, only the plan's own code.
        </p>
      </Section>

      <Section title="Errors">
        <p className="text-ink/60 font-dm text-sm">Every error is a plain JSON object with an <code className="bg-surface border border-line rounded px-1.5 py-0.5 text-xs">error</code> string.</p>
        <CodeBlock>{`401  Missing, invalid, or revoked API key
403  Developer account suspended, or a live key used before approval
400  Insufficient wallet balance, or invalid request fields
502  Upstream delivery failed — nothing was charged`}</CodeBlock>
      </Section>

      <Section title="Rate Limits">
        <p className="text-ink/60 font-dm text-sm">
          Each key defaults to 30 requests/minute. If you need more, mention it when requesting live approval.
        </p>
      </Section>

      <Section title="Coming Later">
        <p className="text-ink/40 font-dm text-sm">
          Electricity, cable TV, and result-checker PIN endpoints, plus outbound webhooks for async delivery
          confirmation, aren't available via the API yet — only airtime and data today.
        </p>
      </Section>
    </div>
    <Footer />
    <BackToTop />
  </div>
);

export default DeveloperDocs;
