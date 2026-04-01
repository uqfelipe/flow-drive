import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Supported node types by the engine
const SUPPORTED_NODE_TYPES = new Set([
  "message", "send_link", "pix", "copy_paste",
  "delay", "set_variable", "condition",
  "menu_text", "menu_buttons",
  "capture_text", "capture_name", "capture_email", "capture_phone", "capture_cpf", "capture_number", "wait",
  "transfer_human", "end",
]);

// ── WhatsApp API helper ──────────────────────────────────────────────
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

async function sendWhatsAppText(inst: { server_url: string; instance_token: string }, phone: string, text: string) {
  const res = await fetch(`${inst.server_url}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: inst.instance_token },
    body: JSON.stringify({ number: phone, text }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[SEND] FAILED status=${res.status} body=${t}`);
    throw new Error(`sendWhatsAppText failed: ${res.status} - ${t}`);
  }
  console.log(`[SEND] OK to=${phone} text="${text.substring(0, 80)}"`);
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
  inst: { server_url: string; instance_token: string },
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
      
      // Input capture nodes — save the user's response
      if (nt.startsWith("capture_") || nt === "wait") {
        const varName = currentNode.data.config?.variable || nt.replace("capture_", "");
        vars[varName] = incomingText;
        console.log(`[FLOW] Captured ${varName} = "${incomingText}"`);
        
        // Move to next node
        nodeId = findNextNodeId(flowEdges, nodeId);
      }
    }
  }
  
  // Now process non-input nodes sequentially
  let safety = 0;
  while (nodeId && safety < 20) {
    safety++;
    const node = nodesMap.get(nodeId);
    if (!node) { console.log(`[FLOW] Node ${nodeId} not found, stopping`); break; }
    
    const nt = node.data.nodeType;
    console.log(`[FLOW] Processing node=${nodeId} type=${nt} label="${node.data.label}"`);

    // Skip unsupported node types
    if (!SUPPORTED_NODE_TYPES.has(nt)) {
      console.log(`[FLOW] Unsupported node type "${nt}", skipping to next`);
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // Message node — send text and continue
    if (nt === "message" || nt === "send_link" || nt === "pix" || nt === "copy_paste") {
      const msg = node.data.config?.message || node.data.config?.text || node.data.config?.url || node.data.config?.pixKey || "";
      if (msg) {
        const finalMsg = replaceVariables(msg, vars);
        try {
          await sendWhatsAppText(inst, phone, finalMsg);
        } catch (e) {
          console.error(`[FLOW] Failed to send message at node ${nodeId}:`, e.message);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // Delay node
    if (nt === "delay") {
      const seconds = node.data.config?.seconds || 5;
      await new Promise(r => setTimeout(r, Math.min(seconds, 10) * 1000));
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // Set variable node
    if (nt === "set_variable") {
      const varName = node.data.config?.variable || "";
      const varValue = node.data.config?.value || "";
      if (varName) vars[varName] = replaceVariables(varValue, vars);
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // Condition node
    if (nt === "condition") {
      const condition = node.data.config?.condition || "";
      let result = false;
      const match = condition.match(/\{\{(\w+)\}\}\s*==\s*['"]?(.+?)['"]?\s*$/);
      if (match) {
        result = (vars[match[1]] || "") === match[2];
      } else if (condition) {
        const varMatch = condition.match(/\{\{(\w+)\}\}/);
        if (varMatch) {
          result = !!(vars[varMatch[1]]);
        }
      }
      nodeId = findNextNodeId(flowEdges, nodeId, result ? "true" : "false");
      continue;
    }
    
    // Menu text node — send options and wait
    if (nt === "menu_text") {
      const options = (node.data.config?.options || []) as string[];
      if (options.length > 0) {
        const menuMsg = options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");
        const header = node.data.config?.message || "Escolha uma opção:";
        try {
          await sendWhatsAppText(inst, phone, replaceVariables(`${header}\n\n${menuMsg}`, vars));
        } catch (e) {
          console.error(`[FLOW] Failed to send menu:`, e.message);
        }
      }
      await adminClient.from("chat_sessions").update({
        current_node_id: nodeId,
        variables: vars,
        status: "waiting",
        updated_at: new Date().toISOString(),
      }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }
    
    // Menu buttons node
    if (nt === "menu_buttons") {
      const buttons = (node.data.config?.buttons || []) as string[];
      if (buttons.length > 0) {
        const menuMsg = buttons.map((b, i) => `${i + 1}. ${b}`).join("\n");
        try {
          await sendWhatsAppText(inst, phone, replaceVariables(`Escolha:\n\n${menuMsg}`, vars));
        } catch (e) {
          console.error(`[FLOW] Failed to send menu buttons:`, e.message);
        }
      }
      await adminClient.from("chat_sessions").update({
        current_node_id: nodeId,
        variables: vars,
        status: "waiting",
        updated_at: new Date().toISOString(),
      }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }
    
    // Input capture nodes — send prompt if configured, then wait
    if (nt.startsWith("capture_") || nt === "wait") {
      // Send prompt message if the node has one
      const prompt = node.data.config?.message || node.data.config?.prompt || "";
      if (prompt) {
        try {
          await sendWhatsAppText(inst, phone, replaceVariables(prompt, vars));
        } catch (e) {
          console.error(`[FLOW] Failed to send capture prompt:`, e.message);
        }
      }
      await adminClient.from("chat_sessions").update({
        current_node_id: nodeId,
        variables: vars,
        status: "waiting",
        updated_at: new Date().toISOString(),
      }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }
    
    // Transfer to human
    if (nt === "transfer_human") {
      try {
        await sendWhatsAppText(inst, phone, replaceVariables("Aguarde, estou transferindo para um atendente humano. 👤", vars));
      } catch (_) {}
      await adminClient.from("chat_sessions").update({
        current_node_id: nodeId,
        variables: vars,
        status: "completed",
        updated_at: new Date().toISOString(),
      }).eq("id", sessionId);
      return { nextNodeId: null, variables: vars, status: "completed" };
    }
    
    // End node
    if (nt === "end") {
      await adminClient.from("chat_sessions").update({
        current_node_id: null,
        variables: vars,
        status: "completed",
        updated_at: new Date().toISOString(),
      }).eq("id", sessionId);
      return { nextNodeId: null, variables: vars, status: "completed" };
    }
    
    // Fallback — skip unknown
    console.log(`[FLOW] Unhandled node type: ${nt}, skipping`);
    nodeId = findNextNodeId(flowEdges, nodeId);
  }
  
  // Flow ended (no more nodes)
  await adminClient.from("chat_sessions").update({
    current_node_id: null,
    variables: vars,
    status: "completed",
    updated_at: new Date().toISOString(),
  }).eq("id", sessionId);
  
  return { nextNodeId: null, variables: vars, status: "completed" };
}

// ── Handle menu selection ────────────────────────────────────────────
function handleMenuSelection(
  node: FlowNode,
  userInput: string,
  edges: FlowEdge[],
): { nextNodeId: string | null; selectedOption: string | null } {
  const nt = node.data.nodeType;
  const options = (node.data.config?.options || node.data.config?.buttons || []) as string[];
  
  if (nt !== "menu_text" && nt !== "menu_buttons") {
    return { nextNodeId: null, selectedOption: null };
  }
  
  const num = parseInt(userInput.trim());
  if (!isNaN(num) && num >= 1 && num <= options.length) {
    const idx = num - 1;
    const handleId = `option-${idx}`;
    const nextId = findNextNodeId(edges, node.id, handleId) || findNextNodeId(edges, node.id);
    return { nextNodeId: nextId, selectedOption: options[idx] };
  }
  
  const lower = userInput.trim().toLowerCase();
  const matchIdx = options.findIndex(o => o.toLowerCase() === lower);
  if (matchIdx >= 0) {
    const handleId = `option-${matchIdx}`;
    const nextId = findNextNodeId(edges, node.id, handleId) || findNextNodeId(edges, node.id);
    return { nextNodeId: nextId, selectedOption: options[matchIdx] };
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
        await processIncomingMessage(phone, messageText);
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

    // 1. Find active flow — deterministic: most recently updated
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

    // Validate flow has at least one supported node type
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
    console.log(`[AUTO-REPLY] WhatsApp instance: ${inst.instance_name}`);

    // 2. Find or create customer by phone
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
      console.log(`[AUTO-REPLY] Created customer: ${customerId}`);
    }
    
    // 3. Find existing active/waiting session
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
          console.log(`[AUTO-REPLY] Current node type: ${nt}`);
          
          // Handle menu selection
          if (nt === "menu_text" || nt === "menu_buttons") {
            const { nextNodeId, selectedOption } = handleMenuSelection(currentNode, text, flowEdges);
            if (nextNodeId) {
              variables["menu_selection"] = selectedOption || text;
              await processFlow(inst, phone, text, session.id, flowNodes, flowEdges, nextNodeId, variables);
            } else {
              try {
                await sendWhatsAppText(inst, phone, "❌ Opção inválida. Por favor, escolha uma opção válida.");
              } catch (_) {}
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
    
    // 4. Start new session — find start node (no incoming edges)
    const targetIds = new Set(flowEdges.map(e => e.target));
    const startNode = flowNodes.find(n => !targetIds.has(n.id));
    
    if (!startNode) {
      console.log("[AUTO-REPLY] No start node found in flow");
      return;
    }
    
    console.log(`[AUTO-REPLY] Starting new session from node: ${startNode.id} (${startNode.data.nodeType}) "${startNode.data.label}"`);
    
    const { data: newSession, error: sessError } = await adminClient
      .from("chat_sessions")
      .insert({
        customer_id: customerId,
        flow_id: flow.id,
        current_node_id: startNode.id,
        variables: {},
        status: "active",
      })
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
