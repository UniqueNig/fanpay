import React from "react";
import AdminLayout from "../../components/AdminLayout";
import { FiCpu } from "react-icons/fi";

// Placeholder for an AI assistant panel (the reference screenshots call it
// "RADNI Assistant"). Not built out yet — it needs a real decision first:
// which LLM API to call (e.g. the Anthropic API), what it should have
// access to (read-only stats? user lookup?), and a budget for API usage.
// Happy to build this once that's decided — see the note below.
const AdminAssistant = () => (
  <AdminLayout>
    <div className="p-5 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-white text-2xl">Assistant</h1>
        <p className="text-white/40 font-dm text-sm mt-1">AI-powered admin assistant</p>
      </div>
      <div className="card-glass p-10 text-center">
        <FiCpu className="text-white/20 mx-auto mb-3" size={28} />
        <p className="text-white/50 font-dm text-sm mb-2">Not set up yet</p>
        <p className="text-white/30 font-dm text-xs max-w-sm mx-auto">
          An AI assistant here needs a couple of decisions first: which LLM API to call, what data it's
          allowed to see (e.g. read-only access to stats and user lookups vs. write access), and a usage
          budget. Once you know what you want it to actually do, this is straightforward to wire up.
        </p>
      </div>
    </div>
  </AdminLayout>
);

export default AdminAssistant;
