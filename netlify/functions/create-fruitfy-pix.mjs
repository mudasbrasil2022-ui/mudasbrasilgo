// Catálogo somente para orçamento. Nenhum pagamento Pix pode ser gerado nesta versão.
// A loja envia orçamento via WhatsApp; a equipe envia link externo somente após confirmar o pedido.
export async function handler(event) {
  return {
    statusCode: event.httpMethod === 'GET' ? 200 : 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(event.httpMethod === 'GET' ? { enabled: false } : { error: 'Pagamento direto indisponível. Solicite orçamento pelo WhatsApp.' })
  };
}
