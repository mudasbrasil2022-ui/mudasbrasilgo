import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../netlify/functions/create-fruitfy-pix.mjs';
const buyer={name:'Cliente Teste',email:'cliente@example.com',cpf:'52998224725',phone:'62995220619',zip:'75000000',state:'GO',street:'Rua A',number:'10',neighborhood:'Centro',city:'Anápolis'};
const req=(items,b=buyer)=>({httpMethod:'POST',body:JSON.stringify({items,buyer:b})});
async function withEnv(fn){
const before={...process.env};
try{process.env.FRUITFY_API_TOKEN='fake';process.env.FRUITFY_STORE_ID='fake';process.env.FRUITFY_PIX_ENABLED='true';await fn()}
finally{for(const k of ['FRUITFY_API_TOKEN','FRUITFY_STORE_ID','FRUITFY_PIX_ENABLED']){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k]}}
}
test('pagamento bloqueado por padrão',async()=>{
delete process.env.FRUITFY_PIX_ENABLED;
const r=await handler(req([{id:'nanica',quantity:31}]));
assert.equal(r.statusCode,503);
});
test('30 unidades não geram cobrança',()=>withEnv(async()=>{
const r=await handler(req([{id:'nanica',quantity:30}]));
assert.equal(r.statusCode,400);
}));
test('31 unidades recalculadas a R$ 155,00, ignorando preço alterado pelo navegador',()=>withEnv(async()=>{
const old=globalThis.fetch;let sent;
try{globalThis.fetch=async (_,init)=>{sent=JSON.parse(init.body);return {ok:true,json:async()=>({success:true,data:{pix_code:'000201teste'}})}};
const r=await handler(req([{id:'nanica',quantity:15,unit_price:1},{id:'prata-catarina',quantity:16}]));
assert.equal(r.statusCode,200);
assert.equal(sent.amount,15500);
assert.equal(JSON.parse(r.body).quantity,31);
}finally{globalThis.fetch=old}
}));
test('rejeita produto inesperado e CPF inválido',()=>withEnv(async()=>{
assert.equal((await handler(req([{id:'produto-falso',quantity:31}]))).statusCode,400);
assert.equal((await handler(req([{id:'nanica',quantity:31}],{...buyer,cpf:'11111111111'}))).statusCode,400);
}));

test('status público mantém Pix desabilitado sem ativação e não revela token',async()=>{
  const origToken=process.env.FRUITFY_API_TOKEN,origId=process.env.FRUITFY_STORE_ID,origFlag=process.env.FRUITFY_PIX_ENABLED;
  try{
    process.env.FRUITFY_API_TOKEN='token-secreto-teste';
    process.env.FRUITFY_STORE_ID='uuid-loja';
    process.env.FRUITFY_PIX_ENABLED='false';
    let r=await handler({httpMethod:'GET'});
    assert.equal(r.statusCode,200);
    assert.deepEqual(JSON.parse(r.body),{enabled:false});
    process.env.FRUITFY_PIX_ENABLED='true';
    r=await handler({httpMethod:'GET'});
    assert.deepEqual(JSON.parse(r.body),{enabled:true});
    assert.equal(r.body.includes('token-secreto-teste'),false);
  }finally{
    for(const [key,val] of [['FRUITFY_API_TOKEN',origToken],['FRUITFY_STORE_ID',origId],['FRUITFY_PIX_ENABLED',origFlag]]){
      if(val===undefined)delete process.env[key];else process.env[key]=val;
    }
  }
});
