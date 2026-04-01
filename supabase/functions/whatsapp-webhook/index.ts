import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Supported node types by the engine
const SUPPORTED_NODE_TYPES = new Set([
  "message", "send_link", "pix", "copy_paste",
  "delay", "set_variable", "condition",
  "menu_text", "menu_buttons", "menu_list", "menu_carousel", "poll",
  "capture_text", "capture_name", "capture_email", "capture_phone", "capture_cpf", "capture_number", "capture_date", "wait",
  "transfer_human", "end",
  "send_image", "send_audio", "send_video", "send_file", "send_sticker",
  "send_location", "contact_card", "request_location", "request_payment",
  "typing_indicator",
]);

// ── WhatsApp API helpers ─────────────────────────────────────────────
async function getWhatsAppInstance() {
  const { data, error } = await adminClient
    .from("whatsapp_instances")
    .select("server_url, instance_token, instance_name")
    .eq("user_id", "admin")
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as { server_url: string; instance_token: string; instance_name: string };
}

type Inst = { server_url: string; instance_token: string };

async function waFetch(inst: Inst, path: string, body: Record<string, any>) {
  const res = await fetch(`${inst.server_url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: inst.instance_token },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[SEND] FAILED ${path} status=${res.status} body=${t}`);
    throw new Error(`${path} failed: ${res.status}`);
  }
  console.log(`[SEND] OK ${path}`);
  return true;
}

async function sendWhatsAppText(inst: Inst, phone: string, text: string) {
  await waFetch(inst, "/send/text", { number: phone, text });
  console.log(`[SEND] text to=${phone} "${text.substring(0, 80)}"`);
}

async function sendWhatsAppMedia(inst: Inst, phone: string, type: string, file: string, caption?: string) {
  await waFetch(inst, "/send/media", { number: phone, type, file, ...(caption ? { caption } : {}) });
}

async function sendWhatsAppContact(inst: Inst, phone: string, fullName: string, phoneNumber: string, org?: string, email?: string) {
  await waFetch(inst, "/send/contact", { number: phone, fullName, phoneNumber, ...(org ? { organization: org } : {}), ...(email ? { email } : {}) });
}

async function sendWhatsAppLocation(inst: Inst, phone: string, lat: number, lng: number, name?: string, address?: string) {
  await waFetch(inst, "/send/location", { number: phone, latitude: lat, longitude: lng, ...(name ? { name } : {}), ...(address ? { address } : {}) });
}

async function sendWhatsAppLocationButton(inst: Inst, phone: string, text: string) {
  await waFetch(inst, "/send/location-button", { number: phone, text });
}

async function sendWhatsAppMenu(inst: Inst, phone: string, type: string, text: string, choices: any, opts?: Record<string, any>) {
  await waFetch(inst, "/send/menu", { number: phone, type, text, ...choices, ...(opts || {}) });
}

async function sendWhatsAppCarousel(inst: Inst, phone: string, text: string, cards: any[]) {
  await waFetch(inst, "/send/carousel", { number: phone, text, cards });
}

async function sendWhatsAppPayment(inst: Inst, phone: string, amount: number, opts: Record<string, any>) {
  await waFetch(inst, "/send/request-payment", { number: phone, amount, ...opts });
}

async function sendWhatsAppPresence(inst: Inst, phone: string, presence: string, delay?: number) {
  await waFetch(inst, "/message/presence", { number: phone, presence, ...(delay ? { delay } : {}) });
}

// ── Flow engine ──────────────────────────────────────────────────────
function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
}

interface FlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    category: string;
    nodeType: string;
    config: Record<string, any>;
    description?: string;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

function findNextNodeId(edges: FlowEdge[], currentNodeId: string, handleId?: string): string | null {
  const edge = edges.find(e => e.source === currentNodeId && (!handleId || e.sourceHandle === handleId));
  return edge?.target || null;
}

