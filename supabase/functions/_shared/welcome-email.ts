// Conteúdo do e-mail de boas-vindas, disparado pela Edge Function
// ensure-subscription na primeira vez que a assinatura (trial) de um
// usuário é criada. Ver ensure-subscription/index.ts.

export const WELCOME_EMAIL_SUBJECT = "Bem-vindo(a) ao FisioGO! 🎉 Seu acesso já está liberado";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildWelcomeEmail(nome: string | null): { text: string; html: string } {
  const saudacao = nome ? `Olá, ${nome}!` : "Olá!";

  const text = `${saudacao}

Sua conta no FisioGO foi criada e seus 7 dias de teste grátis já começaram — a partir de agora você tem agenda, financeiro, prontuário, cobranças e reports do seu consultório em um só lugar, sem depender de papel, planilha ou grupo de WhatsApp espalhado.

O que muda no seu dia a dia:

Sua agenda, os prontuários e a evolução de cada paciente ficam centralizados e acessíveis em segundos. O financeiro — cobranças, fechamentos e reports — deixa de ser trabalho manual. E tudo isso acompanha você entre o consultório e o computador, sempre sincronizado.

Como acessar no celular

Sem loja de aplicativos — leva 20 segundos e é grátis. Basta adicionar o FisioGO à tela inicial:

No iPhone (precisa ser pelo Safari):
1. Abra app.fisiogo.com.br pelo Safari
2. Toque em Compartilhar (o ícone de quadrado com seta pra cima, na barra de baixo)
3. Role a lista e toque em "Adicionar à Tela de Início"
4. Toque em Adicionar — pronto, o FisioGO já aparece como um app na sua tela inicial

No Android (pelo Chrome, Edge ou Samsung Internet):
1. Abra app.fisiogo.com.br pelo navegador
2. Toque no menu (os três pontinhos no canto superior direito)
3. Toque em "Adicionar à tela inicial"
4. Confirme em "Adicionar" — o atalho aparece na sua tela inicial

Como acessar no computador

É ainda mais simples: acesse app.fisiogo.com.br pelo navegador e faça login com os mesmos dados — não precisa instalar nada.

Qualquer dúvida, é só responder este e-mail. Estamos por aqui.

Um abraço,
Equipe FisioGO`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;line-height:1.55">
  <p style="font-size:16px">${escapeHtml(saudacao)}</p>

  <p>Sua conta no FisioGO foi criada e seus <strong>7 dias de teste grátis</strong> já começaram — a partir de agora você tem agenda, financeiro, prontuário, cobranças e reports do seu consultório em um só lugar, sem depender de papel, planilha ou grupo de WhatsApp espalhado.</p>

  <h2 style="font-size:15px;margin:28px 0 8px">O que muda no seu dia a dia</h2>
  <p>Sua agenda, os prontuários e a evolução de cada paciente ficam centralizados e acessíveis em segundos. O financeiro — cobranças, fechamentos e reports — deixa de ser trabalho manual. E tudo isso acompanha você entre o consultório e o computador, sempre sincronizado.</p>

  <h2 style="font-size:15px;margin:28px 0 8px">Como acessar no celular</h2>
  <p>Sem loja de aplicativos — leva 20 segundos e é grátis. Basta adicionar o FisioGO à tela inicial:</p>

  <p style="margin-bottom:4px"><strong>No iPhone</strong> (precisa ser pelo Safari):</p>
  <ol style="margin-top:4px;padding-left:20px">
    <li>Abra app.fisiogo.com.br pelo Safari</li>
    <li>Toque em Compartilhar (o ícone de quadrado com seta pra cima, na barra de baixo)</li>
    <li>Role a lista e toque em "Adicionar à Tela de Início"</li>
    <li>Toque em Adicionar — pronto, o FisioGO já aparece como um app na sua tela inicial</li>
  </ol>

  <p style="margin-bottom:4px"><strong>No Android</strong> (pelo Chrome, Edge ou Samsung Internet):</p>
  <ol style="margin-top:4px;padding-left:20px">
    <li>Abra app.fisiogo.com.br pelo navegador</li>
    <li>Toque no menu (os três pontinhos no canto superior direito)</li>
    <li>Toque em "Adicionar à tela inicial"</li>
    <li>Confirme em "Adicionar" — o atalho aparece na sua tela inicial</li>
  </ol>

  <h2 style="font-size:15px;margin:28px 0 8px">Como acessar no computador</h2>
  <p>É ainda mais simples: acesse app.fisiogo.com.br pelo navegador e faça login com os mesmos dados — não precisa instalar nada.</p>

  <p style="margin-top:28px">Qualquer dúvida, é só responder este e-mail. Estamos por aqui.</p>

  <p>Um abraço,<br>Equipe FisioGO</p>
</div>`;

  return { text, html };
}
