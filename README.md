# Mudas Brasil GO — integração de pagamento

Site: https://mudasbrasilgo.netlify.app/
Repositório: https://github.com/mudasbrasil2022-ui/mudasbrasilgo

## Status

- Catálogo com oito variedades, R$ 5,00 por muda, frete grátis **a partir de 31 mudas** e orçamento pelo WhatsApp **(62) 99522-0619**.
- O HTML existente já mostra o formulário Pix; este projeto adiciona uma função de servidor para processar as solicitações com preço revalidado.
- **PAGAMENTO NÃO ATIVADO**: FRUITFY_PIX_ENABLED inicia desligado. O navegador consulta GET `/.netlify/functions/create-fruitfy-pix` e só habilita o botão Pix quando há token, Store-ID e habilitação explícita. Sem isso, apenas WhatsApp.
- Ainda **não há webhook validado nem armazenamento/conciliação de pedidos**. Gerar Pix não significa pagamento confirmado; a confirmação automática e envio de pedidos requerem uma segunda etapa.

## Segurança e compatibilidade

A função envia a cobrança para https://api.fruitfy.io/pix/charge sem expor o token no HTML. Ela recalcula os valores no servidor, bloqueia itens inválidos e impede cobrança de frete indefinido em pedidos de até 30 mudas. Não registra dados do comprador no console.

**Antes de ativar**: confirmar com a FruitfyPay que a conta aceita **mudas físicas entregues por transportadora**; validar a estrutura de itens e a resposta de cobrança na API da sua conta; executar testes de pagamento em ambiente autorizado; implementar webhook autenticado e banco de pedidos para completar a automação.

Referência: https://dash.fruitfy.io/api/docs/info

## Implantação na Netlify

O arquivo netlify.toml usa o HTML e imagens atuais na raiz do GitHub, copia somente esses arquivos para **dist/** durante o deploy e gera a função em netlify/functions/. Isso evita publicar o código do servidor como arquivos estáticos.

1. Na Netlify, abra o **site existente** mudasbrasilgo e vincule este repositório em **Project configuration → Continuous deployment** (não crie outro site).
2. Ao integrar a branch main após revisão, verifique o deploy e teste o catálogo, o carrinho e o WhatsApp.
3. Para preparar a API, configure **Environment variables** na Netlify, com escopo Functions: FRUITFY_API_TOKEN e FRUITFY_STORE_ID. Insira os valores no painel, **nunca no GitHub, nos links ou neste chat**.
4. Mantenha FRUITFY_PIX_ENABLED=false até haver autorização para produtos físicos, confirmação da estrutura de resposta da API, testes em ambiente autorizado e validação do processamento de pedidos.
5. Só então altere FRUITFY_PIX_ENABLED=true, e faça novo deploy; monitore pagamentos e não despache pedidos sem confirmação independente do pagamento.

Testes locais: \`node --test tests/*.test.mjs\` (Node 20+).

## Checagem de publicação do Pix (sem gerar cobrança)

Abra `https://mudasbrasilgo.netlify.app/.netlify/functions/create-fruitfy-pix` no navegador **após publicar o código deste GitHub na Netlify**. A resposta esperada inicial é `{"enabled":false}`. Se retornar 404, a Netlify ainda não publicou a função; verifique a conexão GitHub → Netlify e a configuração do build.

**Não altere FRUITFY_PIX_ENABLED para true antes de validar com a Fruitfy a permissão para vender mudas físicas, conferir o formato da cobrança/retorno e definir como guardar os pedidos e endereços de entrega.** O formulário hoje não mantém o endereço em banco de dados e não implementa confirmação automática por webhook. Um Pix emitido é apenas uma cobrança, não comprovante de pagamento.
