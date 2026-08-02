import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import { formatNaira } from "../../utils/helpers";
import { FiCode, FiCopy, FiCheck, FiPlusCircle, FiTrash2, FiAlertCircle, FiBook, FiGlobe } from "react-icons/fi";

// Register, generate/revoke sandbox and live API keys, see your own wallet
// balance. Sandbox keys work immediately; live keys need a website URL on
// file AND admin approval (DeveloperAccount.status, see the admin
// Developer Platform page) before they'll actually authorize a purchase —
// see middleware/requireApiKey.js. Live purchases debit this same wallet
// balance directly — no separate API balance — so what's shown here is
// exactly what a live /api/v1/airtime or /api/v1/data call can spend, at
// the same apiPrice rate this account also gets on its own dashboard
// purchases once approved (services/developerPricing.js).
const DeveloperPortal = () => {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [developer, setDeveloper] = useState(null);
  const [keys, setKeys] = useState([]);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [savingWebsite, setSavingWebsite] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const [creating, setCreating] = useState(false);

  const [revealedKey, setRevealedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/developer/account");
      setDeveloper(data.developer);
      setWebsiteUrl(data.developer?.websiteUrl || "");
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

  const handleSaveWebsite = async (e) => {
    e.preventDefault();
    setSavingWebsite(true);
    setError("");
    try {
      await api.post("/developer/website", { websiteUrl: websiteUrl.trim() });
      showToast("Website saved.", "success");
      await load();
    } catch (err) {
      setError(err.message || "Could not save website. Check the URL and try again.");
    }
    setSavingWebsite(false);
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

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await api.post(`/developer/keys/${revokeTarget}/revoke`, {});
      setRevokeTarget(null);
      showToast("API key revoked.", "success");
      await load();
    } catch (err) {
      setError(err.message || "Could not revoke this key.");
    }
    setRevoking(false);
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

  const hasWebsite = !!developer?.websiteUrl;

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-7 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-syne font-bold text-ink text-2xl">Developer API</h1>
            <p className="text-ink/40 font-dm text-sm mt-1">Sandbox and live API keys for the FanFi purchase API</p>
          </div>
          <Link to="/developer/docs" className="btn-outline-iris !w-auto px-4 py-2 text-xs flex items-center gap-2 shrink-0">
            <FiBook size={13} /> Docs
          </Link>
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
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="card-flat p-5">
                <p className="text-ink/35 font-dm text-[11px] uppercase mb-1">Account Status</p>
                <p className={`font-syne font-bold text-lg capitalize ${developer.status === "approved" ? "text-iris" : "text-ink"}`}>
                  {developer.status}
                </p>
                {developer.status !== "approved" && (
                  <p className="text-ink/35 font-dm text-xs mt-1">
                    Sandbox keys work now. Live keys need a website on file and admin approval.
                  </p>
                )}
              </div>
              <div className="card-flat p-5">
                <p className="text-ink/35 font-dm text-[11px] uppercase mb-1">Wallet Balance (live purchases)</p>
                <p className="font-syne font-bold text-lg text-ink">{formatNaira(userData?.balance || 0)}</p>
                <p className="text-ink/30 font-dm text-[11px] mt-1">Same balance as your FanFi wallet — no separate top-up needed.</p>
              </div>
            </div>

            <form onSubmit={handleSaveWebsite} className="card-flat p-5 mb-6">
              <label className="text-ink/80 font-dm text-sm font-medium mb-2 flex items-center gap-2">
                <FiGlobe size={14} className="text-ink/40" /> Website
              </label>
              <p className="text-ink/35 font-dm text-xs mb-3">
                Required before you can request live API access — this is what we review before approving real spend.
              </p>
              <div className="flex flex-col xs:flex-row gap-2">
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourapp.com"
                  className="input-field-light text-sm flex-1"
                  required
                />
                <button type="submit" disabled={savingWebsite} className="btn-outline-iris !w-auto px-5 disabled:opacity-60">
                  {savingWebsite ? "Saving..." : "Save"}
                </button>
              </div>
            </form>

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
                      disabled={env === "live" && !hasWebsite}
                      onClick={() => setEnvironment(env)}
                      title={env === "live" && !hasWebsite ? "Add your website above first" : undefined}
                      className={`flex-1 py-2.5 rounded-xl font-dm text-sm font-semibold capitalize border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        environment === env ? "bg-iris/15 border-iris/40 text-iris" : "bg-surface border-line text-ink/60"
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
                {environment === "live" && !hasWebsite && (
                  <p className="text-yellow-500 font-dm text-xs">Add your website above before generating a live key.</p>
                )}
                <button type="submit" disabled={creating || (environment === "live" && !hasWebsite)} className="btn-iris disabled:opacity-60">
                  {creating ? "Generating..." : "Generate Key"}
                </button>
              </form>
            )}

            {keys.length === 0 ? (
              <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">No API keys yet.</div>
            ) : (
              <div className="card-flat overflow-hidden">
                {keys.map((k, i) => {
                  const awaitingApproval = k.environment === "live" && k.status === "active" && developer.status !== "approved";
                  return (
                    <div key={k.id} className={`flex items-center justify-between gap-3 p-4 ${i < keys.length - 1 ? "border-b border-line" : ""} ${k.status === "revoked" ? "opacity-50" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-ink font-dm text-sm font-medium truncate">{k.name || "Unnamed key"}</p>
                        <p className="text-ink/35 font-mono text-xs">{k.keyPrefix}</p>
                        <p className={`font-dm text-[11px] mt-0.5 capitalize ${awaitingApproval ? "text-yellow-500" : "text-ink/30"}`}>
                          {k.environment} · {awaitingApproval ? "active, awaiting approval" : k.status}
                        </p>
                      </div>
                      {k.status === "active" && (
                        <button onClick={() => setRevokeTarget(k.id)} className="text-ink/40 hover:text-red-400 shrink-0" title="Revoke">
                          <FiTrash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
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

        <ConfirmModal
          open={!!revokeTarget}
          title="Revoke this API key?"
          message="Any app using this key will immediately stop being able to make purchases. This can't be undone."
          confirmLabel="Revoke"
          danger
          submitting={revoking}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      </div>
    </DashboardLayout>
  );
};

export default DeveloperPortal;
