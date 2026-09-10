# Login com Google - FULLSEND

O projeto já contém o botão "Entrar com Google" e "Criar conta com Google".

## Supabase
1. Authentication > Providers > Google: habilitado.
2. Client ID e Client Secret do Google preenchidos.
3. Authentication > URL Configuration:
   - Site URL: https://fullsend-blond.vercel.app
   - Redirect URL: https://fullsend-blond.vercel.app/auth/callback

## Google Cloud / Google Auth Platform
Em Authorized redirect URIs, use o callback do Supabase (não o callback do site):
https://SEU-PROJECT-REF.supabase.co/auth/v1/callback

Para este projeto, confirme o callback exibido na página do provider Google dentro do Supabase.

Em Authorized JavaScript origins, adicione:
https://fullsend-blond.vercel.app

## Teste
Abra /login e clique em ENTRAR COM GOOGLE.
