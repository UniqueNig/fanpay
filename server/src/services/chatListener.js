import { FieldValue } from "firebase-admin/firestore";
import { firestoreDb } from "../config/firebaseAdmin.js";
import { getSettings } from "./settings.js";
import { generateAiReply } from "./chatAi.js";
import { env } from "../config/env.js";

// Guards against replying twice to the same thread if two change events
// land close together (e.g. a customer sends two messages in quick
// succession before the first reply finishes generating).
const inFlight = new Set();

// Watches the top-level /chats collection (one summary doc per user, see
// firestore.rules) rather than a collection-group query across every
// /chats/{uid}/messages subcollection — a single-collection listener needs
// no composite index, and `lastSender` on the summary doc (set by
// ChatWidget.jsx/AdminLiveChat.jsx on every send) is enough to know whether
// the newest message was from a customer without re-reading the thread.
export function startChatAiListener() {
  if (!env.anthropicApiKey) {
    console.log("ANTHROPIC_API_KEY not set — AI chat auto-reply is disabled.");
    return;
  }

  // onSnapshot's first callback replays the entire current collection as
  // "added" events — without this guard, every restart would re-trigger an
  // AI reply attempt on every existing thread, including ones a customer
  // messaged weeks ago.
  let ready = false;
  firestoreDb.collection("chats").onSnapshot(
    (snapshot) => {
      if (!ready) {
        ready = true;
        return;
      }
      for (const change of snapshot.docChanges()) {
        if (change.type === "removed") continue;
        const data = change.doc.data();
        if (data.lastSender === "user" && !data.aiPaused) {
          void handleNewUserMessage(change.doc.id);
        }
      }
    },
    (err) => console.error("Chat AI listener error:", err.message)
  );
}

async function handleNewUserMessage(uid) {
  if (inFlight.has(uid)) return;
  inFlight.add(uid);
  try {
    const settings = await getSettings();
    if (!settings.chat?.aiEnabled) return;

    const chatRef = firestoreDb.collection("chats").doc(uid);
    // Re-check right before replying — an admin could have jumped into the
    // thread (setting aiPaused) or the state could've moved on in the time
    // between the change event firing and this running.
    const chatSnap = await chatRef.get();
    const chatData = chatSnap.data();
    if (!chatData || chatData.lastSender !== "user" || chatData.aiPaused) return;

    const messagesSnap = await chatRef.collection("messages").orderBy("createdAt", "asc").limitToLast(20).get();
    const history = messagesSnap.docs.map((d) => d.data());
    if (history.length === 0) return;

    const { reply, escalate } = await generateAiReply(history);
    if (!reply) return;

    await chatRef.collection("messages").add({
      body: reply,
      sender: "ai",
      createdAt: FieldValue.serverTimestamp(),
    });
    await chatRef.set(
      {
        lastMessage: reply,
        lastMessageAt: FieldValue.serverTimestamp(),
        lastSender: "ai",
        // A clean AI resolution clears the inbox flag for this thread; an
        // escalation (or the AI being unsure) keeps/sets it so a human
        // actually sees it rather than assuming the AI handled it.
        unreadByAdmin: escalate ? true : false,
        needsHuman: escalate,
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Chat AI reply failed for", uid, "-", err.response?.data || err.message);
  } finally {
    inFlight.delete(uid);
  }
}
