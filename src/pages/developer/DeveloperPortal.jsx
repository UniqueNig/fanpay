import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { api } from "../../api";
import { formatNaira } from "../../utils/helpers";
import { FiCode, FiCopy, FiCheck, FiPlusCircle, FiTrash2, FiAlertCircle } from "react-icons/fi";

// Phase B1 — the walking-skeleton version of the Developer Platform: register,
// generate/revoke sandbox and live API keys, see your own apiBalance. No
// webhooks or usage analytics yet (later phases — see the plan doc). Sandbox
// keys work immediately; live keys exist but stay gated behind manual admin
// approval (DeveloperAccount.status) until an admin approval UI is built.
const DeveloperPortal = () => {
  const [loading, setLoading] = useState(true);
  const [developer, setDeveloper] = useState(null);
  const [keys, setKeys] = useState([]);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const [creating, setCreating] = useState(false);

  const [revealedKey, setRevealedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/developer/account");
      setDeveloper(data.developer);
      setKeys(data.keys || []);
    } catch (err) {
      if (err.message?.includes("Not registered")) {
        setDeveloper(null);
      } else {
        setError(err.message || "Could not load your developer account.");
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRegister = async () => {
    setRegistering(true);
    setError("");
    try {
      await api.post("/developer/register", {});
      await load();
    } catch (err) {
      setError(err.message || "Could not register. Try again.");
    }
    setRegistering(false);
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const result = await api.post("/developer/keys", { name: keyName.trim(), environment });
      setRevealedKey(result.key);
      setKeyName("");
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err.message || "Could not generate a key. Try again.");
    }
    setCreating(false);
  };

  const handleRevoke = async (id) => {
    try {
      await api.post(`/developer/keys/${id}/revoke`, {});
      await load();
    } catch (err) {
      setError(err.message || "Could not revoke this key.");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-5 lg:p-8 max-w-3xl">
          <div className="card-flat p-8 h-40 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-ink text-2xl">Developer API</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Sandbox and live API keys for the FanFi purchase API</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        {!developer ? (
          <div className="card-flat p-10 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-iris/15 flex items-center justify-center">
              <FiCode size={24} className="text-iris" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-ink text-lg mb-1">Become a Developer</h2>
              <p className="text-ink/50 font-dm text-sm max-w-sm">
                Register to get sandbox API keys instantly — call airtime and data purchase
                endpoints programmatically without spending real money.
              </p>
            </div>
            <button onClick={handleRegister} disabled={registering} className="btn-iris disabled:opacity-60">
              {registering ? "Registering..." : "Register as a Developer"}
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="card-flat p-5">
                <p className="text-ink/35 font-dm text-[11px] uppercase mb-1">Account Status</p>
                <p className={`font-syne font-bold text-lg capitalize ${developer.status === "approved" ? "text-iris" : "text-ink"}`}>
                  {developer.status}
                </p>
                {developer.status !== "approved" && (
                  <p className="text-ink/35 font-dm text-xs mt-1">
                    Sandbox keys work now. Live keys need admin approval first.
                  </p>
                )}
              </div>
              <div className="card-flat p-5">
                <p className="text-ink/35 font-dm text-[11px] uppercase mb-1">API Balance (live purchases)</p>
                <p className="font-syne font-bold text-lg text-ink">{formatNaira(developer.apiBalance || 0)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-syne font-semibold text-ink text-base">API Keys</h2>
              <button onClick={() => setShowCreate(!showCreate)} className="btn-outline-iris !w-auto px-4 py-2 text-xs flex items-center gap-2">
                <FiPlusCircle size={13} /> New Key
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreateKey} className="card-flat p-4 mb-4 flex flex-col gap-3">
                <input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Key name (e.g. Production backend)"
                  className="input-field-light text-sm"
                />
                <div className="flex gap-2">
                  {["sandbox", "live"].map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironment(env)}
                      className={`flex-1 py-2.5 rounded-xl font-dm text-sm font-semibold capitalize border transition-all ${
                        environment === env ? "bg-iris/15 border-iris/40 text-iris" : "bg-surface border-line text-ink/60"
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={creating} className="btn-iris disabled:opacity-60">
                  {creating ? "Generating..." : "Generate Key"}
                </button>
              </form>
            )}

            {keys.length === 0 ? (
              <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">No API keys yet.</div>
            ) : (
              <div className="card-flat overflow-hidden">
                {keys.map((k, i) => (
                  <div key={k.id} className={`flex items-center justify-between gap-3 p-4 ${i < keys.length - 1 ? "border-b border-line" : ""} ${k.status === "revoked" ? "opacity-50" : ""}`}>
                    <div className="min-w-0">
                      <p className="text-ink font-dm text-sm font-medium truncate">{k.name || "Unnamed key"}</p>
                      <p className="text-ink/35 font-dm text-xs font-mono">{k.keyPrefix}</p>
                      <p className="text-ink/30 font-dm text-[11px] mt-0.5 capitalize">{k.environment} · {k.status}</p>
                    </div>
                    {k.status === "active" && (
                      <button onClick={() => handleRevoke(k.id)} className="text-ink/40 hover:text-red-400 shrink-0" title="Revoke">
                        <FiTrash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {revealedKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRevealedKey(null)}>
            <div className="w-full max-w-md bg-panel border border-line rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-syne font-bold text-ink text-base mb-2">Save this key now</h3>
              <p className="text-ink/50 font-dm text-xs mb-4">
                This is the only time it's shown in full. Store it somewhere safe — you can't view it again.
              </p>
              <div className="bg-surface border border-line rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-5">
                <p className="text-ink font-mono text-xs break-all">{revealedKey}</p>
                <button onClick={() => handleCopy(revealedKey)} className="text-iris shrink-0">
                  {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </button>
              </div>
              <button onClick={() => setRevealedKey(null)} className="btn-iris w-full">Done</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DeveloperPortal;
