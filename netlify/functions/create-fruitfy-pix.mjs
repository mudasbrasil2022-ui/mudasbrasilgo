// FruitfyPay Pix - pagamentos DESATIVADOS por padrão até validação da conta.
// A autenticação e o preço são verificados no servidor, nunca no navegador.
const names={
'prata-catarina':'Prata Catarina','nanica-jaffa':'Nanica Jaffa','terra-maranhao':'Terra Maranhão',
'brs-princesa':'BRS Princesa','prata-gorutuba':'Prata Gorutuba','nanica':'Nanica',
'maca-original':'Maçã Original','brs-terra-ana':'BRS Terra Anã'};
const reply=(statusCode,message)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(message)});
const digits=s=>String(s||'').replace(/\D/g,'');
function cpfValido(value){
const x=digits(value);if(!/^\d{11}$/.test(x)||/^(\d)\1{10}$/.test(x))return false;
const calc=n=>{let sum=0;for(let i=0;i<n;i++)sum+=Number(x[i])*(n+1-i);const d=(sum*10)%11;return d===10?0:d};
return calc(9)===Number(x[9])&&calc(10)===Number(x[10]);
}
const field=(o,k,max=120)=>typeof o?.[k]==='string'?o[k].trim().slice(0,max):'';
const validCheckoutUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&['fruitfy.io','fruitfypay.com'].some(x=>u.hostname===x||u.hostname.endsWith('.'+x))}catch{return false}};
const pick=(o,keys)=>{for(const k of keys)if(typeof o?.[k]==='string'&&o[k].trim())return o[k].trim();return ''};
export async function handler(event){
if(event.httpMethod!=='POST')return reply(405,{error:'Método não permitido.'});
if(process.env.FRUITFY_PIX_ENABLED!=='true'||!process.env.FRUITFY_API_TOKEN||!process.env.FRUITFY_STORE_ID)
 return reply(503,{error:'O Pix ainda não está habilitado. Solicite um orçamento pelo WhatsApp.'});
let data;try{if((event.body||'').length>12000)throw Error();data=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Pedido inválido.'})}
if(!Array.isArray(data.items)||!data.items.length||data.items.length>8)return reply(400,{error:'Selecione as mudas.'});
let qty=0;const seen=new Set(),items=[];
for(const p of data.items){
if(!p||!Object.prototype.hasOwnProperty.call(names,p.id)||seen.has(p.id)||!Number.isSafeInteger(p.quantity)||p.quantity<1||p.quantity>100000)
return reply(400,{error:'Variedade ou quantidade inválida.'});
seen.add(p.id);qty+=p.quantity;
if(qty>100000)return reply(400,{error:'Quantidade acima do limite; solicite orçamento.'});
items.push({code:p.id,description:'Muda de bananeira - '+names[p.id],quantity:p.quantity,unit_price:500});
}
if(qty<31)return reply(400,{error:'Pagamento online disponível apenas a partir de 31 mudas. Consulte o frete via WhatsApp.'});
const b=data.buyer||{},name=field(b,'name'),email=field(b,'email',120).toLowerCase(),cpf=digits(field(b,'cpf')),phone=digits(field(b,'phone'));
const zip=digits(field(b,'zip')),state=field(b,'state',2).toUpperCase();
if(name.split(/\s+/).length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!cpfValido(cpf)||! /^\d{10,13}$/.test(phone)||zip.length!==8||!/^[A-Z]{2}$/.test(state)||!['street','number','neighborhood','city'].every(k=>field(b,k)))
return reply(400,{error:'Verifique CPF, contato e endereço.'});
const amount=qty*500;
try{
const response=await fetch('https://api.fruitfy.io/pix/charge',{method:'POST',
headers:{Authorization:'Bearer '+process.env.FRUITFY_API_TOKEN,'Store-Id':process.env.FRUITFY_STORE_ID,'Content-Type':'application/json',Accept:'application/json'},
body:JSON.stringify({name,email,cpf,phone:phone.startsWith('55')?phone:'55'+phone,amount,items}),
signal:AbortSignal.timeout(15000)});
const json=await response.json().catch(()=>({}));
if(!response.ok||json.success===false)return reply(502,{error:'A FruitfyPay não conseguiu gerar o Pix. Verifique o painel antes de tentar novamente.'});
const r=json.data||json,pix=pick(r,['pix_code','pixCode','pix_copy_paste','pixCopyPaste','copy_paste','qr_code','brcode','emv'])||pick(r.pix,['code','copy_paste']);
const link=pick(r,['checkout_url','checkoutUrl','payment_url','paymentUrl']);
if(!pix&&!validCheckoutUrl(link))return reply(502,{error:'Resposta sem código Pix reconhecido. Verifique o painel antes de tentar novamente.'});
return reply(200,{pix_code:pix||'',checkout_url:validCheckoutUrl(link)?link:'',order_id:String(r.order_id||r.orderId||r.id||'').slice(0,120),amount,quantity:qty});
}catch(e){return reply(502,{error:'Comunicação com a FruitfyPay indisponível. Verifique o painel antes de tentar novamente.'})}
}
