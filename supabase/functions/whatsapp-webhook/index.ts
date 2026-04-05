import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Supported node types by the engine
const SUPPORTED_NODE_TYPES = new Set([
  "message", "send_link", "pix", "copy_paste",
  "delay", "set_variable", "condition",
  "menu_text", "menu_buttons", "menu_list", "poll",
  "capture_text", "capture_name", "capture_email", "capture_phone", "capture_cpf", "capture_number", "capture_date",
  "capture_image", "capture_audio", "capture_file", "capture_location",
  "wait",
  "transfer_human", "end",
  "send_image", "send_audio", "send_video", "send_file", "send_sticker",
  "send_location", "contact_card", "request_location", "request_payment", "vehicle_carousel",
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

async function sendWhatsAppSticker(inst: Inst, phone: string, file: string) {
  await waFetch(inst, "/send/media", { number: phone, type: "sticker", file });
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


async function sendWhatsAppPayment(inst: Inst, phone: string, amount: number, opts: Record<string, any>) {
  await waFetch(inst, "/send/request-payment", { number: phone, amount, ...opts });
}

async function sendWhatsAppPresence(inst: Inst, phone: string, presence: string, delay?: number) {
  await waFetch(inst, "/message/presence", { number: phone, presence, ...(delay ? { delay } : {}) });
}

// ── imgbb re-host helper ──────────────────────────────────────────────
async function uploadToImgbbFromUrl(imageUrl: string): Promise<string | null> {
  const IMGBB_KEY = Deno.env.get("IMGBB_API_KEY");
  if (!IMGBB_KEY) { console.error("[IMGBB] No API key"); return null; }
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) { console.error(`[IMGBB] fetch failed ${imgRes.status}`); return null; }
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
    }
    const b64 = btoa(binary);
    const form = new FormData();
    form.append("image", b64);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: form });
    const json = await res.json();
    if (json.success) {
      console.log(`[IMGBB] Uploaded: ${json.data.url}`);
      return json.data.url as string;
    }
    console.error(`[IMGBB] Upload failed:`, JSON.stringify(json));
    return null;
  } catch (e) {
    console.error(`[IMGBB] Error:`, e);
    return null;
  }
}

