// E-mail de reengajamento — disparado para quem criou conta no FisioGO
// mas interagiu pouco com a plataforma (gatilho/condição ainda a definir
// em cima deste template).

export const REENGAGEMENT_EMAIL_SUBJECT = "Sua conta no FisioGO está pronta para você";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildReengagementEmail(nome: string | null): { text: string; html: string } {
  const saudacao = nome ? `Olá, ${nome}!` : "Olá!";
  const appUrl = "https://fisiogo.online/app";

  const text = `${saudacao}

Você criou sua conta no FisioGO, e ela está pronta para quando quiser usar.

Criamos o FisioGO para tornar a rotina do fisioterapeuta autônomo mais leve: menos tempo organizando papel, planilha e mensagens, e mais tempo com o paciente (e com você).

Se quiser um ponto de partida, aqui vão três ideias simples:

📅 Monte sua agenda da semana. Cadastre seus horários e veja seus atendimentos em um só lugar.
📝 Registre uma evolução. Escolha um paciente e anote a sessão direto do celular.
💰 Acompanhe seus recebimentos. Lance uma sessão e veja como o financeiro se organiza sozinho.

Você pode explorar no seu ritmo, testar à vontade e descobrir o que funciona melhor para o seu jeito de atender.

Você sabia?
Dá para exportar um relatório dos atendimentos de qualquer período, com visual profissional, e enviar ao paciente na hora de cobrar. Simples, claro e elegante.

Acessar o FisioGO: ${appUrl}

Se surgir alguma dúvida ou ideia pelo caminho, é só nos chamar pelo app. Vamos gostar muito de ouvir você.

Um abraço,
Equipe FisioGO`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;background-color:#ffffff;max-width:560px;margin:0 auto;line-height:1.55">
  <p style="font-size:16px">${escapeHtml(saudacao)}</p>

  <p>Você criou sua conta no FisioGO, e ela está pronta para quando quiser usar.</p>

  <p>Criamos o FisioGO para tornar a rotina do fisioterapeuta autônomo mais leve: menos tempo organizando papel, planilha e mensagens, e mais tempo com o paciente (e com você).</p>

  <p>Se quiser um ponto de partida, aqui vão três ideias simples:</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
    <tr>
      <td style="padding:8px 0;vertical-align:top">
        <span style="font-size:18px;margin-right:8px">📅</span>
        <strong>Monte sua agenda da semana.</strong> Cadastre seus horários e veja seus atendimentos em um só lugar.
      </td>
    </tr>
    <tr>
      <td style="padding:8px 0;vertical-align:top">
        <span style="font-size:18px;margin-right:8px">📝</span>
        <strong>Registre uma evolução.</strong> Escolha um paciente e anote a sessão direto do celular.
      </td>
    </tr>
    <tr>
      <td style="padding:8px 0;vertical-align:top">
        <span style="font-size:18px;margin-right:8px">💰</span>
        <strong>Acompanhe seus recebimentos.</strong> Lance uma sessão e veja como o financeiro se organiza sozinho.
      </td>
    </tr>
  </table>

  <p>Você pode explorar no seu ritmo, testar à vontade e descobrir o que funciona melhor para o seu jeito de atender.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#e3fbf7;border-radius:10px">
    <tr>
      <td style="padding:16px 18px">
        <p style="margin:0 0 6px;font-weight:700;color:#0b8f8a">💡 Você sabia?</p>
        <p style="margin:0">Dá para exportar um relatório dos atendimentos de qualquer período, com visual profissional, e enviar ao paciente na hora de cobrar. Simples, claro e elegante.</p>
      </td>
    </tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
    <tr>
      <td style="border-radius:8px;background-color:#1d4ed8">
        <a href="${appUrl}" style="display:inline-block;padding:12px 24px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">Acessar o FisioGO</a>
      </td>
    </tr>
  </table>

  <p>Se surgir alguma dúvida ou ideia pelo caminho, é só nos chamar pelo app. Vamos gostar muito de ouvir você.</p>

  <p>Um abraço,<br>Equipe FisioGO</p>
</div>`;

  return { text, html };
}
