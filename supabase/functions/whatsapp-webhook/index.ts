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
  await waFetch(inst, "/send/menu", {
    number: phone,
    type,
    text,
    message: text,
    ...choices,
    ...(opts || {}),
  });
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

// ── Name memory helpers ──────────────────────────────────────────────
function detectNameChange(text: string): string | null {
  const patterns = [
    /(?:mude|troque|altere|muda|troca)\s+(?:meu\s+)?nome\s+(?:para|pra)\s+(.+)/i,
    /(?:me\s+chame?\s+de)\s+(.+)/i,
    /(?:pode\s+me\s+chamar\s+de)\s+(.+)/i,
    /(?:prefiro\s+ser\s+chamad[oa]\s+de)\s+(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function isValidName(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 50) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return true;
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
      const url = cfg.url || "";
      const label = cfg.label || cfg.buttonText || "Acessar link";
      const msg = cfg.message || "";
      if (url) {
        try {
          await waFetch(inst, "/send/menu", {
            number: phone,
            type: "button",
            text: replaceVariables(msg || "Acesse o link abaixo:", vars),
            choices: [`${replaceVariables(label, vars)}|url:${replaceVariables(url, vars)}`],
          });
        } catch (_) {
          // Fallback: plain text with URL
          const fallbackMsg = msg ? `${msg}\n\n🔗 ${url}` : url;
          try { await sendWhatsAppText(inst, phone, replaceVariables(fallbackMsg, vars)); } catch (_2) {}
        }
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    if (nt === "pix") {
      const pixKey = cfg.pixKey || "";
      const amount = cfg.amount ? `\nValor: R$ ${cfg.amount}` : "";
      const pixMsg = cfg.message || `Chave Pix: ${pixKey}${amount}`;
      if (pixKey) {
        try {
          await waFetch(inst, "/send/menu", {
            number: phone,
            type: "button",
            text: replaceVariables(pixMsg, vars),
            choices: [`Copiar Pix|copy:${replaceVariables(pixKey, vars)}`],
          });
        } catch (_) {
          // Fallback: send as plain text
          try { await sendWhatsAppText(inst, phone, replaceVariables(pixMsg, vars)); } catch (_2) {}
        }
      } else if (pixMsg) {
        try { await sendWhatsAppText(inst, phone, replaceVariables(pixMsg, vars)); } catch (_) {}
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    if (nt === "copy_paste") {
      const textToCopy = cfg.text || cfg.content || "";
      const label = cfg.label || cfg.buttonText || "Copiar";
      const msg = cfg.message || "";
      if (textToCopy) {
        try {
          await waFetch(inst, "/send/menu", {
            number: phone,
            type: "button",
            text: replaceVariables(msg || textToCopy, vars),
            choices: [`${replaceVariables(label, vars)}|copy:${replaceVariables(textToCopy, vars)}`],
          });
        } catch (_) {
          try { await sendWhatsAppText(inst, phone, replaceVariables(textToCopy, vars)); } catch (_2) {}
        }
      }
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
        const btnChoices = buttons.map((b: any) => {
          const label = replaceVariables(typeof b === "object" ? b.text : b, vars);
          return `${label}|reply:${label}`;
        });
        try {
          const menuText = replaceVariables(cfg.message || "Escolha uma opção:", vars);
          await sendWhatsAppMenu(inst, phone, "button", menuText, { choices: btnChoices }, cfg.imageButton ? { image: cfg.imageButton } : {});
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

type IncomingWebhookMessage = {
  id: string;
  chatId: string;
  phone: string;
  text: string;
  fromMe: boolean;
};

function extractIncomingMessages(body: any): IncomingWebhookMessage[] {
  const rawMessages = [
    ...(Array.isArray(body.messages) ? body.messages : []),
    ...(Array.isArray(body.data?.messages) ? body.data.messages : []),
    ...(body.message ? [body.message] : []),
    ...(body.data?.message ? [body.data.message] : []),
  ].filter(Boolean);

  const uniqueMessages = new Map<string, IncomingWebhookMessage>();

  for (const msg of rawMessages) {
    const chatId = (msg.chatid ?? msg.chat ?? msg.key?.remoteJid ?? msg.from ?? body.chatid ?? body.from ?? "").toString();
    const text = (
      msg.body ??
      msg.text ??
      msg.conversation ??
      msg.message?.conversation ??
      msg.message?.extendedTextMessage?.text ??
      ""
    ).toString().trim();
    const fromMe = Boolean(msg.fromMe ?? msg.key?.fromMe ?? false);
    const phone = chatId.replace(/@.*$/, "");
    const id = (msg.id ?? msg.key?.id ?? `${chatId}:${text}:${fromMe}`).toString();

    if (!chatId) continue;

    uniqueMessages.set(id, {
      id,
      chatId,
      phone,
      text,
      fromMe,
    });
  }

  return Array.from(uniqueMessages.values());
}

// ── Flow cache ───────────────────────────────────────────────────────
let cachedFlow: any = null;
let lastCacheTime = 0;
const FLOW_CACHE_TTL = 30_000; // 30s

async function getActiveFlowCached() {
  if (cachedFlow && Date.now() - lastCacheTime < FLOW_CACHE_TTL) return cachedFlow;
  const { data, error } = await adminClient
    .from("chatbot_flows")
    .select("id, name, nodes, edges")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[FLOW-CACHE] DB error fetching flow:", error.message);
    return null;
  }
  cachedFlow = data?.[0] ?? null;
  lastCacheTime = Date.now();
  return cachedFlow;
}

// ── Group / noise filter ─────────────────────────────────────────────
function isGroupOrNoise(chatId: string): boolean {
  if (chatId.includes("@g.us")) return true;
  if (chatId.includes("@broadcast")) return true;
  // Group LIDs or status updates
  const digits = chatId.replace(/@.*$/, "");
  if (digits.length > 15) return true;
  // WhatsApp service numbers
  if (digits === "0" || digits === "status") return true;
  return false;
}

const MAX_MESSAGES_PER_INVOCATION = 5;

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

    // Handle message events (single or batched)
    const hasMessage = body.message || body.messages || body.data?.message || body.data?.messages;
    const isMessageEvent = eventType === "message" || eventType === "messages" || (!!hasMessage && eventType === "");
    
    if (isMessageEvent || hasMessage) {
      const incomingMessages = extractIncomingMessages(body);
      
      // Filter out groups, noise, fromMe, empty text
      const validMessages = incomingMessages.filter(({ chatId, phone, text, fromMe }) => {
        if (isGroupOrNoise(chatId)) {
          console.log(`[WEBHOOK] SKIP group/noise: ${chatId}`);
          return false;
        }
        if (fromMe || !text || !phone) return false;
        return true;
      });

      console.log(`[WEBHOOK] extracted=${incomingMessages.length} valid=${validMessages.length}`);

      // Signal updates for ALL non-group messages (even fromMe) for UI refresh
      for (const { chatId } of incomingMessages.filter(m => !isGroupOrNoise(m.chatId))) {
        await adminClient.from("message_signals").upsert(
          { chat_id: chatId, updated_at: new Date().toISOString() },
          { onConflict: "chat_id" }
        ).then(({ error }) => { if (error) console.error("[WEBHOOK] signal upsert error:", error.message); });
      }

      // Process at most MAX_MESSAGES_PER_INVOCATION in series
      const toProcess = validMessages.slice(0, MAX_MESSAGES_PER_INVOCATION);
      if (toProcess.length < validMessages.length) {
        console.log(`[WEBHOOK] Throttled: processing ${toProcess.length} of ${validMessages.length}`);
      }

      const backgroundTask = (async () => {
        for (const { phone, text } of toProcess) {
          try {
            await processIncomingMessage(phone, text);
          } catch (err) {
            console.error(`[AUTO-REPLY] Error for ${phone}:`, err);
          }
        }
      })();

      const edgeRuntime = (globalThis as typeof globalThis & {
        EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
      }).EdgeRuntime;
      edgeRuntime?.waitUntil?.(backgroundTask);
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

    const flow = await getActiveFlowCached();
    
    if (!flow) {
      console.log("[AUTO-REPLY] No active flow found");
      return;
    }
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
      // Use phone as unique CPF placeholder to avoid duplicate constraint
      const placeholderCpf = phone.replace(/\D/g, "").slice(-11).padStart(11, "0").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      const { data: newCustomer, error: custErr } = await adminClient
        .from("customers")
        .insert({ name: phone, phone, cpf: placeholderCpf, status: "active" })
        .select("id")
        .single();
      if (custErr) {
        // If CPF conflict, try to find existing customer by CPF
        if (custErr.code === "23505") {
          const { data: byCpf } = await adminClient.from("customers").select("id").eq("cpf", placeholderCpf).maybeSingle();
          if (byCpf) { customerId = byCpf.id; }
          else { console.error("[AUTO-REPLY] CPF conflict but no customer found:", custErr); return; }
        } else {
          console.error("[AUTO-REPLY] Failed to create customer:", custErr);
          return;
        }
      } else {
        customerId = newCustomer!.id;
      }
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
      
      // ── Detect name change request at any point ──
      const newName = detectNameChange(text);
      if (newName && isValidName(newName)) {
        variables["nome"] = newName;
        variables["name"] = newName;
        await adminClient.from("chat_sessions").update({ variables, updated_at: new Date().toISOString() }).eq("id", session.id);
        await adminClient.from("customers").update({ name: newName, updated_at: new Date().toISOString() }).eq("id", customerId);
        try { await sendWhatsAppText(inst, phone, `Nome atualizado para ${newName}. Como posso ajudar, ${newName}?`); } catch (_) {}
        return;
      }
      
      // ── Awaiting name capture ──
      if (variables["__awaiting_name"] === "true") {
        if (isValidName(text)) {
          const nome = text.trim();
          variables["nome"] = nome;
          variables["name"] = nome;
          delete variables["__awaiting_name"];
          await adminClient.from("customers").update({ name: nome, updated_at: new Date().toISOString() }).eq("id", customerId);
          // Now start the actual flow (the welcome node will greet by name)
          const targetIds2 = new Set(flowEdges.map(e => e.target));
          const startNode2 = flowNodes.find(n => !targetIds2.has(n.id));
          if (startNode2) {
            await adminClient.from("chat_sessions").update({ variables, current_node_id: startNode2.id, updated_at: new Date().toISOString() }).eq("id", session.id);
            await new Promise(r => setTimeout(r, 500));
            await processFlow(inst, phone, "", session.id, flowNodes, flowEdges, startNode2.id, variables);
          } else {
            await adminClient.from("chat_sessions").update({ variables, status: "completed", updated_at: new Date().toISOString() }).eq("id", session.id);
          }
          return;
        } else {
          try { await sendWhatsAppText(inst, phone, "Desculpe, não entendi o nome — como você prefere ser chamado(a)?"); } catch (_) {}
          return;
        }
      }
      
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
              await new Promise(r => setTimeout(r, 500));
              await processFlow(inst, phone, "", session.id, flowNodes, flowEdges, currentNodeId, variables);
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
    
    // Check if customer already has a real name
    const { data: customerData } = await adminClient.from("customers").select("name").eq("id", customerId).single();
    const hasRealName = customerData?.name && customerData.name !== phone && !/^\d+$/.test(customerData.name);
    
    if (hasRealName) {
      const vars: Record<string, string> = { nome: customerData.name, name: customerData.name };
      const { data: newSession, error: sessError } = await adminClient
        .from("chat_sessions")
        .insert({ customer_id: customerId, flow_id: flow.id, current_node_id: startNode.id, variables: vars, status: "active" })
        .select().single();
      if (sessError || !newSession) { console.error("[AUTO-REPLY] Failed to create session:", sessError); return; }
      try { await sendWhatsAppText(inst, phone, `Olá, ${customerData.name}! Como posso ajudar?`); } catch (_) {}
      await new Promise(r => setTimeout(r, 500));
      await processFlow(inst, phone, text, newSession.id, flowNodes, flowEdges, startNode.id, vars);
    } else {
      const { data: newSession, error: sessError } = await adminClient
        .from("chat_sessions")
        .insert({ customer_id: customerId, flow_id: flow.id, current_node_id: null, variables: { __awaiting_name: "true" }, status: "active" })
        .select().single();
      if (sessError || !newSession) { console.error("[AUTO-REPLY] Failed to create session:", sessError); return; }
      try { await sendWhatsAppText(inst, phone, "Olá! Como você gostaria de ser chamado(a)?"); } catch (_) {}
    }
    
  } catch (err) {
    console.error("[AUTO-REPLY] Error:", err);
  }
}