async function processFlow(
  inst: Inst,
  phone: string,
  incomingText: string,
  sessionId: string,
  flowNodes: FlowNode[],
  flowEdges: FlowEdge[],
  currentNodeId: string | null,
  variables: Record<string, string>,
): Promise<{ nextNodeId: string | null; variables: Record<string, string>; status: string }> {
  
  const nodesMap = new Map(flowNodes.map(n => [n.id, n]));
  let nodeId = currentNodeId;
  let vars = { ...variables };
  
  // If we have a current node that's waiting for input, process the input first
  if (nodeId) {
    const currentNode = nodesMap.get(nodeId);
    if (currentNode) {
      const nt = currentNode.data.nodeType;
      if (nt.startsWith("capture_") || nt === "wait") {
        const varName = currentNode.data.config?.variable || nt.replace("capture_", "");
        vars[varName] = incomingText;
        console.log(`[FLOW] Captured ${varName} = "${incomingText}"`);
        nodeId = findNextNodeId(flowEdges, nodeId);
      }
    }
  }
  
  let safety = 0;
  while (nodeId && safety < 30) {
    safety++;
    const node = nodesMap.get(nodeId);
    if (!node) { console.log(`[FLOW] Node ${nodeId} not found, stopping`); break; }
    
    const nt = node.data.nodeType;
    const cfg = node.data.config || {};
    console.log(`[FLOW] Processing node=${nodeId} type=${nt} label="${node.data.label}"`);

    if (!SUPPORTED_NODE_TYPES.has(nt)) {
      console.log(`[FLOW] Unsupported node type "${nt}", skipping`);
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // ─── Typing indicator ───
    if (nt === "typing_indicator") {
      const seconds = Math.min(cfg.seconds || 3, 15);
      try { await sendWhatsAppPresence(inst, phone, "composing", seconds * 1000); } catch (_) {}
      await new Promise(r => setTimeout(r, seconds * 1000));
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    // ─── Message / send_link / pix / copy_paste ───
    if (nt === "message") {
      const msg = cfg.message || "";
      if (msg) { try { await sendWhatsAppText(inst, phone, replaceVariables(msg, vars)); } catch (e) { console.error(`[FLOW] send fail:`, e.message); } await new Promise(r => setTimeout(r, 500)); }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    if (nt === "send_link") {
      const msg = cfg.message || cfg.url || "";
      if (msg) { try { await sendWhatsAppText(inst, phone, replaceVariables(msg, vars)); } catch (e) { console.error(`[FLOW]`, e.message); } }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    if (nt === "pix") {
      const msg = cfg.message || `Chave Pix: ${cfg.pixKey || ""}${cfg.amount ? `\nValor: R$ ${cfg.amount}` : ""}`;
      if (msg) { try { await sendWhatsAppText(inst, phone, replaceVariables(msg, vars)); } catch (_) {} }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    if (nt === "copy_paste") {
      const msg = cfg.text || "";
      if (msg) { try { await sendWhatsAppText(inst, phone, replaceVariables(msg, vars)); } catch (_) {} }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    // ─── Media nodes ───
    if (nt === "send_image" || nt === "send_video" || nt === "send_audio" || nt === "send_file" || nt === "send_sticker") {
      const file = cfg.file || "";
      if (file) {
        const mediaType = nt === "send_image" ? "image" : nt === "send_video" ? "video" : nt === "send_audio" ? "audio" : nt === "send_file" ? "document" : "sticker";
        try { await sendWhatsAppMedia(inst, phone, mediaType, replaceVariables(file, vars), cfg.caption ? replaceVariables(cfg.caption, vars) : undefined); } catch (e) { console.error(`[FLOW]`, e.message); }
        await new Promise(r => setTimeout(r, 500));
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    // ─── Send location ───
    if (nt === "send_location") {
      const lat = parseFloat(cfg.latitude);
      const lng = parseFloat(cfg.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        try { await sendWhatsAppLocation(inst, phone, lat, lng, cfg.name, cfg.address); } catch (e) { console.error(`[FLOW]`, e.message); }
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    // ─── Contact card ───
    if (nt === "contact_card") {
      const name = cfg.fullName || "";
      const ph = cfg.phoneNumber || "";
      if (name && ph) {
        try { await sendWhatsAppContact(inst, phone, name, ph, cfg.organization, cfg.email); } catch (e) { console.error(`[FLOW]`, e.message); }
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    // ─── Request location button ───
    if (nt === "request_location") {
      const msg = cfg.message || "Compartilhe sua localização";
      try { await sendWhatsAppLocationButton(inst, phone, replaceVariables(msg, vars)); } catch (e) { console.error(`[FLOW]`, e.message); }
      // Wait for user response
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }

    // ─── Menu text ───
    if (nt === "menu_text") {
      const options = (cfg.options || []) as string[];
      if (options.length > 0) {
        const menuMsg = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join("\n");
        const header = cfg.message || "Escolha uma opção:";
        try { await sendWhatsAppText(inst, phone, replaceVariables(`${header}\n\n${menuMsg}`, vars)); } catch (e) { console.error(`[FLOW]`, e.message); }
      }
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }
    
    // ─── Menu buttons (interactive) ───
    if (nt === "menu_buttons") {
      const buttons = (cfg.buttons || []) as any[];
      if (buttons.length > 0) {
        const btnPayload = buttons.map((b: any, i: number) => {
          const isObj = typeof b === "object";
          return { id: `btn-${i}`, text: isObj ? b.text : b, type: isObj ? (b.type || "REPLY") : "REPLY" };
        });
        try {
          await sendWhatsAppMenu(inst, phone, "button", replaceVariables(cfg.message || "Escolha:", vars), { buttons: btnPayload }, cfg.imageButton ? { image: cfg.imageButton } : {});
        } catch (_) {
          // Fallback to text
          const fallback = buttons.map((b: any, i: number) => `${i + 1}. ${typeof b === "object" ? b.text : b}`).join("\n");
          try { await sendWhatsAppText(inst, phone, replaceVariables(`${cfg.message || "Escolha:"}\n\n${fallback}`, vars)); } catch (_) {}
        }
      }
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }

    // ─── Menu list ───
    if (nt === "menu_list") {
      const sections = (cfg.sections || []) as any[];
      if (sections.length > 0) {
        try {
          await sendWhatsAppMenu(inst, phone, "list", replaceVariables(cfg.message || "Escolha:", vars), { sections, listButton: cfg.listButton || "Ver opções" });
        } catch (_) {
          // Fallback to text
          const fallback = sections.flatMap((s: any) => [s.title + ":", ...(s.items || []).map((it: any, i: number) => `  ${i + 1}. ${it.title}`)]).join("\n");
          try { await sendWhatsAppText(inst, phone, replaceVariables(`${cfg.message || "Escolha:"}\n\n${fallback}`, vars)); } catch (_) {}
        }
      }
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }

    // ─── Menu carousel ───
    if (nt === "menu_carousel") {
      const cards = (cfg.cards || []) as any[];
      if (cards.length > 0) {
        try {
          await sendWhatsAppCarousel(inst, phone, replaceVariables(cfg.message || "", vars), cards);
        } catch (_) {
          // Fallback to text with numbered cards
          const fallback = cards.map((c: any, i: number) => `${i + 1}. ${c.text}`).join("\n");
          try { await sendWhatsAppText(inst, phone, replaceVariables(`${cfg.message || ""}\n\n${fallback}`, vars)); } catch (_) {}
        }
      }
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }

    // ─── Poll ───
    if (nt === "poll") {
      const question = cfg.question || "Enquete";
      const options = (cfg.options || []) as string[];
      if (options.length >= 2) {
        try {
          await sendWhatsAppMenu(inst, phone, "poll", replaceVariables(question, vars), { options, selectableCount: cfg.selectableCount || 1 });
        } catch (_) {
          const fallback = options.map((o: string, i: number) => `${i + 1}. ${o}`).join("\n");
          try { await sendWhatsAppText(inst, phone, replaceVariables(`${question}\n\n${fallback}`, vars)); } catch (_) {}
        }
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    // ─── Request payment ───
    if (nt === "request_payment") {
      const amount = parseFloat(cfg.amount);
      if (!isNaN(amount) && amount > 0) {
        try {
          await sendWhatsAppPayment(inst, phone, amount, { pixKey: cfg.pixKey, pixType: cfg.pixType, paymentLink: cfg.paymentLink, boletoCode: cfg.boletoCode });
        } catch (_) {
          // Fallback
          const msg = cfg.message || `💰 Pagamento solicitado: R$ ${amount.toFixed(2)}${cfg.pixKey ? `\nPix: ${cfg.pixKey}` : ""}`;
          try { await sendWhatsAppText(inst, phone, replaceVariables(msg, vars)); } catch (_) {}
        }
      } else if (cfg.message) {
        try { await sendWhatsAppText(inst, phone, replaceVariables(cfg.message, vars)); } catch (_) {}
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // ─── Delay ───
    if (nt === "delay") {
      const seconds = cfg.seconds || 5;
      await new Promise(r => setTimeout(r, Math.min(seconds, 10) * 1000));
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // ─── Set variable ───
    if (nt === "set_variable") {
      const varName = cfg.variable || "";
      const varValue = cfg.value || "";
      if (varName) vars[varName] = replaceVariables(varValue, vars);
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // ─── Condition ───
    if (nt === "condition") {
      const condition = cfg.condition || "";
      let result = false;
      const match = condition.match(/\{\{(\w+)\}\}\s*==\s*['"]?(.+?)['"]?\s*$/);
      if (match) {
        result = (vars[match[1]] || "") === match[2];
      } else if (condition) {
        const varMatch = condition.match(/\{\{(\w+)\}\}/);
        if (varMatch) result = !!(vars[varMatch[1]]);
      }
      nodeId = findNextNodeId(flowEdges, nodeId, result ? "true" : "false");
      continue;
    }
    
    // ─── Input capture nodes ───
    if (nt.startsWith("capture_") || nt === "wait") {
      const prompt = cfg.message || cfg.prompt || "";
      if (prompt) { try { await sendWhatsAppText(inst, phone, replaceVariables(prompt, vars)); } catch (e) { console.error(`[FLOW]`, e.message); } }
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }
    
    // ─── Transfer to human ───
    if (nt === "transfer_human") {
      try { await sendWhatsAppText(inst, phone, replaceVariables("Aguarde, estou transferindo para um atendente humano. 👤", vars)); } catch (_) {}
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "completed", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: null, variables: vars, status: "completed" };
    }
    
    // ─── End ───
    if (nt === "end") {
      await adminClient.from("chat_sessions").update({ current_node_id: null, variables: vars, status: "completed", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: null, variables: vars, status: "completed" };
    }
    
    console.log(`[FLOW] Unhandled node type: ${nt}, skipping`);
    nodeId = findNextNodeId(flowEdges, nodeId);
  }
  
  await adminClient.from("chat_sessions").update({ current_node_id: null, variables: vars, status: "completed", updated_at: new Date().toISOString() }).eq("id", sessionId);
  return { nextNodeId: null, variables: vars, status: "completed" };
}

// ── Handle menu selection ────────────────────────────────────────────
function handleMenuSelection(
  node: FlowNode,
  userInput: string,
  edges: FlowEdge[],
): { nextNodeId: string | null; selectedOption: string | null } {
  const nt = node.data.nodeType;
  
  // Menu text
  if (nt === "menu_text") {
    const options = (node.data.config?.options || []) as string[];
    const num = parseInt(userInput.trim());
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      const idx = num - 1;
      const nextId = findNextNodeId(edges, node.id, `option-${idx}`) || findNextNodeId(edges, node.id);
      return { nextNodeId: nextId, selectedOption: options[idx] };
    }
    const lower = userInput.trim().toLowerCase();
    const matchIdx = options.findIndex(o => o.toLowerCase() === lower);
    if (matchIdx >= 0) {
      const nextId = findNextNodeId(edges, node.id, `option-${matchIdx}`) || findNextNodeId(edges, node.id);
      return { nextNodeId: nextId, selectedOption: options[matchIdx] };
    }
    return { nextNodeId: null, selectedOption: null };
  }

  // Menu buttons
  if (nt === "menu_buttons") {
    const buttons = (node.data.config?.buttons || []) as any[];
    const num = parseInt(userInput.trim());
    if (!isNaN(num) && num >= 1 && num <= buttons.length) {
      const idx = num - 1;
      const nextId = findNextNodeId(edges, node.id, `option-${idx}`) || findNextNodeId(edges, node.id);
      const text = typeof buttons[idx] === "object" ? buttons[idx].text : buttons[idx];
      return { nextNodeId: nextId, selectedOption: text };
    }
    const lower = userInput.trim().toLowerCase();
    const matchIdx = buttons.findIndex((b: any) => (typeof b === "object" ? b.text : b).toLowerCase() === lower);
    if (matchIdx >= 0) {
      const nextId = findNextNodeId(edges, node.id, `option-${matchIdx}`) || findNextNodeId(edges, node.id);
      const text = typeof buttons[matchIdx] === "object" ? buttons[matchIdx].text : buttons[matchIdx];
      return { nextNodeId: nextId, selectedOption: text };
    }
    return { nextNodeId: null, selectedOption: null };
  }

  // Menu list — match by item title or row id
  if (nt === "menu_list") {
    const sections = (node.data.config?.sections || []) as any[];
    const allItems = sections.flatMap((s: any) => s.items || []);
    const lower = userInput.trim().toLowerCase();
    const matchIdx = allItems.findIndex((it: any) => it.title?.toLowerCase() === lower || it.id === userInput.trim());
    if (matchIdx >= 0) {
      const nextId = findNextNodeId(edges, node.id, `option-${matchIdx}`) || findNextNodeId(edges, node.id);
      return { nextNodeId: nextId, selectedOption: allItems[matchIdx].title };
    }
    const num = parseInt(userInput.trim());
    if (!isNaN(num) && num >= 1 && num <= allItems.length) {
      const idx = num - 1;
      const nextId = findNextNodeId(edges, node.id, `option-${idx}`) || findNextNodeId(edges, node.id);
      return { nextNodeId: nextId, selectedOption: allItems[idx].title };
    }
    return { nextNodeId: null, selectedOption: null };
  }

  // Menu carousel — match by card index
  if (nt === "menu_carousel") {
    const cards = (node.data.config?.cards || []) as any[];
    const num = parseInt(userInput.trim());
    if (!isNaN(num) && num >= 1 && num <= cards.length) {
      const idx = num - 1;
      const nextId = findNextNodeId(edges, node.id, `option-${idx}`) || findNextNodeId(edges, node.id);
      return { nextNodeId: nextId, selectedOption: cards[idx].text };
    }
    return { nextNodeId: null, selectedOption: null };
  }

  // Request location — any response continues
  if (nt === "request_location") {
    const nextId = findNextNodeId(edges, node.id);
    return { nextNodeId: nextId, selectedOption: userInput };
  }

  return { nextNodeId: null, selectedOption: null };
}

// ── Main webhook handler ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const eventType = (body.EventType ?? body.event ?? body.type ?? "").toString().toLowerCase();
    
    console.log(`[WEBHOOK] event="${eventType}" keys=${Object.keys(body).join(",")}`);
    console.log(`[WEBHOOK] body=${JSON.stringify(body).substring(0, 500)}`);

    // Handle ChatPresence events
    if (eventType === "chatpresence" || eventType === "presence") {
      const chatId = body.chatid ?? body.chat?.wa_chatid ?? body.from ?? "";
      const state = (body.state ?? body.State ?? body.presence ?? "").toLowerCase();
      const isTyping = state === "composing" || state === "recording";
      const isOnline = isTyping || state === "available" || state === "online";

      if (chatId) {
        await adminClient.from("presence_cache").upsert(
          { chat_id: chatId, is_typing: isTyping, is_online: isOnline, updated_at: new Date().toISOString() },
          { onConflict: "chat_id" }
        );
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }

    // Handle message events
    const hasMessage = body.message || body.messages || body.data?.message;
    const isMessageEvent = eventType.includes("message") || eventType === "" && hasMessage;
    
    if (isMessageEvent || hasMessage) {
      const msg = body.message || body.messages?.[0] || body.data?.message || {};
      const chatId = msg.chatid ?? msg.chat ?? msg.key?.remoteJid ?? body.chatid ?? body.from ?? "";
      const messageText = msg.body ?? msg.text ?? msg.conversation ?? msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? "";
      const fromMe = msg.fromMe ?? msg.key?.fromMe ?? false;
      const phone = chatId.replace("@s.whatsapp.net", "").replace("@c.us", "");
      
      console.log(`[WEBHOOK] Message: phone=${phone}, fromMe=${fromMe}, text="${messageText}"`);

      if (chatId) {
        await adminClient.from("message_signals").upsert(
          { chat_id: chatId, updated_at: new Date().toISOString() },
          { onConflict: "chat_id" }
        );
      }

      if (!fromMe && messageText && phone) {
        // Fire-and-forget: don't block the webhook response
        // This allows multiple users to be processed concurrently
        processIncomingMessage(phone, messageText).catch(err =>
          console.error("[AUTO-REPLY] Background error:", err)
        );
      }
    }

    // Handle connection/disconnection events
    const isConnected = body.event === "connection" || body.status === "CONNECTED" || body.connected === true;
    const isDisconnected = body.event === "disconnected" || body.status === "DISCONNECTED" || body.connected === false;

    if (isConnected) {
      await adminClient.from("whatsapp_instances").update({
        status: "connected", is_connected: true,
        last_connection_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
    } else if (isDisconnected) {
      await adminClient.from("whatsapp_instances").update({
        status: "disconnected", is_connected: false, updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[WEBHOOK] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// ── Process incoming message through active flow ─────────────────────
async function processIncomingMessage(phone: string, text: string) {
  try {
    console.log(`[AUTO-REPLY] Processing message from ${phone}: "${text}"`);

    const { data: flows } = await adminClient
      .from("chatbot_flows")
      .select("id, name, nodes, edges")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);
    
    if (!flows || flows.length === 0) {
      console.log("[AUTO-REPLY] No active flow found");
      return;
    }
    
    const flow = flows[0];
    const flowNodes = flow.nodes as FlowNode[];
    const flowEdges = flow.edges as FlowEdge[];
    
    console.log(`[AUTO-REPLY] Using flow: "${flow.name}" (${flow.id}), nodes=${flowNodes.length}, edges=${flowEdges.length}`);

    if (!flowNodes || flowNodes.length === 0) {
      console.log("[AUTO-REPLY] Flow has no nodes");
      return;
    }

    const supportedNodes = flowNodes.filter(n => SUPPORTED_NODE_TYPES.has(n.data?.nodeType));
    if (supportedNodes.length === 0) {
      console.log(`[AUTO-REPLY] Flow "${flow.name}" has NO supported node types, skipping`);
      return;
    }
    
    const inst = await getWhatsAppInstance();
    if (!inst) {
      console.log("[AUTO-REPLY] No WhatsApp instance found");
      return;
    }

    let customerId: string;
    const { data: existingCustomer } = await adminClient
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await adminClient
        .from("customers")
        .insert({ name: phone, phone, cpf: "000.000.000-00", status: "active" })
        .select("id")
        .single();
      if (custErr || !newCustomer) {
        console.error("[AUTO-REPLY] Failed to create customer:", custErr);
        return;
      }
      customerId = newCustomer.id;
    }
    
    const { data: existingSessions } = await adminClient
      .from("chat_sessions")
      .select("*")
      .eq("customer_id", customerId)
      .in("status", ["active", "waiting"])
      .order("created_at", { ascending: false })
      .limit(1);
    
    let session = existingSessions?.[0];
    
    if (session) {
      console.log(`[AUTO-REPLY] Existing session: ${session.id}, node=${session.current_node_id}, status=${session.status}`);
      
      const currentNodeId = session.current_node_id;
      const variables = (session.variables || {}) as Record<string, string>;
      
      if (currentNodeId) {
        const currentNode = flowNodes.find(n => n.id === currentNodeId);
        
        if (currentNode) {
          const nt = currentNode.data.nodeType;
          
          // Handle menu/list/carousel/request_location selection
          if (nt === "menu_text" || nt === "menu_buttons" || nt === "menu_list" || nt === "menu_carousel" || nt === "request_location") {
            const { nextNodeId, selectedOption } = handleMenuSelection(currentNode, text, flowEdges);
            if (nextNodeId) {
              variables["menu_selection"] = selectedOption || text;
              await processFlow(inst, phone, text, session.id, flowNodes, flowEdges, nextNodeId, variables);
            } else {
              try { await sendWhatsAppText(inst, phone, "❌ Opção inválida. Por favor, escolha uma opção válida."); } catch (_) {}
            }
            return;
          }
          
          // Handle capture nodes
          if (nt.startsWith("capture_") || nt === "wait") {
            await processFlow(inst, phone, text, session.id, flowNodes, flowEdges, currentNodeId, variables);
            return;
          }
        }
      }
      
      console.log("[AUTO-REPLY] Session has no actionable node, restarting flow");
    }
    
    // Start new session
    const targetIds = new Set(flowEdges.map(e => e.target));
    const startNode = flowNodes.find(n => !targetIds.has(n.id));
    
    if (!startNode) {
      console.log("[AUTO-REPLY] No start node found in flow");
      return;
    }
    
    console.log(`[AUTO-REPLY] Starting new session from node: ${startNode.id} (${startNode.data.nodeType})`);
    
    const { data: newSession, error: sessError } = await adminClient
      .from("chat_sessions")
      .insert({ customer_id: customerId, flow_id: flow.id, current_node_id: startNode.id, variables: {}, status: "active" })
      .select()
      .single();
    
    if (sessError || !newSession) {
      console.error("[AUTO-REPLY] Failed to create session:", sessError);
      return;
    }
    
    await processFlow(inst, phone, text, newSession.id, flowNodes, flowEdges, startNode.id, {});
    
  } catch (err) {
    console.error("[AUTO-REPLY] Error:", err);
  }
}
