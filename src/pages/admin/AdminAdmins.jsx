import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import { formatDate } from "../../utils/helpers";
import { FiUserPlus, FiAlertCircle, FiShield, FiX } from "react-icons/fi";

const AdminAdmins = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/admins");
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err.message || "Failed to load admins.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    setInviting(true);
    try {
      await api.post("/admin/admins", { email: email.trim() });
      setEmail("");
      load();
    } catch (err) {
      setInviteError(err.message || "Failed to grant admin access.");
    }
    setInviting(false);
  };

  const revoke = async () => {
    setRevoking(true);
    try {
      await api.post(`/admin/admins/${revokeTarget}/revoke`, {});
      setRevokeTarget(null);
      load();
    } catch (err) {
      setError(err.message || "Failed to revoke admin access.");
    }
    setRevoking(false);
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-ink text-2xl">Admin Management</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Grant or revoke admin access to accounts</p>
        </div>

        <div className="card-flat p-5 mb-6">
          <p className="text-ink/60 font-dm text-sm mb-3">
            Grant admin access by email. The account must already exist (they need to have signed up first).
          </p>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@fanfi.ng"
              className="input-field-light flex-1"
              required
            />
            <button
              type="submit"
              disabled={inviting}
              className="btn-iris flex items-center gap-2 !w-auto px-5 disabled:opacity-60"
            >
              <FiUserPlus size={15} /> {inviting ? "Granting..." : "Grant"}
            </button>
          </form>
          {inviteError && <p className="text-red-400 font-dm text-xs mt-2">{inviteError}</p>}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading admins...</div>
        ) : (
          <div className="card-flat overflow-hidden">
            {admins.map((a, i) => (
              <div
                key={a.uid}
                className={`flex items-center justify-between p-4 ${i < admins.length - 1 ? "border-b border-line" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-iris/15 border border-iris/20 flex items-center justify-center shrink-0">
                    <FiShield size={15} className="text-iris" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-ink font-dm text-sm font-medium truncate">{a.displayName || a.email}</p>
                    <p className="text-ink/35 font-dm text-xs truncate">
                      {a.email} · joined {a.createdAt ? formatDate(a.createdAt) : "—"}
                    </p>
                  </div>
                </div>
                {a.uid !== user?.uid && (
                  <button
                    onClick={() => setRevokeTarget(a.uid)}
                    className="flex items-center gap-1.5 text-red-400 hover:bg-red-500/10 font-dm text-xs px-3 py-2 rounded-lg shrink-0 ml-2"
                  >
                    <FiX size={13} /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!revokeTarget}
        title="Remove admin access?"
        message="This account will lose all admin permissions immediately."
        confirmLabel="Revoke"
        danger
        submitting={revoking}
        onConfirm={revoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminAdmins;