async function downloadAndRehost(inst: Inst, messageId: string): Promise<string | null> {
  try {
    const res = await fetch(`${inst.server_url}/message/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: inst.instance_token },
      body: JSON.stringify({ id: messageId, return_link: true }),
    });
    if (!res.ok) { console.error(`[DOWNLOAD] failed ${res.status}`); return null; }
    const data = await res.json();
    const fileUrl = data?.fileURL || data?.fileUrl || data?.url || data?.file || "";
    if (!fileUrl) { console.error("[DOWNLOAD] No fileURL in response"); return null; }
    console.log(`[DOWNLOAD] Got temp URL, uploading to imgbb...`);
    return await uploadToImgbbFromUrl(fileUrl);
  } catch (e) {
    console.error(`[DOWNLOAD] Error:`, e);
    return null;
  }
}

// ── Profile picture helper ────────────────────────────────────────────
async function fetchProfilePicUrl(inst: Inst, phone: string): Promise<string | null> {
  try {
    const res = await fetch(`${inst.server_url}/chat/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: inst.instance_token },
      body: JSON.stringify({ number: phone, preview: false }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const url = data?.image || data?.imagePreview || data?.wa_profilePicUrl || "";
    return url || null;
  } catch (e) {
    console.log(`[PROFILE-PIC] Failed to fetch for ${phone}:`, e);
    return null;
  }
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
  customerId: string,
  flowNodes: FlowNode[],
  flowEdges: FlowEdge[],
  currentNodeId: string | null,
  variables: Record<string, string>,
  incomingMediaUrl?: string,
  incomingMediaType?: string,
  incomingMediaFileName?: string,
  incomingId?: string,
): Promise<{ nextNodeId: string | null; variables: Record<string, string>; status: string }> {
  
  const nodesMap = new Map(flowNodes.map(n => [n.id, n]));
  let nodeId = currentNodeId;
  let vars = { ...variables };
  
  // Variable names that should persist as customer name
  const NAME_VARS = ["nome_contato", "nome_usuario", "nome", "name"];
  
  // If we have a current node that's waiting for input, process the input first
  if (nodeId) {
    const currentNode = nodesMap.get(nodeId);
    if (currentNode) {
      const nt = currentNode.data.nodeType;
      if (nt.startsWith("capture_") || nt === "wait") {
        let varName = currentNode.data.config?.variable || nt.replace("capture_", "");
        varName = varName.replace(/^\{\{/, "").replace(/\}\}$/, "").trim();
        
        // Media capture nodes: save file URL to customer_files and variable
        const isMediaCapture = nt === "capture_image" || nt === "capture_audio" || nt === "capture_file";
        const hasMedia = !!incomingMediaUrl || (isMediaCapture && incomingMediaType && incomingId);
        if (isMediaCapture && hasMedia) {
          const fileType = nt === "capture_image" ? "image" : nt === "capture_audio" ? "audio" : "file";
          
          // Download and re-host to imgbb for permanent URL
          let permanentUrl = incomingMediaUrl || "";
          if (nt === "capture_image") {
            // Try direct URL upload first (faster, avoids re-download)
            if (incomingMediaUrl) {
              const rehosted = await uploadToImgbbFromUrl(incomingMediaUrl);
              if (rehosted) {
                permanentUrl = rehosted;
                console.log(`[FLOW] Re-hosted image via direct URL to imgbb: ${permanentUrl}`);
              } else {
                console.log(`[FLOW] Direct re-host failed, trying downloadAndRehost fallback`);
                if (incomingId) {
                  const fallback = await downloadAndRehost(inst, incomingId);
                  if (fallback) permanentUrl = fallback;
                }
              }
            } else if (incomingId) {
              const rehosted = await downloadAndRehost(inst, incomingId);
              if (rehosted) {
                permanentUrl = rehosted;
                console.log(`[FLOW] Re-hosted image via downloadAndRehost: ${permanentUrl}`);
              } else {
                console.log(`[FLOW] Re-host failed, using original URL`);
              }
            }
          }
          
          vars[varName] = permanentUrl;
          console.log(`[FLOW] Captured media ${varName} = "${permanentUrl}" (${fileType})`);
          
          // Save to customer_files table
          try {
            await adminClient.from("customer_files").insert({
              customer_id: customerId,
              file_type: fileType,
              file_url: permanentUrl,
              file_name: incomingMediaFileName || "",
              variable_name: varName,
            });
            console.log(`[FLOW] Saved file to customer_files for ${customerId}`);
          } catch (e) {
            console.log(`[FLOW] Error saving customer_file: ${e}`);
          }
        } else if (isMediaCapture && !incomingMediaUrl && incomingMediaType) {
          // Media detected (e.g. image) but URL not yet available — uazapi will send FileDownloaded later
          console.log(`[FLOW] Media type "${incomingMediaType}" detected without URL, waiting for FileDownloaded event...`);
          await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
          return { nextNodeId: nodeId, variables: vars, status: "waiting" };
        } else if (isMediaCapture && !incomingMediaUrl && !incomingMediaType) {
          // User sent text instead of media — ask again
          const promptMsg = currentNode.data.config?.message || "Por favor, envie um arquivo válido.";
          try { await sendWhatsAppText(inst, phone, "❌ " + replaceVariables(promptMsg, vars)); } catch (_) {}
          await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
          return { nextNodeId: nodeId, variables: vars, status: "waiting" };
        } else if (nt === "capture_location") {
          // If location was already saved in variables (from request_location handler), keep it
          if (vars[varName] && vars[varName].match(/^-?\d+\.?\d*,-?\d+\.?\d*$/)) {
            console.log(`[FLOW] capture_location: keeping existing ${varName} = "${vars[varName]}"`);
          } else {
            vars[varName] = incomingText || vars[varName] || "";
            console.log(`[FLOW] Captured ${varName} = "${vars[varName]}"`);
          }
        } else {
          vars[varName] = incomingText;
          console.log(`[FLOW] Captured ${varName} = "${incomingText}"`);
        }
        // If this is a name variable, save to customers table
        if (NAME_VARS.includes(varName) && isValidName(incomingText)) {
          console.log(`[FLOW] Saving customer name: "${incomingText}"`);
          await adminClient.from("customers").update({ name: incomingText.trim() }).eq("id", customerId);
          vars.nome = incomingText.trim();
          vars.name = incomingText.trim();
          vars.nome_contato = incomingText.trim();
          vars.nome_usuario = incomingText.trim();
        }
        
        // Auto-sync custom fields: check if varName matches a field definition
        if (!NAME_VARS.includes(varName)) {
          try {
            const { data: fieldDef } = await adminClient
              .from("customer_field_definitions")
              .select("field_key")
              .eq("field_key", varName)
              .maybeSingle();
            if (fieldDef) {
              const syncValue = vars[varName] || incomingText.trim();
              console.log(`[FLOW] Syncing custom field ${varName} = "${syncValue}"`);
              // Merge into custom_fields JSONB
              const { data: cust } = await adminClient
                .from("customers")
                .select("custom_fields")
                .eq("id", customerId)
                .single();
              const existing = (cust?.custom_fields as Record<string, string>) || {};
              existing[varName] = syncValue;
              await adminClient.from("customers")
                .update({ custom_fields: existing })
                .eq("id", customerId);
            }
          } catch (e) {
            console.log(`[FLOW] Error syncing custom field: ${e}`);
          }
        }
        
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
    // ─── Sticker (dedicated endpoint) ───
    if (nt === "send_sticker") {
      const file = cfg.file || "";
      if (file) {
        try { await sendWhatsAppSticker(inst, phone, replaceVariables(file, vars)); } catch (e) { console.error(`[FLOW]`, e.message); }
        await new Promise(r => setTimeout(r, 500));
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    // ─── Media nodes ───
    if (nt === "send_image" || nt === "send_video" || nt === "send_audio" || nt === "send_file") {
      const file = cfg.file || "";
      if (file) {
        const mediaType = nt === "send_image" ? "image" : nt === "send_video" ? "video" : nt === "send_audio" ? "ptt" : "document";
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
        const locName = replaceVariables(cfg.name || "", vars);
        const locAddr = replaceVariables(cfg.address || "", vars);
        try {
          await sendWhatsAppLocation(inst, phone, lat, lng, locName, locAddr);
        } catch (e) {
          console.error(`[FLOW] /send/location failed, sending text fallback`, e.message);
          const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          const fallback = locName ? `📍 ${locName}\n${locAddr || ""}\n${mapsUrl}` : `📍 ${mapsUrl}`;
          try { await sendWhatsAppText(inst, phone, fallback.trim()); } catch (_) {}
        }
      } else {
        console.warn(`[FLOW] send_location skipped: invalid lat="${cfg.latitude}" lng="${cfg.longitude}"`);
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }

    // ─── Vehicle carousel ───
    if (nt === "vehicle_carousel") {
      const carouselMsg = replaceVariables(cfg.message || "Confira nossos veículos disponíveis:", vars);
      const btnText = replaceVariables(cfg.buttonText || "Quero este", vars);
      const selectedVehicles: { id: string; name: string }[] = cfg.vehicles || [];
      try {
        if (!selectedVehicles.length) {
          await sendWhatsAppText(inst, phone, "😕 Nenhum veículo configurado neste carrossel.");
        } else {
          const vehicleIds = selectedVehicles.map((v: any) => v.id);
          const { data: vehicles, error: vErr } = await adminClient
            .from("vehicles")
            .select("id, name, brand, model, year, color, daily_rate, weekly_rate, monthly_rate, images")
            .in("id", vehicleIds);
          if (vErr) throw vErr;
          // Sort in the same order as config
          const vehicleMap = new Map((vehicles || []).map((v: any) => [v.id, v]));
          const ordered = selectedVehicles.map((sv: any) => vehicleMap.get(sv.id)).filter(Boolean);
          if (ordered.length < 2) {
            await sendWhatsAppText(inst, phone, "😕 No momento não temos veículos suficientes para exibir. Tente novamente mais tarde!");
          } else {
            const carousel = ordered.map((v: any) => ({
              text: `${v.name} - ${v.brand} ${v.model}\n${v.year} • ${v.color}\nDiária: R$ ${Number(v.daily_rate).toFixed(2)}\nSemanal: R$ ${Number(v.weekly_rate).toFixed(2)}\nMensal: R$ ${Number(v.monthly_rate).toFixed(2)}`,
              image: v.images?.[0] || "",
              buttons: [{ id: `veiculo_${v.id}`, text: btnText.slice(0, 20), type: "REPLY" }],
            }));
            try {
              await waFetch(inst, "/send/carousel", { number: phone, text: carouselMsg, carousel });
              console.log(`[FLOW] Sent vehicle carousel with ${carousel.length} cards`);
            } catch (carouselErr) {
              console.error(`[FLOW] /send/carousel failed, sending text fallback`, carouselErr.message);
              for (const v of ordered) {
                const img = (v as any).images?.[0];
                const text = `🚗 *${(v as any).name}*\n${(v as any).brand} ${(v as any).model} ${(v as any).year}\n${(v as any).color}\n💰 Diária: R$ ${Number((v as any).daily_rate).toFixed(2)}`;
                if (img) { try { await sendWhatsAppMedia(inst, phone, "image", img, text); } catch (_) {} }
                else { try { await sendWhatsAppText(inst, phone, text); } catch (_) {} }
                await new Promise(r => setTimeout(r, 300));
              }
            }
          }
        }
      } catch (e) {
        console.error(`[FLOW] vehicle_carousel error:`, e.message);
        try { await sendWhatsAppText(inst, phone, "Erro ao buscar veículos. Tente novamente."); } catch (_) {}
      }
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
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
          const imgUrl = cfg.imageButton ? replaceVariables(cfg.imageButton, vars) : "";
          if (imgUrl) {
            // Send image first with menu text as caption, then buttons separately
            await sendWhatsAppMedia(inst, phone, "image", imgUrl, menuText);
            await sendWhatsAppMenu(inst, phone, "button", "Escolha uma opção:", { choices: btnChoices });
          } else {
            await sendWhatsAppMenu(inst, phone, "button", menuText, { choices: btnChoices });
          }
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
      let sections = (cfg.sections || []) as any[];

      // ── Dynamic vehicle menu: fetch available vehicles from DB ──
      if (cfg.dynamic === "vehicles") {
        try {
          const { data: vehicles, error: vErr } = await adminClient
            .from("vehicles")
            .select("id, name, brand, model, year, daily_rate, category, status")
            .eq("status", "available")
            .order("name");
          if (vErr) throw vErr;
          if (vehicles && vehicles.length > 0) {
            // Group vehicles by category
            const grouped: Record<string, any[]> = {};
            for (const v of vehicles) {
              const cat = (v.category || "outros").charAt(0).toUpperCase() + (v.category || "outros").slice(1);
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(v);
            }
            sections = Object.entries(grouped).map(([cat, items]) => ({
              title: cat,
              items: items.map((v: any) => ({
                title: `${v.name}`,
                description: `${v.brand} ${v.model} ${v.year} • R$ ${Number(v.daily_rate).toFixed(0)}/dia`,
                id: v.id,
              })),
            }));
            console.log(`[FLOW] Dynamic vehicles: ${vehicles.length} available, ${Object.keys(grouped).length} categories`);
          } else {
            sections = [{ title: "Veículos", items: [{ title: "Sem veículos disponíveis", description: "Nenhum veículo disponível no momento", id: "none" }] }];
          }
        } catch (dbErr) {
          console.error(`[FLOW] Failed to fetch vehicles:`, dbErr);
        }
      }

      if (sections.length > 0) {
        try {
          // Convert sections to flat choices array as required by uazapi API
          const choices: string[] = [];
          for (const s of sections) {
            choices.push(`[${s.title}]`);
            for (const it of (s.items || s.rows || [])) {
              const parts = [it.title];
              if (it.id || it.rowId) parts.push(it.id || it.rowId);
              if (it.description) parts.push(it.description);
              choices.push(parts.join("|"));
            }
          }
          const menuText = replaceVariables(cfg.message || "Escolha:", vars);
          const listButton = cfg.listButton || "Ver opções";
          console.log(`[FLOW] menu_list choices=${JSON.stringify(choices)} listButton=${listButton}`);
          await sendWhatsAppMenu(inst, phone, "list", menuText, { choices, listButton });
        } catch (menuErr) {
          console.error(`[FLOW] menu_list send failed:`, menuErr);
          const fallback = sections.flatMap((s: any) => [s.title + ":", ...(s.items || s.rows || []).map((it: any, i: number) => `  ${i + 1}. ${it.title}`)]).join("\n");
          try { await sendWhatsAppText(inst, phone, replaceVariables(`${cfg.message || "Escolha:"}\n\n${fallback}`, vars)); } catch (_) {}
        }
      }

      // Store dynamic sections in session vars so handleMenuSelection can match
      if (cfg.dynamic === "vehicles") {
        vars["__dynamic_sections"] = JSON.stringify(sections);
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
          await sendWhatsAppMenu(inst, phone, "poll", replaceVariables(question, vars), { 
            choices: options, 
            selectableCount: cfg.selectableCount || 1 
          });
        } catch (_) {
          const fallback = options.map((o: string, i: number) => `${i + 1}. ${o}`).join("\n");
          try { await sendWhatsAppText(inst, phone, replaceVariables(`${question}\n\n${fallback}`, vars)); } catch (_) {}
        }
      }
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
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
    
    // ─── Capture location node ───
    if (nt === "capture_location") {
      const prompt = cfg.message || "Compartilhe sua localização";
      try { await sendWhatsAppLocationButton(inst, phone, replaceVariables(prompt, vars)); } catch (e) { console.error(`[FLOW]`, e.message); }
      await adminClient.from("chat_sessions").update({ current_node_id: nodeId, variables: vars, status: "waiting", updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
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

  // Menu list — match by item title, row id, or dynamic sections from session vars
  if (nt === "menu_list") {
    let sections = (node.data.config?.sections || []) as any[];
    // For dynamic menus, sections are stored in session variables
    // (caller should pass them if available — we check config.dynamic)
    const allItems = sections.flatMap((s: any) => s.items || s.rows || []);
    const lower = userInput.trim().toLowerCase();
    const matchIdx = allItems.findIndex((it: any) => it.title?.toLowerCase() === lower || it.id === userInput.trim() || it.rowId === userInput.trim());
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


  // Request location — any response continues
  if (nt === "request_location") {
    const nextId = findNextNodeId(edges, node.id);
    return { nextNodeId: nextId, selectedOption: userInput };
  }

  // Poll — match by option text or number
  if (nt === "poll") {
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

  return { nextNodeId: null, selectedOption: null };
}

type IncomingWebhookMessage = {
  id: string;
  chatId: string;
  phone: string;
  text: string;
  fromMe: boolean;
  mediaUrl?: string;
  mediaType?: string;
  mediaFileName?: string;
  latitude?: number;
  longitude?: number;
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
      msg.body ||
      msg.text ||
      msg.conversation ||
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      (typeof msg.content === "object" && msg.content !== null
        ? (msg.content.selectedID || msg.content.selectedDisplayText)
        : undefined) ||
      msg.buttonOrListid ||
      ""
    ).toString().trim();
    const fromMe = Boolean(msg.fromMe ?? msg.key?.fromMe ?? false);
    const phone = chatId.replace(/@.*$/, "");
    const id = (msg.id ?? msg.key?.id ?? `${chatId}:${text}:${fromMe}`).toString();

    // Extract media URL from various message formats
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mediaFileName: string | undefined;

    const msgContent = msg.message || msg;
    // Detect mimetype-based type — expand to check msg.content object and case variants
    const contentObj = typeof msg.content === "object" && msg.content !== null ? msg.content : null;
    const mimetype = (
      msg.mimetype || msg.mimeType || msg.MimeType ||
      contentObj?.mimetype || contentObj?.mimeType || contentObj?.MimeType ||
      msgContent.imageMessage?.mimetype ||
      msgContent.audioMessage?.mimetype ||
      msgContent.documentMessage?.mimetype ||
      msgContent.videoMessage?.mimetype ||
      ""
    ).toString();
    const detectedTypeByMime = mimetype.startsWith("image") ? "image"
      : mimetype.startsWith("audio") ? "audio"
      : mimetype.startsWith("video") ? "video"
      : mimetype.startsWith("application") ? "document" : "";

    // Case-insensitive msg.type check
    const msgTypeLower = (msg.type || msg.Type || "").toString().toLowerCase();

    // Log raw message keys for media debugging
    if (mimetype || msgTypeLower === "image" || msgTypeLower === "audio" || msgTypeLower === "video" || msgTypeLower === "document" || msgTypeLower === "ptt" || contentObj) {
      console.log(`[WEBHOOK] msg keys=${Object.keys(msg).join(",")} type=${msg.type} mimetype=${mimetype} content_type=${typeof msg.content} content_keys=${contentObj ? Object.keys(contentObj).join(",") : "n/a"}`);
    }

    if (msgContent.imageMessage || msgTypeLower === "image" || msg.mediatype === "image" || detectedTypeByMime === "image") {
      mediaUrl = msgContent.imageMessage?.url || msg.fileURL || msg.fileUrl || msg.mediaUrl || msg.media || msg.file || msg.image || contentObj?.url || contentObj?.fileUrl || contentObj?.fileURL || "";
      mediaType = "image";
      mediaFileName = msgContent.imageMessage?.fileName || msg.fileName || "";
    } else if (msgContent.audioMessage || msgTypeLower === "audio" || msgTypeLower === "ptt" || msg.mediatype === "audio" || msg.mediatype === "ptt" || detectedTypeByMime === "audio") {
      mediaUrl = msgContent.audioMessage?.url || msg.fileURL || msg.fileUrl || msg.mediaUrl || msg.media || msg.file || msg.audio || contentObj?.url || "";
      mediaType = "audio";
      mediaFileName = msg.fileName || "audio.ogg";
    } else if (msgContent.documentMessage || msgTypeLower === "document" || msg.mediatype === "document" || detectedTypeByMime === "document") {
      mediaUrl = msgContent.documentMessage?.url || msg.fileURL || msg.fileUrl || msg.mediaUrl || msg.media || msg.file || contentObj?.url || "";
      mediaType = "file";
      mediaFileName = msgContent.documentMessage?.fileName || msg.fileName || "document";
    } else if (msgContent.videoMessage || msgTypeLower === "video" || msg.mediatype === "video" || detectedTypeByMime === "video") {
      mediaUrl = msgContent.videoMessage?.url || msg.fileURL || msg.fileUrl || msg.mediaUrl || msg.media || msg.file || contentObj?.url || "";
      mediaType = "file";
      mediaFileName = msg.fileName || "video.mp4";
    }

    // Extract location data from content object
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (contentObj && contentObj.degreesLatitude != null && contentObj.degreesLongitude != null) {
      latitude = Number(contentObj.degreesLatitude);
      longitude = Number(contentObj.degreesLongitude);
    } else if (msgContent.locationMessage) {
      latitude = Number(msgContent.locationMessage.degreesLatitude);
      longitude = Number(msgContent.locationMessage.degreesLongitude);
    }

    if (!chatId) continue;

    uniqueMessages.set(id, {
      id,
      chatId,
      phone,
      text,
      fromMe,
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(mediaType ? { mediaType } : {}),
      ...(mediaFileName ? { mediaFileName } : {}),
      ...(latitude != null ? { latitude, longitude } : {}),
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

    // Handle FileDownloaded events — can come as messages_update or as a root-level EventType
    const fileDownloadedEvt = (() => {
      if (eventType === "messages_update") {
        const evt = body.event || {};
        const evtType = (evt.Type || evt.type || body.state || body.type || "").toString().toLowerCase();
        if (evtType === "filedownloaded") return evt;
      }
      // Also check root-level EventType (case-insensitive)
      if (eventType.toLowerCase() === "filedownloaded") return body.event || body;
      return null;
    })();

    if (fileDownloadedEvt) {
      const evt = fileDownloadedEvt;
      const fileUrl = evt.FileURL || evt.fileURL || evt.fileUrl || body.FileURL || body.fileURL || body.fileUrl || "";
      const mimeType = (evt.MimeType || evt.mimetype || body.MimeType || body.mimetype || "").toString();
      const chatId = (evt.Chat || evt.chatid || body.Chat || body.chatid || "").toString();
      const phone = chatId.replace(/@.*$/, "");
      const msgIds = evt.MessageIDs || body.MessageIDs || [];
      const msgId = msgIds[0] || "";
      const fromMe = Boolean(evt.IsFromMe ?? body.IsFromMe ?? false);

      console.log(`[WEBHOOK] FileDownloaded detected: phone=${phone} fileUrl=${fileUrl ? fileUrl.substring(0, 80) : "(empty)"} mime=${mimeType} fromMe=${fromMe}`);

      if (fileUrl && phone && !fromMe && (mimeType.startsWith("image") || mimeType.startsWith("video") || mimeType.startsWith("application") || !mimeType)) {
        // Signal for UI refresh
        if (chatId) {
          await adminClient.from("message_signals").upsert(
            { chat_id: chatId, updated_at: new Date().toISOString() },
            { onConflict: "chat_id" }
          );
        }

        const detectedMediaType = mimeType.startsWith("image") ? "image" : "file";
        
        // Process as media message synchronously (must complete before response)
        try {
          await processIncomingMessage(phone, "", fileUrl, detectedMediaType, "", msgId);
          console.log(`[WEBHOOK] FileDownloaded processed successfully for ${phone}`);
        } catch (err) {
          console.error(`[AUTO-REPLY] FileDownloaded error:`, err);
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }

    // Log any messages_update with FileURL that we didn't catch above (debug)
    if (eventType === "messages_update") {
      const evt = body.event || {};
      const anyFileUrl = evt.FileURL || evt.fileURL || evt.fileUrl || body.FileURL || body.fileURL || body.fileUrl;
      if (anyFileUrl) {
        console.log(`[WEBHOOK] Uncaught FileURL in messages_update: type=${evt.Type || evt.type} url=${anyFileUrl.substring(0, 80)}`);
      }
    }

    // Handle message events (single or batched)
    const hasMessage = body.message || body.messages || body.data?.message || body.data?.messages;
    const isMessageEvent = eventType === "message" || eventType === "messages" || (!!hasMessage && eventType === "");
    
    if (isMessageEvent || hasMessage) {
      const incomingMessages = extractIncomingMessages(body);
      
      // Filter out groups, noise, fromMe, empty text
      const validMessages = incomingMessages.filter(({ chatId, phone, text, fromMe, mediaUrl, mediaType, latitude }) => {
        if (isGroupOrNoise(chatId)) {
          console.log(`[WEBHOOK] SKIP group/noise: ${chatId}`);
          return false;
        }
        if (fromMe) return false;
        if (!text && !mediaUrl && !mediaType && latitude == null) return false;
        if (!phone) return false;
        return true;
      });

      console.log(`[WEBHOOK] extracted=${incomingMessages.length} valid=${validMessages.length}`);

      // Diagnostic: log filtered messages when extracted > 0 but valid = 0
      if (validMessages.length === 0 && incomingMessages.length > 0) {
        for (const m of incomingMessages) {
          console.log(`[WEBHOOK] FILTERED msg: fromMe=${m.fromMe} text="${(m.text || "").substring(0,30)}" mediaType=${m.mediaType} mediaUrl=${(m.mediaUrl || "").substring(0,50)} phone=${m.phone}`);
        }
      }

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
        for (const { id: msgId, phone, text, mediaUrl, mediaType, mediaFileName, latitude, longitude } of toProcess) {
          try {
            await processIncomingMessage(phone, text, mediaUrl, mediaType, mediaFileName, msgId, latitude, longitude);
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
async function processIncomingMessage(phone: string, text: string, mediaUrl?: string, mediaType?: string, mediaFileName?: string, messageId?: string, latitude?: number, longitude?: number) {
  try {
    console.log(`[AUTO-REPLY] Processing message from ${phone}: "${text}"${mediaUrl ? ` media=${mediaType}` : ""}${latitude != null ? ` location=${latitude},${longitude}` : ""}`);

    // 1. Get WhatsApp instance FIRST (needed for welcome + flow)
    const inst = await getWhatsAppInstance();
    if (!inst) {
      console.log("[AUTO-REPLY] No WhatsApp instance found");
      return;
    }

    // 2. Get or create customer
    let customerId: string;
    let customerWelcomed = true;
    let customerHasPhoto = false;
    const { data: existingCustomer } = await adminClient
      .from("customers")
      .select("id, welcomed, photo")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      customerWelcomed = existingCustomer.welcomed ?? false;
      customerHasPhoto = !!existingCustomer.photo;
    } else {
      const placeholderCpf = phone.replace(/\D/g, "").slice(-11).padStart(11, "0").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      const { data: newCustomer, error: custErr } = await adminClient
        .from("customers")
        .insert({ name: phone, phone, cpf: placeholderCpf, status: "active" })
        .select("id")
        .single();
      if (custErr) {
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
        customerWelcomed = false;
      }
    }

    // 2b. Auto-fill customer photo from WhatsApp profile picture
    if (!customerHasPhoto) {
      try {
        const picUrl = await fetchProfilePicUrl(inst, phone);
        if (picUrl) {
          await adminClient.from("customers").update({ photo: picUrl }).eq("id", customerId);
          console.log(`[PROFILE-PIC] Saved photo for customer ${customerId}`);
        }
      } catch (e) {
        console.log(`[PROFILE-PIC] Error saving photo:`, e);
      }
    }

    // 3. Welcome message BEFORE flow check (first contact only)
    if (!customerWelcomed) {
      console.log(`[WELCOME] Sending welcome message to ${phone}`);
      try {
        const { data: welcomeSettings } = await adminClient.from("settings").select("key, value").in("key", ["welcome_enabled", "welcome_type", "welcome_text", "welcome_audio_url"]);
        const ws: Record<string, string> = {};
        for (const r of welcomeSettings ?? []) ws[r.key] = r.value;

        if (ws.welcome_enabled === "true") {
          if (ws.welcome_type === "audio" && ws.welcome_audio_url) {
            await sendWhatsAppMedia(inst, phone, "audio", ws.welcome_audio_url);
          } else if (ws.welcome_text) {
            await sendWhatsAppText(inst, phone, ws.welcome_text);
          }
          await new Promise(r => setTimeout(r, 1000));
        }
        await adminClient.from("customers").update({ welcomed: true }).eq("id", customerId);
      } catch (wErr) {
        console.error("[WELCOME] Error sending welcome:", wErr);
        await adminClient.from("customers").update({ welcomed: true }).eq("id", customerId);
      }
    }

    // 4. Now fetch flow
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
      
      // (name capture removed — flow controls everything)
      
      if (currentNodeId) {
        const currentNode = flowNodes.find(n => n.id === currentNodeId);
        
        // ── Global: intercept veiculo_* at ANY node, re-route to the carousel ──
        const vehicleMatch = text.match(/^veiculo_(.+)$/i);
        if (vehicleMatch) {
          // Find the carousel node — either current or search all flow nodes
          let carouselNode = currentNode?.data?.nodeType === "vehicle_carousel" ? currentNode : null;
          if (!carouselNode) {
            carouselNode = flowNodes.find(n => n.data?.nodeType === "vehicle_carousel") || null;
          }
          if (carouselNode) {
            const vehicleId = vehicleMatch[1];
            variables["veiculo_selecionado"] = vehicleId;
            try {
              const { data: vData } = await adminClient.from("vehicles").select("name, brand, model").eq("id", vehicleId).single();
              if (vData) {
                variables["veiculo_nome"] = `${vData.name} - ${vData.brand} ${vData.model}`;
              }
            } catch (_) {}
            console.log(`[FLOW] Vehicle selected (global intercept): ${vehicleId}`);
            
            let handleId = "selected";
            const configVehicles = (carouselNode.data.config?.vehicles || []) as Array<{ id: string }>;
            if (configVehicles.length > 0) {
              const vIdx = configVehicles.findIndex(v => v.id === vehicleId);
              if (vIdx >= 0) {
                handleId = `vehicle-${vIdx}`;
              }
            }
            
            const nextNodeId = findNextNodeId(flowEdges, carouselNode.id, handleId) || findNextNodeId(flowEdges, carouselNode.id);
            if (nextNodeId) {
              await processFlow(inst, phone, text, session.id, customerId, flowNodes, flowEdges, nextNodeId, variables);
            }
            return;
          }
        }
        
        if (currentNode) {
          const nt = currentNode.data.nodeType;
          
          // Handle menu/list/request_location selection
          if (nt === "menu_text" || nt === "menu_buttons" || nt === "menu_list" || nt === "poll") {
            // For dynamic menu_list, inject cached sections from session variables
            if (nt === "menu_list" && currentNode.data.config?.dynamic === "vehicles" && variables["__dynamic_sections"]) {
              try {
                currentNode.data.config.sections = JSON.parse(variables["__dynamic_sections"]);
              } catch (_) {}
            }
            const { nextNodeId, selectedOption } = handleMenuSelection(currentNode, text, flowEdges);
            if (nextNodeId) {
              variables["menu_selection"] = selectedOption || text;
              await processFlow(inst, phone, text, session.id, customerId, flowNodes, flowEdges, nextNodeId, variables);
            } else {
              try { await sendWhatsAppText(inst, phone, "❌ Opção inválida. Por favor, escolha uma opção válida."); } catch (_) {}
              await new Promise(r => setTimeout(r, 500));
              await processFlow(inst, phone, "", session.id, customerId, flowNodes, flowEdges, currentNodeId, variables);
            }
            return;
          }

          // Handle request_location — save coordinates to {{localizacao}}
          if (nt === "request_location") {
            if (latitude != null && longitude != null) {
              const locationStr = `${latitude},${longitude}`;
              variables["localizacao"] = locationStr;
              console.log(`[FLOW] Saved location: ${locationStr}`);
              
              // Also save to customer custom_fields if field exists
              try {
                const { data: cust } = await adminClient.from("customers").select("custom_fields").eq("id", customerId).single();
                const cf = (cust?.custom_fields as Record<string, string>) || {};
                cf["localizacao"] = locationStr;
                await adminClient.from("customers").update({ custom_fields: cf }).eq("id", customerId);
                console.log(`[FLOW] Saved location to customer custom_fields`);
              } catch (e) { console.error("[FLOW] Error saving location to customer:", e.message); }
            } else {
              variables["localizacao"] = text || "Localização não detectada";
            }
            const { nextNodeId } = handleMenuSelection(currentNode, text || "location", flowEdges);
            if (nextNodeId) {
              await processFlow(inst, phone, text, session.id, customerId, flowNodes, flowEdges, nextNodeId, variables);
            }
            return;
          }
          
          // Handle capture nodes
          if (nt.startsWith("capture_") || nt === "wait") {
            // For capture_location, pre-set the variable with coordinates before processFlow
            if (nt === "capture_location" && latitude != null && longitude != null) {
              const varName = (currentNode.data.config?.variable || "localizacao").replace(/^\{\{/, "").replace(/\}\}$/, "").trim();
              const locationStr = `${latitude},${longitude}`;
              variables[varName] = locationStr;
              // Also save to customer custom_fields
              try {
                const { data: cust } = await adminClient.from("customers").select("custom_fields").eq("id", customerId).single();
                const cf = (cust?.custom_fields as Record<string, string>) || {};
                cf[varName] = locationStr;
                await adminClient.from("customers").update({ custom_fields: cf }).eq("id", customerId);
                console.log(`[FLOW] capture_location: saved ${varName} = "${locationStr}" to customer`);
              } catch (e) { console.error("[FLOW] Error saving location to customer:", e); }
            }
            await processFlow(inst, phone, text, session.id, customerId, flowNodes, flowEdges, currentNodeId, variables, mediaUrl, mediaType, mediaFileName, messageId);
            return;
          }
        }
      }
      
      console.log("[AUTO-REPLY] Session has no actionable node, restarting flow");
    }

    const vehicleMatch = text.match(/^veiculo_(.+)$/i);
    if (vehicleMatch) {
      const carouselNode = flowNodes.find(n => n.data?.nodeType === "vehicle_carousel");
      if (carouselNode) {
        const vehicleId = vehicleMatch[1];
        const { data: customerData } = await adminClient.from("customers").select("name").eq("id", customerId).single();
        const vars: Record<string, string> = {};

        if (customerData?.name && customerData.name !== phone && !/^\d+$/.test(customerData.name)) {
          vars.nome = customerData.name;
          vars.name = customerData.name;
        }

        vars["veiculo_selecionado"] = vehicleId;
        try {
          const { data: vData } = await adminClient.from("vehicles").select("name, brand, model").eq("id", vehicleId).single();
          if (vData) {
            vars["veiculo_nome"] = `${vData.name} - ${vData.brand} ${vData.model}`;
          }
        } catch (_) {}

        let handleId = "selected";
        const configVehicles = (carouselNode.data.config?.vehicles || []) as Array<{ id: string }>;
        if (configVehicles.length > 0) {
          const vIdx = configVehicles.findIndex(v => v.id === vehicleId);
          if (vIdx >= 0) {
            handleId = `vehicle-${vIdx}`;
          }
        }

        const nextNodeId = findNextNodeId(flowEdges, carouselNode.id, handleId) || findNextNodeId(flowEdges, carouselNode.id);
        if (nextNodeId) {
          console.log(`[AUTO-REPLY] Rehydrating vehicle selection without active session: ${vehicleId} -> ${nextNodeId}`);

          if (session) {
            await adminClient.from("chat_sessions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", session.id);
          }

          const { data: resumedSession, error: resumedSessionError } = await adminClient
            .from("chat_sessions")
            .insert({ customer_id: customerId, flow_id: flow.id, current_node_id: nextNodeId, variables: vars, status: "active" })
            .select()
            .single();

          if (resumedSessionError || !resumedSession) {
            console.error("[AUTO-REPLY] Failed to create resumed session:", resumedSessionError);
            return;
          }

          await processFlow(inst, phone, text, resumedSession.id, customerId, flowNodes, flowEdges, nextNodeId, vars);
          return;
        }
      }
    }
    
    // Start new session — always start from the first node, let the flow control everything
    const targetIds = new Set(flowEdges.map(e => e.target));
    const startNode = flowNodes.find(n => !targetIds.has(n.id));
    
    if (!startNode) {
      console.log("[AUTO-REPLY] No start node found in flow");
      return;
    }
    
    console.log(`[AUTO-REPLY] Starting new session from node: ${startNode.id} (${startNode.data.nodeType})`);
    
    // Pre-populate name variable if customer already has a real name
    const { data: customerData } = await adminClient.from("customers").select("name").eq("id", customerId).single();
    const vars: Record<string, string> = {};
    if (customerData?.name && customerData.name !== phone && !/^\d+$/.test(customerData.name)) {
      vars.nome = customerData.name;
      vars.name = customerData.name;
    }
    
    // Complete any stale active/waiting sessions for this customer
    if (session) {
      await adminClient.from("chat_sessions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", session.id);
    }
    
    const { data: newSession, error: sessError } = await adminClient
      .from("chat_sessions")
      .insert({ customer_id: customerId, flow_id: flow.id, current_node_id: startNode.id, variables: vars, status: "active" })
      .select().single();
    if (sessError || !newSession) { console.error("[AUTO-REPLY] Failed to create session:", sessError); return; }
    await processFlow(inst, phone, text, newSession.id, customerId, flowNodes, flowEdges, startNode.id, vars);
    
  } catch (err) {
    console.error("[AUTO-REPLY] Error:", err);
  }
}
