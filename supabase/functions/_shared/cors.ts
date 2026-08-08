// Cabeçalhos CORS compartilhados pelas Edge Functions chamadas direto do
// navegador (supabase.functions.invoke). Sem isso, o navegador bloqueia a
// resposta e o erro aparece como "Failed to send a request to the Edge
// Function" no cliente, mesmo que a função tenha rodado com sucesso.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
