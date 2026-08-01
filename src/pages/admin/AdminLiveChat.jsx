import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { db } from "../../firebase";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { formatDate, formatTime } from "../../utils/helpers";
import { FiSend, FiMessageCircle, FiUser, FiCpu, FiAlertCircle } from "react-icons/fi";

const Toggle = ({ on, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? "bg-iris" : "bg-line"}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-5" : "left-0.5"}`} />
  </button>
);

const AdminLiveChat = () => {
  const { user: adminUser } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeUid, setActiveUid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const bottomRef = useRef(null);

  // Global AI auto-reply toggle (server/src/services/chatListener.js reads
  // this same AppSettings.chat.aiEnabled field before replying to anything).
  useEffect(() => {
    api.get("/admin/settings").then((res) => setAiEnabled(!!res.settings?.chat?.aiEnabled)).catch(() => {});
  }, []);

  const toggleAi = async () => {
    const next = !aiEnabled;
    setAiSaving(true);
    setAiEnabled(next);
    try {
      await api.post("/admin/settings", { chat: { aiEnabled: next } });
    } catch {
      setAiEnabled(!next);
    }
    setAiSaving(false);
  };

  // Live list of every chat summary doc, newest activity first.
  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("lastMessageAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setThreads(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Live messages for whichever thread is open.
  useEffect(() => {
    if (!activeUid) return;
    const q = query(collection(db, "chats", activeUid, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activeUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openThread = async (uid) => {
    setActiveUid(uid);
    await updateDoc(doc(db, "chats", uid), { unreadByAdmin: false }).catch(() => {});
  };

  // Sending a reply hands the thread back to a human for good until they
  // explicitly resume the AI — otherwise the AI could reply to the same
  // message an admin is mid-way through answering.
  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !activeUid) return;
    setText("");
    await addDoc(collection(db, "chats", activeUid, "messages"), {
      body,
      sender: "admin",
      adminUid: adminUser?.uid,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "chats", activeUid), {
      lastMessage: body,
      lastMessageAt: serverTimestamp(),
      lastSender: "admin",
      aiPaused: true,
      needsHuman: false,
    });
  };

  // Clears the pause without needing a new customer message to do it —
  // if the customer's last message is still unanswered, this alone makes
  // the chatAiListener pick it back up (it only checks lastSender/aiPaused,
  // not what specifically changed on the doc).
  const resumeAi = async (uid) => {
    await updateDoc(doc(db, "chats", uid), { aiPaused: false }).catch(() => {});
  };

  const activeThread = threads.find((t) => t.uid === activeUid);

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-syne font-bold text-ink text-2xl">Live Chat</h1>
            <p className="text-ink/40 font-dm text-sm mt-1">Real-time support conversations</p>
          </div>
          <div className="flex items-center gap-3 card-flat px-4 py-2.5">
            <div className="text-right">
              <p className="text-ink font-dm text-sm font-medium leading-tight">AI Auto-Reply</p>
              <p className="text-ink/35 font-dm text-[11px] leading-tight">Claude answers first, hands off when unsure</p>
            </div>
            <Toggle on={aiEnabled} onClick={toggleAi} />
          </div>
        </div>

        <div className="card-flat overflow-hidden flex h-[600px] max-h-[70vh]">
          {/* Thread list */}
          <div className="w-full sm:w-72 border-r border-line overflow-y-auto shrink-0">
            {threads.length === 0 ? (
              <div className="p-6 text-center text-ink/35 font-dm text-sm">No conversations yet.</div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.uid}
                  onClick={() => openThread(t.uid)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-line hover:bg-surface transition-colors ${
                    activeUid === t.uid ? "bg-surface" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-iris/15 border border-iris/20 flex items-center justify-center shrink-0">
                    <FiUser size={14} className="text-iris" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-ink font-dm text-sm truncate">{t.email || t.uid}</p>
                      {t.needsHuman && <FiAlertCircle size={12} className="text-red-400 shrink-0" />}
                      {t.unreadByAdmin && <span className="w-2 h-2 rounded-full bg-iris shrink-0" />}
                    </div>
                    <p className="text-ink/35 font-dm text-xs truncate">{t.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Conversation */}
          <div className="hidden sm:flex flex-1 flex-col">
            {!activeThread ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink/25">
                <FiMessageCircle size={28} className="mb-2" />
                <p className="font-dm text-sm">Select a conversation</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
                  <div>
                    <p className="text-ink font-dm text-sm font-medium">{activeThread.email}</p>
                    {activeThread.needsHuman && (
                      <p className="text-red-400 font-dm text-[11px] flex items-center gap-1 mt-0.5">
                        <FiAlertCircle size={10} /> AI handed this off — needs a human
                      </p>
                    )}
                  </div>
                  {aiEnabled && activeThread.aiPaused && (
                    <button
                      onClick={() => resumeAi(activeThread.uid)}
                      className="flex items-center gap-1.5 text-iris font-dm text-xs border border-iris/30 hover:bg-iris/10 rounded-lg px-3 py-1.5 shrink-0"
                    >
                      <FiCpu size={12} /> Resume AI
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-start" : "items-end"}`}>
                      {m.sender === "ai" && (
                        <span className="flex items-center gap-1 text-iris/70 font-dm text-[10px] mb-0.5 px-1">
                          <FiCpu size={9} /> AI Assistant
                        </span>
                      )}
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                          m.sender === "user"
                            ? "self-start bg-surface text-ink rounded-bl-sm"
                            : m.sender === "ai"
                            ? "self-end bg-iris/60 text-accent-ink rounded-br-sm"
                            : "self-end bg-iris text-accent-ink rounded-br-sm"
                        }`}
                      >
                        {m.body}
                      </div>
                      {m.createdAt && (
                        <span className={`text-ink/25 font-dm text-[10px] mt-0.5 ${m.sender === "user" ? "self-start" : "self-end"}`}>
                          {formatDate(m.createdAt.toDate ? m.createdAt.toDate() : m.createdAt)} · {formatTime(m.createdAt.toDate ? m.createdAt.toDate() : m.createdAt)}
                        </span>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-line">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reply..."
                    className="input-field-light flex-1"
                  />
                  <button type="submit" className="bg-iris text-accent-ink rounded-xl p-3 shrink-0">
                    <FiSend size={15} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLiveChat;
