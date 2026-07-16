# Headers de seguranca

O Esportiz versiona os headers de resposta no arquivo vercel.json e valida o contrato tanto no CI quanto no monitor de producao.

## Protecoes aplicadas

- Cross-Origin-Opener-Policy com same-origin-allow-popups preserva os fluxos de autenticacao que abrem uma janela externa e isola o contexto principal.
- Permissions-Policy desativa camera, microfone e geolocalizacao, recursos que o produto nao utiliza.
- Referrer-Policy com strict-origin-when-cross-origin evita enviar caminhos e parametros para outros dominios.
- Strict-Transport-Security com max-age de 31536000 instrui navegadores a manter o dominio em HTTPS por um ano.
- X-Content-Type-Options com nosniff impede inferencia de tipo de conteudo.
- X-Frame-Options com DENY impede que telas autenticadas sejam incorporadas por terceiros.

## Content Security Policy

CSP ainda nao e aplicada em modo de bloqueio porque as paginas HTML publicas usam scripts, estilos e manipuladores inline. Liberar unsafe-inline como solucao permanente reduziria muito o valor da politica.

A ativacao segura deve seguir esta ordem:

1. Mover scripts e estilos inline para arquivos versionados.
2. Remover manipuladores HTML inline e registrar eventos pelo JavaScript.
3. Inventariar Supabase, Google Fonts, Vercel Analytics e Sentry por diretiva.
4. Publicar Content-Security-Policy-Report-Only com um endpoint de coleta.
5. Corrigir violacoes observadas em homologacao.
6. Trocar para Content-Security-Policy em bloqueio e adicionar o header ao contrato automatizado.

Nao incluir segredos, tokens ou corpos de requisicao em relatorios de CSP.