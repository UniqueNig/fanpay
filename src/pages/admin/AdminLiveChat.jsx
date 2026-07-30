import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { formatDate, formatTime } from "../../utils/helpers";
import { FiSend, FiMessageCircle, FiUser } from "react-icons/fi";

const AdminLiveChat = () => {
  const { user: adminUser } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeUid, setActiveUid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

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
    });
  };

  const activeThread = threads.find((t) => t.uid === activeUid);

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">Live Chat</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Real-time support conversations</p>
        </div>

        <div className="card-glass overflow-hidden flex h-[600px] max-h-[70vh]">
          {/* Thread list */}
          <div className="w-full sm:w-72 border-r border-white/8 overflow-y-auto shrink-0">
            {threads.length === 0 ? (
              <div className="p-6 text-center text-white/35 font-dm text-sm">No conversations yet.</div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.uid}
                  onClick={() => openThread(t.uid)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${
                    activeUid === t.uid ? "bg-white/5" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center shrink-0">
                    <FiUser size={14} className="text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white font-dm text-sm truncate">{t.email || t.uid}</p>
                      {t.unreadByAdmin && <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />}
                    </div>
                    <p className="text-white/35 font-dm text-xs truncate">{t.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Conversation */}
          <div className="hidden sm:flex flex-1 flex-col">
            {!activeThread ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/25">
                <FiMessageCircle size={28} className="mb-2" />
                <p className="font-dm text-sm">Select a conversation</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-white/8">
                  <p className="text-white font-dm text-sm font-medium">{activeThread.email}</p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                  {messages.map((m) => (
                    <div key={m.id} className="flex flex-col">
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                          m.sender === "admin"
                            ? "self-end bg-secondary text-primary rounded-br-sm"
                            : "self-start bg-white/8 text-white rounded-bl-sm"
                        }`}
                      >
                        {m.body}
                      </div>
                      {m.createdAt && (
                        <span className={`text-white/25 font-dm text-[10px] mt-0.5 ${m.sender === "admin" ? "self-end" : "self-start"}`}>
                          {formatDate(m.createdAt.toDate ? m.createdAt.toDate() : m.createdAt)} · {formatTime(m.createdAt.toDate ? m.createdAt.toDate() : m.createdAt)}
                        </span>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-white/8">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reply..."
                    className="input-field flex-1"
                  />
                  <button type="submit" className="bg-secondary text-primary rounded-xl p-3 shrink-0">
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
