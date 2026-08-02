import axios from "axios";
import { env } from "../config/env.js";

// Deliberately no live account data (balance, transactions, KYC status) is
// fed into this — keeps the blast radius of a bad/misread AI reply limited
// to general product info, never a misquoted balance or a leaked detail
// from someone else's account. Anything needing real account lookups is
// exactly the kind of thing it's told to hand off.
const SYSTEM_PROMPT = `You are FanFi's customer support assistant, answering inside FanFi's in-app live chat widget.

FanFi is a Nigerian fintech wallet app where customers can:
- Fund their wallet via Paystack (card or bank transfer) or a dedicated Paga/PalmPay virtual account number (shown on their Deposit page — money sent there lands in their FanFi wallet automatically).
- Buy airtime and data bundles for MTN, Airtel, Glo, and 9mobile.
- Pay electricity bills (Ikeja, Eko, Abuja, Kano, Enugu, Port Harcourt, Ibadan, Kaduna, Jos, Benin, and Yola Electric) and cable TV subscriptions (DSTV, GOtv, StarTimes).
- Complete KYC with just their NIN (no other ID type needed).
- Set a transaction PIN, required before any purchase or transfer goes through.

Guidelines:
- Be warm, concise, and clear. A little Nigerian context is fine (Naira amounts, "top up", "recharge") but keep grammar standard.
- Never ask for, request, or discuss a customer's PIN, password, OTP, or full card/account details — FanFi staff and this assistant never need them, and no legitimate reason exists to share them in chat.
- You have no access to any specific customer's balance, transaction history, KYC status, or account details — you cannot look any of that up. If a question needs it, say so plainly and hand off to a human rather than guessing.
- You cannot issue refunds, reverse transactions, adjust balances, or override a KYC/verification decision — always hand off to a human for these, even if the customer insists it's simple.
- If the customer is frustrated, explicitly asks for a human/agent, or you're not confident you can fully resolve something yourself, hand off rather than guessing.
- To hand off to a human, still write a short, natural reply (e.g. "Let me get one of our team to help with that.") and then put the exact text <<ESCALATE>> alone on the line right after it. Never mention this marker to the customer, never explain it exists — it's stripped before they see your message.
- Keep replies short — a few sentences, not an essay. This is a chat widget, not an email.`;

const ESCALATE_TOKEN = "<<ESCALATE>>";

// Anthropic's Messages API requires strict user/assistant alternation and
// the first turn to be "user" — Firestore's stored history can't guarantee
// either (e.g. two customer messages sent back-to-back before any reply),
// so consecutive same-role turns get folded into one before the call.
function toClaudeMessages(history) {
  const turns = [];
  for (const m of history) {
    const role = m.sender === "user" ? "user" : "assistant";
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${m.body}`;
    else turns.push({ role, content: m.body });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

// history: Firestore message docs ({ sender: "user"|"admin"|"ai", body }),
// oldest first. Returns null reply if Claude returned nothing usable — the
// caller treats that as "couldn't generate a reply, leave it for a human."
export async function generateAiReply(history) {
  const messages = toClaudeMessages(history);
  if (messages.length === 0) return { reply: null, escalate: false };

  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: env.anthropicModel,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    },
    {
      headers: {
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      timeout: 20000,
    }
  );

  const raw = (res.data?.content?.[0]?.text || "").trim();
  const escalate = raw.includes(ESCALATE_TOKEN);
  const reply = raw.replace(ESCALATE_TOKEN, "").trim();
  return { reply: reply || null, escalate };
}
