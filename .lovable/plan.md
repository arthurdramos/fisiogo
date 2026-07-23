# MVP FisioFlow — Plano de construção

SaaS enxuto para fisioterapeutas autônomos. Foco em validar rápido: cadastro, agenda, evolução e plano de tratamento. Nada além disso.

## Identidade visual

- Paleta **Cloud White**: base branca (#fafbfc), superfícies (#e8ecf1), texto neutro, azul confiança (#3b82f6) como primária.
- Tipografia: **Sora** (títulos) + **Manrope** (corpo), carregadas via `<link>` em `__root.tsx`.
- Estética Notion/Stripe/Linear: bordas suaves, muito whitespace, hierarquia por peso e tamanho — não por cor. Sem gradientes berrantes.

## Escopo funcional (só isso no MVP)

1. **Auth** (Lovable Cloud): email/senha + Google. Cada fisio vê apenas seus dados.
2. **Pacientes**: nome, telefone, email, data de nascimento, observações.
3. **Contatos secundários** do paciente: nome, relação (pai, mãe, cuidador…), telefone.
4. **Agenda**: sessões com paciente, data/hora, duração, status (agendada/realizada/cancelada), observação.
5. **Evolução clínica**: notas por sessão (uma nota vinculada à sessão).
6. **Plano de tratamento**: objetivos + lista de exercícios prescritos por paciente.

Fora do escopo: pagamentos, WhatsApp, prontuário completo, relatórios, multi-clínica, papéis, upload de arquivos.

## Estrutura de rotas

```text
/                          landing pública (hero + CTA login)
/auth                      login/cadastro (email + Google)
/_authenticated/
  app                      dashboard: agenda de hoje + próximas
  pacientes                lista de pacientes
  pacientes/$id            detalhe: dados, contatos secundários, plano, histórico de sessões
  agenda                   agenda semanal
```

## Modelo de dados (Lovable Cloud)

- `patients` (id, user_id, nome, telefone, email, data_nascimento, observacoes)
- `patient_contacts` (id, patient_id, nome, relacao, telefone)
- `sessions` (id, user_id, patient_id, scheduled_at, duration_min, status, notes_evolucao)
- `treatment_plans` (id, patient_id, user_id, objetivos)
- `treatment_exercises` (id, plan_id, nome, series_reps, observacao)

RLS: todas restritas a `auth.uid() = user_id`. Contatos/exercícios via join no owner.

## Implementação

1. Enable Lovable Cloud + migração de schema + RLS + grants.
2. Configurar Google OAuth (`supabase--configure_social_auth`).
3. Design system em `src/styles.css` (paleta Cloud White, fontes Sora/Manrope, radius suaves).
4. Landing `/` + página `/auth` (email + Google).
5. Layout autenticado com sidebar minimal (Dashboard, Pacientes, Agenda, Sair).
6. CRUD pacientes + contatos secundários.
7. Agenda: criar/editar sessão, listar por dia/semana.
8. Detalhe do paciente: aba de plano de tratamento + histórico + evolução por sessão.
9. SEO/head por rota + sitemap/robots.

Confirma para eu construir?
