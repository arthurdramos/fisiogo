# Republicar as funções de pagamento

Objetivo: colocar no ar novamente as duas funções do fluxo Mercado Pago para que passem a ler o valor atualizado do token de acesso.

## O que será feito

1. Publicar novamente `mp-create-preapproval` (cria a assinatura e devolve o link de checkout).
2. Publicar novamente `mp-webhook` (recebe as notificações do Mercado Pago e atualiza o status da assinatura).
3. Fazer uma chamada de teste no fluxo de criação de assinatura para confirmar que o token novo é aceito (resposta com link de checkout em vez de erro do Mercado Pago).

Nenhum código será alterado — é apenas uma nova publicação com o mesmo conteúdo do repositório, para que as funções peguem o segredo atualizado.

## Detalhes técnicos

- Deploy via ferramenta de deploy de edge functions, com os nomes `mp-create-preapproval` e `mp-webhook`.
- As funções leem `MERCADOPAGO_ACCESS_TOKEN` de `Deno.env` no carregamento do módulo, por isso o redeploy é necessário após trocar o segredo.
- Verificação: chamada POST em `/mp-create-preapproval` com `{"plano":"mensal"}` e conferência dos logs em caso de erro 502.
