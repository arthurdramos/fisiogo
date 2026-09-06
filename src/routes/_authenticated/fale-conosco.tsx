import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

const CONTACT_EMAIL = "contato@fisiogo.online";

type ContactPayload = { subject: string; message: string };

// Server function: só executa no servidor (nunca vai pro bundle do cliente).
// Exige sessão válida (requireSupabaseAuth) pra pegar o e-mail de quem está
// escrevendo e usar como reply-to — assim quem responde em contato@fisiogo.online
// já responde direto pro usuário, sem precisar copiar o e-mail dele.
const sendContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: ContactPayload) => data)
  .handler(async ({ data, context }) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      throw new Error("Envio de e-mail não configurado (RESEND_API_KEY ausente).");
    }

    const fromEmail = (context.claims as { email?: string } | undefined)?.email;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FisioGO <onboarding@resend.dev>",
        to: [CONTACT_EMAIL],
        reply_to: fromEmail || undefined,
        subject: `[Fale conosco] ${data.subject}`,
        text: `De: ${fromEmail ?? "usuário não identificado"}\n\n${data.message}`,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Erro ao enviar e-mail via Resend:", errBody);
      throw new Error("Não foi possível enviar sua mensagem. Tente novamente.");
    }
  });

export const Route = createFileRoute("/_authenticated/fale-conosco")({
  head: () => ({ meta: [{ title: "Fale conosco — FisioGO" }] }),
  component: FaleConosco,
});

function FaleConosco() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: () => sendContactMessage({ data: { subject, message } }),
    onSuccess: () => {
      toast.success("Mensagem enviada! Vamos responder o quanto antes.");
      setSubject("");
      setMessage("");
    },
    onError: (e) => toast.error(extractErrorMessage(e) ?? "Erro ao enviar mensagem"),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Fale conosco</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dúvidas, sugestões ou problemas? Manda pra gente — respondemos por e-mail.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!subject.trim() || !message.trim()) return;
          send.mutate();
        }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="subject">Assunto</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Dúvida sobre cobrança"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Descreva sua dúvida ou o que está acontecendo..."
            required
            rows={6}
          />
        </div>

        <Button type="submit" disabled={send.isPending}>
          {send.isPending ? "Enviando..." : "Enviar"}
        </Button>
      </form>
    </div>
  );
}
