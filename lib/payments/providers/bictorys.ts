import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";
import { requireEnv } from "@/lib/security/env";

const base=()=>process.env.BICTORYS_ENVIRONMENT==="live"?"https://api.bictorys.com":"https://api.test.bictorys.com";
const headers=()=>({"X-Api-Key":requireEnv("BICTORYS_API_KEY"),Accept:"application/json","Content-Type":"application/json"});
const safe=(a:string,b:string)=>{const A=Buffer.from(a);const B=Buffer.from(b);return A.length===B.length&&timingSafeEqual(A,B)};
const statusOf=(v:unknown):CheckoutResult["status"]=>{const s=String(v||"").toLowerCase();if(s.includes("succeed")||s.includes("success")||s.includes("paid"))return"paid";if(s.includes("fail")||s.includes("cancel")||s.includes("refund"))return"failed";return"pending"};

export class BictorysProvider extends HttpPaymentProvider {
  id="bictorys" as const;
  async createCheckout(input:CheckoutInput):Promise<CheckoutResult>{
    const response=await this.json(`${base()}/pay/v1/charges`,{method:"POST",headers:headers(),cache:"no-store",body:JSON.stringify({
      amount:input.money.amount,currency:input.money.currency,country:input.country||"CI",paymentReference:input.reference,
      successRedirectUrl:input.successUrl,errorRedirectUrl:input.cancelUrl,
      customerObject:{name:input.customer.name||"Customer",email:input.customer.email||"",phone:input.customer.phone||"",country:input.country||"CI",locale:"fr-FR"},
    })}) as any;
    const id=response.transactionId||response.chargeId||response.id; const url=response.link||response.redirectUrl||response.checkoutUrl;
    if(!id||!url) throw new Error("Bictorys returned an incomplete checkout response");
    return {provider:this.id,externalId:String(id),status:"pending",checkoutUrl:String(url),money:{amount:input.money.amount,currency:input.money.currency},raw:response};
  }
  async verifyPayment(id:string):Promise<CheckoutResult>{
    const response=await fetch(`${base()}/pay/v1/transactions/${encodeURIComponent(id)}/status?by_charge_id=true`,{headers:headers(),cache:"no-store"});
    const body=await response.json().catch(()=>({})) as any; if(!response.ok) throw new Error(`Bictorys verify error ${response.status}`);
    const amount=Number(body.amount??body.transaction?.amount); const currency=String(body.currency??body.transaction?.currency??"");
    return {provider:this.id,externalId:id,status:statusOf(body.status??body.transaction?.status),money:Number.isFinite(amount)&&currency?{amount,currency}:undefined,raw:body};
  }
  async verifyWebhook(request:Request){
    const secret=requireEnv("BICTORYS_WEBHOOK_SECRET"); const raw=await request.text();
    const sig=request.headers.get("x-webhook-signature");
    if(sig){const expected=createHmac("sha256",secret).update(raw).digest("hex");return safe(sig,expected);}
    const sent=request.headers.get("x-secret-key"); return !!sent&&safe(sent,secret);
  }
  async parseWebhook(request:Request){
    const p=JSON.parse(await request.text()) as any; const id=String(p.transactionId||p.chargeId||p.data?.id||""); if(!id) throw new Error("Bictorys webhook missing transaction id");
    return {id:`bictorys:${id}:${p.event||p.status||"unknown"}`,type:String(p.event||p.status||"unknown"),payload:{...p,transaction:{id},reference:p.paymentReference}};
  }
}
