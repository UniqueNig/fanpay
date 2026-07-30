import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatDate } from "../../utils/helpers";
import { FiAlertCircle, FiSend, FiMail, FiMessageSquare } from "react-icons/fi";

const AdminComms = () => {
  const [channel, setChannel] = useState("email");
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/admin/comms?channel=${channel}`);
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err.message || "Failed to load campaigns.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [channel]);

  const queue = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post("/admin/comms", { channel, subject: channel === "email" ? subject.trim() : null, message: message.trim() });
      setSubject(""); setMessage("");
      load();
    } catch (err) {
      setError(err.message || "Failed to queue message.");
    }
    setSending(false);
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">{channel === "email" ? "Email Management" : "SMS Message"}</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Compose and queue bulk messages</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setChannel("email")} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-dm text-sm border transition-colors ${channel === "email" ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
            <FiMail size={14} /> Email
          </button>
          <button onClick={() => setChannel("sms")} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-dm text-sm border transition-colors ${channel === "sms" ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
            <FiMessageSquare size={14} /> SMS
          </button>
        </div>

        {channel === "email" ? (
          <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-secondary font-dm text-xs">
              Sends via Resend to every user immediately. The free Resend tier caps at 100 emails/day —
              broadcasting to more users than that in one day will start failing partway through.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-yellow-400 font-dm text-xs">
              No SMS provider (Termii/Africa's Talking) is wired in yet — messages queue here but won't
              actually send until one is connected.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        <div className="card-glass p-5 mb-6">
          <form onSubmit={queue} className="flex flex-col gap-3">
            {channel === "email" && (
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="input-field" />
            )}
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" className="input-field min-h-[100px] resize-none" />
            <button type="submit" disabled={sending} className="btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
              <FiSend size={14} /> {sending ? "Queuing..." : "Queue for All Users"}
            </button>
          </form>
        </div>

        {!loading && (
          <div className="card-glass overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-white/35 font-dm text-sm">Nothing queued yet.</div>
            ) : campaigns.map((c, i) => (
              <div key={c.id} className={`p-4 ${i < campaigns.length - 1 ? "border-b border-white/5" : ""}`}>
                {c.subject && <p className="text-white font-dm text-sm font-medium">{c.subject}</p>}
                <p className="text-white/40 font-dm text-xs mt-0.5">{c.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-dm px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/10">{c.status}</span>
                  <span className="text-white/25 font-dm text-[11px]">{formatDate(c.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminComms;
