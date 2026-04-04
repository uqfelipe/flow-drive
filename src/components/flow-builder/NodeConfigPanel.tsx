import { getNodeTypeConfig } from "./nodeTypes";
import { AudioRecorder } from "./AudioRecorder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2, Plus, Link as LinkIcon, Upload, Mic as MicIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Node } from "@xyflow/react";
import type { FlowNodeData } from "@/types";

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

export function NodeConfigPanel({ node, onClose, onUpdate, onDelete }: NodeConfigPanelProps) {
  if (!node) return null;

  const data = node.data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(data.nodeType);
  const Icon = config?.icon;
  const color = config?.color || "#8B5CF6";
  const nt = data.nodeType;

  const updateConfig = (patch: Record<string, any>) => {
    onUpdate(node.id, { config: { ...data.config, ...patch } });
  };


  return (
    <div className="w-80 bg-white dark:bg-card border-l border-border flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-border" style={{ backgroundColor: `${color}10` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" style={{ color }} />}
            <h3 className="font-display font-semibold text-sm text-foreground">Configurar</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Common fields */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Nome do Grupo</Label>
          <Input className="h-9 text-sm" value={data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
          <Input className="h-9 text-sm" value={data.description || ""} onChange={(e) => onUpdate(node.id, { description: e.target.value })} />
        </div>

        {/* ─── MESSAGE ─── */}
        {nt === "message" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
            <Textarea className="text-sm min-h-[80px]" placeholder="Digite a mensagem..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">Use {"{{variavel}}"} para valores dinâmicos</p>
          </div>
        )}

        {/* ─── SEND LINK ─── */}
        {nt === "send_link" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Texto exibido acima do botão..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">URL do Link</Label>
              <Input className="h-9 text-sm" placeholder="https://..." value={data.config?.url || ""} onChange={(e) => updateConfig({ url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Label do botão</Label>
              <Input className="h-8 text-sm" placeholder="Acessar" value={data.config?.label || ""} onChange={(e) => updateConfig({ label: e.target.value })} />
            </div>
          </>
        )}


        {/* ─── COPY PASTE ─── */}
        {nt === "copy_paste" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Texto exibido acima do botão..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Texto para copiar</Label>
              <Textarea className="text-sm min-h-[80px]" placeholder="Conteúdo que será copiado ao clicar no botão..." value={data.config?.text || ""} onChange={(e) => updateConfig({ text: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Label do botão</Label>
              <Input className="h-8 text-sm" placeholder="Copiar" value={data.config?.label || ""} onChange={(e) => updateConfig({ label: e.target.value })} />
            </div>
          </>
        )}



        {/* ─── MENU BOTÕES ─── */}
        {nt === "menu_buttons" && (() => {
          const buttons = (data.config?.buttons || []) as any[];
          const canAdd = buttons.length < 3;
          return (
            <div className="space-y-4">
              {/* Seção: Mensagem */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
                <Textarea className="text-sm min-h-[70px]" placeholder="Texto antes dos botões..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
              </div>

              {/* Seção: Botões */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Botões</Label>
                  <span className="text-[10px] text-muted-foreground">{buttons.length}/3</span>
                </div>
                {buttons.map((btn: any, idx: number) => {
                  const isObj = typeof btn === "object";
                  const text = isObj ? btn.text : btn;
                  const allButtons = [...buttons];
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}.</span>
                      <Input className="h-9 text-sm flex-1" placeholder={`Botão ${idx + 1}`} value={text} onChange={(e) => { allButtons[idx] = { text: e.target.value, type: "REPLY" }; updateConfig({ buttons: allButtons }); }} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { allButtons.splice(idx, 1); updateConfig({ buttons: allButtons }); }}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full h-9 text-xs" disabled={!canAdd} onClick={() => updateConfig({ buttons: [...buttons, { text: `Botão ${buttons.length + 1}`, type: "REPLY" }] })}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Botão</Button>
              </div>

              {/* Seção: Imagem */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Imagem (opcional)</Label>
                <Input className="h-9 text-sm" placeholder="https://..." value={data.config?.imageButton || ""} onChange={(e) => updateConfig({ imageButton: e.target.value })} />
              </div>
            </div>
          );
        })()}

        {/* ─── MENU LISTA ─── */}
        {nt === "menu_list" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
            <Textarea className="text-sm min-h-[60px]" placeholder="Texto do menu lista..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
            <Label className="text-xs font-medium text-muted-foreground">Texto do botão</Label>
            <Input className="h-9 text-sm" value={data.config?.listButton || "Ver opções"} onChange={(e) => updateConfig({ listButton: e.target.value })} />
            <Label className="text-xs font-medium text-muted-foreground mt-2">Seções</Label>
            {((data.config?.sections || []) as any[]).map((section: any, sIdx: number) => {
              const sections = [...(data.config?.sections || [])];
              return (
                <div key={sIdx} className="border border-border rounded p-2 space-y-1.5 mb-2">
                  <div className="flex items-center gap-1">
                    <Input className="h-8 text-xs flex-1 font-medium" placeholder="Título da seção" value={section.title} onChange={(e) => { sections[sIdx] = { ...section, title: e.target.value }; updateConfig({ sections }); }} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { sections.splice(sIdx, 1); updateConfig({ sections }); }}><X className="h-3 w-3" /></Button>
                  </div>
                  {(section.items || []).map((item: any, iIdx: number) => (
                    <div key={iIdx} className="flex items-center gap-1 ml-2">
                      <Input className="h-7 text-[11px] flex-1" placeholder="Título" value={item.title} onChange={(e) => { const items = [...section.items]; items[iIdx] = { ...item, title: e.target.value }; sections[sIdx] = { ...section, items }; updateConfig({ sections }); }} />
                      <Input className="h-7 text-[11px] w-20" placeholder="Desc" value={item.description || ""} onChange={(e) => { const items = [...section.items]; items[iIdx] = { ...item, description: e.target.value }; sections[sIdx] = { ...section, items }; updateConfig({ sections }); }} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { const items = section.items.filter((_: any, i: number) => i !== iIdx); sections[sIdx] = { ...section, items }; updateConfig({ sections }); }}><X className="h-2.5 w-2.5" /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] ml-2" onClick={() => { const items = [...(section.items || []), { title: "Novo item", id: `${Date.now()}`, description: "" }]; sections[sIdx] = { ...section, items }; updateConfig({ sections }); }}><Plus className="h-2.5 w-2.5 mr-1" /> Item</Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => updateConfig({ sections: [...(data.config?.sections || []), { title: "Nova seção", items: [{ title: "Item 1", id: `${Date.now()}`, description: "" }] }] })}><Plus className="h-3 w-3 mr-1" /> Adicionar Seção</Button>
          </div>
        )}

        {/* ─── MENU CARROSSEL ─── */}
        {nt === "menu_carousel" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
            <Textarea className="text-sm min-h-[60px]" placeholder="Texto do carrossel..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
            <Label className="text-xs font-medium text-muted-foreground mt-2">Cards</Label>
            {((data.config?.cards || []) as any[]).map((card: any, cIdx: number) => {
              const cards = [...(data.config?.cards || [])];
              return (
                <div key={cIdx} className="border border-border rounded p-2 space-y-1.5 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">Card {cIdx + 1}</span>
                    <div className="flex-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { cards.splice(cIdx, 1); updateConfig({ cards }); }}><X className="h-3 w-3" /></Button>
                  </div>
                  <Input className="h-8 text-xs" placeholder="Texto do card" value={card.text || ""} onChange={(e) => { cards[cIdx] = { ...card, text: e.target.value }; updateConfig({ cards }); }} />
                  <Input className="h-8 text-xs" placeholder="URL da imagem" value={card.image || ""} onChange={(e) => { cards[cIdx] = { ...card, image: e.target.value }; updateConfig({ cards }); }} />
                  <Label className="text-[10px] text-muted-foreground">Botões do card</Label>
                  {(card.buttons || []).map((btn: any, bIdx: number) => (
                    <div key={bIdx} className="flex items-center gap-1">
                      <Input className="h-7 text-[11px] flex-1" value={btn.text || ""} onChange={(e) => { const btns = [...card.buttons]; btns[bIdx] = { ...btn, text: e.target.value }; cards[cIdx] = { ...card, buttons: btns }; updateConfig({ cards }); }} />
                      <Select value={btn.type || "REPLY"} onValueChange={(v) => { const btns = [...card.buttons]; btns[bIdx] = { ...btn, type: v }; cards[cIdx] = { ...card, buttons: btns }; updateConfig({ cards }); }}>
                        <SelectTrigger className="h-7 text-[11px] w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REPLY">Resposta</SelectItem>
                          <SelectItem value="URL">URL</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { const btns = card.buttons.filter((_: any, i: number) => i !== bIdx); cards[cIdx] = { ...card, buttons: btns }; updateConfig({ cards }); }}><X className="h-2.5 w-2.5" /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { const btns = [...(card.buttons || []), { text: "Botão", type: "REPLY" }]; cards[cIdx] = { ...card, buttons: btns }; updateConfig({ cards }); }}><Plus className="h-2.5 w-2.5 mr-1" /> Botão</Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => updateConfig({ cards: [...(data.config?.cards || []), { text: `Card ${(data.config?.cards?.length || 0) + 1}`, image: "", buttons: [{ text: "Botão 1", type: "REPLY" }] }] })}><Plus className="h-3 w-3 mr-1" /> Adicionar Card</Button>
          </div>
        )}

        {/* ─── POLL ─── */}
        {nt === "poll" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Pergunta</Label>
            <Input className="h-9 text-sm" placeholder="Qual sua preferência?" value={data.config?.question || ""} onChange={(e) => updateConfig({ question: e.target.value })} />
            <Label className="text-xs font-medium text-muted-foreground">Qtd. selecionável</Label>
            <Input className="h-9 text-sm" type="number" min={1} value={data.config?.selectableCount || 1} onChange={(e) => updateConfig({ selectableCount: parseInt(e.target.value) || 1 })} />
            <Label className="text-xs font-medium text-muted-foreground">Opções</Label>
            {((data.config?.options || []) as string[]).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input className="h-8 text-xs flex-1" value={opt} onChange={(e) => { const opts = [...(data.config?.options || [])]; opts[idx] = e.target.value; updateConfig({ options: opts }); }} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateConfig({ options: (data.config?.options || []).filter((_: any, i: number) => i !== idx) })}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => updateConfig({ options: [...(data.config?.options || []), `Opção ${(data.config?.options?.length || 0) + 1}`] })}><Plus className="h-3 w-3 mr-1" /> Adicionar Opção</Button>
          </div>
        )}

        {/* ─── REQUEST LOCATION ─── */}
        {nt === "request_location" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
            <Textarea className="text-sm min-h-[60px]" placeholder="Compartilhe sua localização..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
          </div>
        )}

        {/* ─── MEDIA NODES (exceto áudio) ─── */}
        {(nt === "send_image" || nt === "send_video" || nt === "send_file" || nt === "send_sticker") && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">URL do arquivo</Label>
              <Input className="h-9 text-sm" placeholder="https://..." value={data.config?.file || ""} onChange={(e) => updateConfig({ file: e.target.value })} />
            </div>
            {(nt === "send_image" || nt === "send_video" || nt === "send_file") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Legenda</Label>
                <Input className="h-9 text-sm" placeholder="Legenda (opcional)" value={data.config?.caption || ""} onChange={(e) => updateConfig({ caption: e.target.value })} />
              </div>
            )}
          </>
        )}

        {/* ─── SEND AUDIO ─── */}
        {nt === "send_audio" && (
          <div className="space-y-3">
            <Tabs value={data.config?.audioSource || "link"} onValueChange={(v) => updateConfig({ audioSource: v })}>
              <TabsList className="w-full grid grid-cols-3 h-8">
                <TabsTrigger value="link" className="text-xs gap-1"><LinkIcon className="h-3 w-3" />Link</TabsTrigger>
                <TabsTrigger value="upload" className="text-xs gap-1"><Upload className="h-3 w-3" />Upload</TabsTrigger>
                <TabsTrigger value="recording" className="text-xs gap-1"><MicIcon className="h-3 w-3" />Gravar</TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">URL do áudio</Label>
                  <Input className="h-9 text-sm" placeholder="https://..." value={data.config?.file || ""} onChange={(e) => updateConfig({ file: e.target.value })} />
                </div>
              </TabsContent>

              <TabsContent value="upload" className="mt-3">
                <div className="space-y-2">
                  {data.config?.file && data.config?.audioSource === "upload" && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
                      <MicIcon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground truncate flex-1">{data.config.file.split("/").pop()}</span>
                    </div>
                  )}
                  <label className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Clique para selecionar um arquivo de áudio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fileName = `upload_${Date.now()}_${file.name}`;
                        const { error } = await supabase.storage.from("audio-files").upload(fileName, file, { contentType: file.type });
                        if (error) { toast.error("Erro ao fazer upload"); return; }
                        const { data: urlData } = supabase.storage.from("audio-files").getPublicUrl(fileName);
                        updateConfig({ file: urlData.publicUrl, audioSource: "upload" });
                        toast.success("Áudio enviado com sucesso");
                      }}
                    />
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="recording" className="mt-3">
                {data.config?.file && data.config?.audioSource === "recording" && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border mb-3">
                    <MicIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1">Gravação salva</span>
                    <audio src={data.config.file} controls className="h-8 max-w-[160px]" />
                  </div>
                )}
                <AudioRecorder onAudioReady={(url) => updateConfig({ file: url, audioSource: "recording" })} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ─── SEND LOCATION ─── */}
        {nt === "send_location" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Latitude</Label>
                <Input className="h-9 text-sm" placeholder="-23.55" value={data.config?.latitude || ""} onChange={(e) => updateConfig({ latitude: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Longitude</Label>
                <Input className="h-9 text-sm" placeholder="-46.63" value={data.config?.longitude || ""} onChange={(e) => updateConfig({ longitude: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome do local</Label>
              <Input className="h-9 text-sm" placeholder="Nome" value={data.config?.name || ""} onChange={(e) => updateConfig({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Endereço</Label>
              <Input className="h-9 text-sm" placeholder="Rua..." value={data.config?.address || ""} onChange={(e) => updateConfig({ address: e.target.value })} />
            </div>
          </>
        )}

        {/* ─── CONTACT CARD ─── */}
        {nt === "contact_card" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome completo</Label>
              <Input className="h-9 text-sm" value={data.config?.fullName || ""} onChange={(e) => updateConfig({ fullName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Telefone</Label>
              <Input className="h-9 text-sm" value={data.config?.phoneNumber || ""} onChange={(e) => updateConfig({ phoneNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Organização</Label>
              <Input className="h-9 text-sm" value={data.config?.organization || ""} onChange={(e) => updateConfig({ organization: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input className="h-9 text-sm" value={data.config?.email || ""} onChange={(e) => updateConfig({ email: e.target.value })} />
            </div>
          </>
        )}

        {/* ─── CONDITION ─── */}
        {nt === "condition" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Condição</Label>
            <Input className="h-9 text-sm" placeholder="Ex: {{variavel}} == 'valor'" value={data.config?.condition || ""} onChange={(e) => updateConfig({ condition: e.target.value })} />
          </div>
        )}

        {/* ─── DELAY / TYPING ─── */}
        {(nt === "delay" || nt === "typing_indicator") && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Tempo (segundos)</Label>
            <Input type="number" className="h-9 text-sm" value={data.config?.seconds || (nt === "typing_indicator" ? 3 : 5)} onChange={(e) => updateConfig({ seconds: parseInt(e.target.value) })} />
          </div>
        )}

        {/* ─── VARIABLE / CAPTURE ─── */}
        {(data.category === "entrada" || nt === "set_variable") && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome da Variável</Label>
              <Input className="h-9 text-sm" placeholder="nome_variavel" value={data.config?.variable || ""} onChange={(e) => updateConfig({ variable: e.target.value })} />
            </div>
            {data.category === "entrada" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Mensagem de prompt</Label>
                <Textarea className="text-sm min-h-[60px]" placeholder="Mensagem pedindo o dado..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
              </div>
            )}
          </>
        )}

        {nt === "set_variable" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Valor</Label>
            <Input className="h-9 text-sm" placeholder="valor ou {{outra_var}}" value={data.config?.value || ""} onChange={(e) => updateConfig({ value: e.target.value })} />
          </div>
        )}

        {/* ─── WEBHOOK ─── */}
        {nt === "webhook" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">URL</Label>
              <Input className="h-9 text-sm" placeholder="https://..." value={data.config?.url || ""} onChange={(e) => updateConfig({ url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Método</Label>
              <Select value={data.config?.method || "POST"} onValueChange={(v) => updateConfig({ method: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* ─── REQUEST PAYMENT ─── */}
        {nt === "request_payment" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Valor (R$)</Label>
              <Input className="h-9 text-sm" type="number" placeholder="100.00" value={data.config?.amount || ""} onChange={(e) => updateConfig({ amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Chave Pix</Label>
              <Input className="h-9 text-sm" value={data.config?.pixKey || ""} onChange={(e) => updateConfig({ pixKey: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Tipo da chave</Label>
              <Select value={data.config?.pixType || "cpf"} onValueChange={(v) => updateConfig({ pixType: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="random">Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Link de pagamento (opcional)</Label>
              <Input className="h-9 text-sm" placeholder="https://..." value={data.config?.paymentLink || ""} onChange={(e) => updateConfig({ paymentLink: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Código do boleto (opcional)</Label>
              <Input className="h-9 text-sm" value={data.config?.boletoCode || ""} onChange={(e) => updateConfig({ boletoCode: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Mensagem do pagamento..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
            </div>
          </>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-border">
          <div className="text-[11px] text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground/70">Tipo:</span> {config?.label}</p>
            <p><span className="font-medium text-foreground/70">Categoria:</span> {data.category}</p>
            <p><span className="font-medium text-foreground/70">ID:</span> {node.id}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button variant="outline" size="sm" className="w-full text-destructive hover:text-white hover:bg-destructive border-destructive/30" onClick={() => onDelete(node.id)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover Grupo
        </Button>
      </div>
    </div>
  );
}
