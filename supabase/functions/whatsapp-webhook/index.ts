import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
    console.error("sendWhatsAppText error:", t);
  }
  return res.ok;
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
        console.log(`Captured ${varName} = ${incomingText}`);
        
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
    if (!node) break;
    
    const nt = node.data.nodeType;
    console.log(`Processing node: ${nodeId} (${nt})`);
    
    // Message node — send text and continue
    if (nt === "message" || nt === "send_link" || nt === "pix" || nt === "copy_paste") {
      const msg = node.data.config?.message || node.data.config?.text || node.data.config?.url || node.data.config?.pixKey || "";
      if (msg) {
        const finalMsg = replaceVariables(msg, vars);
        await sendWhatsAppText(inst, phone, finalMsg);
        // Small delay between messages
        await new Promise(r => setTimeout(r, 500));
      }
      nodeId = findNextNodeId(flowEdges, nodeId);
      continue;
    }
    
    // Delay node — wait then continue
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
      // Simple evaluation: check if variable equals value
      let result = false;
      const match = condition.match(/\{\{(\w+)\}\}\s*==\s*['"]?(.+?)['"]?\s*$/);
      if (match) {
        result = (vars[match[1]] || "") === match[2];
      } else if (condition) {
        // If condition is just a variable name, check if it's truthy
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
        await sendWhatsAppText(inst, phone, replaceVariables(`${header}\n\n${menuMsg}`, vars));
      }
      // Save session waiting at this node for user to pick an option
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
        await sendWhatsAppText(inst, phone, replaceVariables(`Escolha:\n\n${menuMsg}`, vars));
      }
      await adminClient.from("chat_sessions").update({
        current_node_id: nodeId,
        variables: vars,
        status: "waiting",
        updated_at: new Date().toISOString(),
      }).eq("id", sessionId);
      return { nextNodeId: nodeId, variables: vars, status: "waiting" };
    }
    
    // Input capture nodes — send prompt and wait for response
    if (nt.startsWith("capture_") || nt === "wait") {
      // We're now waiting for user input at this node
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
      await sendWhatsAppText(inst, phone, replaceVariables("Aguarde, estou transferindo para um atendente humano. 👤", vars));
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
    
    // Unknown node type — skip
    console.log(`Unknown node type: ${nt}, skipping`);
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
  
  // Try to match by number
  const num = parseInt(userInput.trim());
  if (!isNaN(num) && num >= 1 && num <= options.length) {
    const idx = num - 1;
    // Check if there's a handle for this option
    const handleId = `option-${idx}`;
    const nextId = findNextNodeId(edges, node.id, handleId) || findNextNodeId(edges, node.id);
    return { nextNodeId: nextId, selectedOption: options[idx] };
  }
  
  // Try to match by text
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
    
    // Log raw payload for debugging (first 500 chars)
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

    // Handle message events - detect message in body regardless of event type
    const hasMessage = body.message || body.messages || body.data?.message;
    const isMessageEvent = eventType.includes("message") || eventType === "" && hasMessage;
    
    if (isMessageEvent || hasMessage) {
      const msg = body.message || body.messages?.[0] || body.data?.message || {};
      const chatId = msg.chatid ?? msg.chat ?? msg.key?.remoteJid ?? body.chatid ?? body.from ?? "";
      const messageText = msg.body ?? msg.text ?? msg.conversation ?? msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? "";
      const fromMe = msg.fromMe ?? msg.key?.fromMe ?? false;
      const phone = chatId.replace("@s.whatsapp.net", "").replace("@c.us", "");
      
      console.log(`[WEBHOOK] Message detected: phone=${phone}, fromMe=${fromMe}, text="${messageText}"`);

      // Upsert signal for realtime UI updates
      if (chatId) {
        await adminClient.from("message_signals").upsert(
          { chat_id: chatId, updated_at: new Date().toISOString() },
          { onConflict: "chat_id" }
        );
      }

      // Only process incoming messages (not our own)
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
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// ── Process incoming message through active flow ─────────────────────
async function processIncomingMessage(phone: string, text: string) {
  try {
    // 1. Find active flow
    const { data: flows } = await adminClient
      .from("chatbot_flows")
      .select("id, nodes, edges")
      .eq("status", "active")
      .limit(1);
    
    if (!flows || flows.length === 0) {
      console.log("No active flow found, skipping auto-reply");
      return;
    }
    
    const flow = flows[0];
    const flowNodes = flow.nodes as FlowNode[];
    const flowEdges = flow.edges as FlowEdge[];
    
    if (!flowNodes || flowNodes.length === 0) {
      console.log("Flow has no nodes");
      return;
    }
    
    const inst = await getWhatsAppInstance();
    if (!inst) {
      console.log("No WhatsApp instance found");
      return;
    }

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
        console.error("Failed to create customer:", custErr);
        return;
      }
      customerId = newCustomer.id;
      console.log(`Created new customer: ${customerId} for phone ${phone}`);
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
      console.log(`Existing session: ${session.id}, node: ${session.current_node_id}, status: ${session.status}`);
      
      const currentNodeId = session.current_node_id;
      const variables = (session.variables || {}) as Record<string, string>;
      
      if (currentNodeId) {
        const currentNode = flowNodes.find(n => n.id === currentNodeId);
        
        if (currentNode) {
          const nt = currentNode.data.nodeType;
          
          // Handle menu selection
          if (nt === "menu_text" || nt === "menu_buttons") {
            const { nextNodeId, selectedOption } = handleMenuSelection(currentNode, text, flowEdges);
            if (nextNodeId) {
              variables["menu_selection"] = selectedOption || text;
              await processFlow(inst, phone, text, session.id, flowNodes, flowEdges, nextNodeId, variables);
            } else {
              await sendWhatsAppText(inst, phone, "❌ Opção inválida. Por favor, escolha uma opção válida.");
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
      
      console.log("Session has no actionable node, restarting flow");
    }
    
    // 4. Start new session — find start node (no incoming edges)
    const targetIds = new Set(flowEdges.map(e => e.target));
    const startNode = flowNodes.find(n => !targetIds.has(n.id));
    
    if (!startNode) {
      console.log("No start node found in flow");
      return;
    }
    
    console.log(`Starting new flow session from node: ${startNode.id} (${startNode.data.nodeType})`);
    
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
      console.error("Failed to create session:", sessError);
      return;
    }
    
    await processFlow(inst, phone, text, newSession.id, flowNodes, flowEdges, startNode.id, {});
    
  } catch (err) {
    console.error("processIncomingMessage error:", err);
  }
}
