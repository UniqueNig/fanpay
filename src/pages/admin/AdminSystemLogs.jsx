import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatDate, formatTime } from "../../utils/helpers";
import { FiAlertCircle, FiTerminal, FiAlertTriangle, FiInfo } from "react-icons/fi";

const LEVEL_STYLE = {
  error: { color: "text-red-400", icon: FiAlertTriangle },
  warn: { color: "text-yellow-400", icon: FiAlertTriangle },
  info: { color: "text-white/50", icon: FiInfo },
};

const AdminSystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/system-logs");
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message || "Failed to load logs.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">Cron Jobs & Logs</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Webhook errors and VTU reconciliation cron activity</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <FiTerminal className="text-white/20 mx-auto mb-3" size={28} />
            <p className="text-white/40 font-dm text-sm">No log entries yet.</p>
          </div>
        ) : (
          <div className="card-glass overflow-hidden">
            {logs.map((log, i) => {
              const style = LEVEL_STYLE[log.level] || LEVEL_STYLE.info;
              const Icon = style.icon;
              return (
                <div key={log.id} className={`flex items-start gap-3 p-4 ${i < logs.length - 1 ? "border-b border-white/5" : ""}`}>
                  <Icon size={14} className={`mt-0.5 shrink-0 ${style.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-dm text-sm">{log.source}</p>
                      <span className="text-white/25 font-dm text-[11px]">{formatDate(log.timestamp)} · {formatTime(log.timestamp)}</span>
                    </div>
                    <p className={`font-dm text-xs mt-0.5 ${style.color}`}>{log.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSystemLogs;
