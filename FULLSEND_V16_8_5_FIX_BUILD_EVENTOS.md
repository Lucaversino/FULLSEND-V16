# FULLSEND V16.8.5 — Correção de build

Corrigido erro TypeScript em:
`app/api/admin/events/route.ts`

Antes:
`await ...insert(...).catch(()=>null)`

O Supabase PostgrestFilterBuilder não possui `.catch()`.

Agora:
- aguarda normalmente o `insert`;
- captura `error` retornado pelo Supabase;
- registra warning no servidor sem impedir a exclusão dos eventos.

Nenhuma outra função foi alterada.
