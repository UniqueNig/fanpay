import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  collection, doc, addDoc, setDoc, onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { FiMessageCircle, FiX, FiSend } from "react-icons/fi";

// Floating support-chat widget. Real-time via Firestore onSnapshot — see
// firestore.rules for the /chats/{uid} access rules (owner + admins only).
// Mounted globally in App.jsx; renders nothing for signed-out users or admins
// (admins use the dedicated /admin/live-chat inbox instead).
const ChatWidget = () => {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user || isAdmin) return;
    const q = query(collection(db, "chats", user.uid, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      const last = msgs[msgs.length - 1];
      if (last && last.sender === "admin" && !open) setUnread(true);
    });
    return unsub;
  }, [user, isAdmin, open]);

  useEffect(() => {
    if (open) {
      setUnread(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  if (!user || isAdmin) return null;

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    await addDoc(collection(db, "chats", user.uid, "messages"), {
      body,
      sender: "user",
      createdAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, "chats", user.uid),
      {
        uid: user.uid,
        email: user.email,
        lastMessage: body,
        lastMessageAt: serverTimestamp(),
        unreadByAdmin: true,
      },
      { merge: true }
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-dm">
      {open && (
        <div className="w-80 h-96 mb-3 card-glass flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <p className="text-white font-syne font-semibold text-sm">Support Chat</p>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
              <FiX size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
            {messages.length === 0 ? (
              <p className="text-white/30 text-xs text-center mt-8">
                Send a message and our team will reply here.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    m.sender === "admin"
                      ? "self-start bg-white/8 text-white rounded-bl-sm"
                      : "self-end bg-secondary text-primary rounded-br-sm"
                  }`}
                >
                  {m.body}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-white/8">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="input-field flex-1 !py-2 text-sm"
            />
            <button type="submit" className="bg-secondary text-primary rounded-xl p-2.5 shrink-0">
              <FiSend size={15} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-14 h-14 rounded-full bg-secondary text-primary flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
      >
        {open ? <FiX size={22} /> : <FiMessageCircle size={22} />}
        {unread && !open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-primary" />
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
