import Stripe from 'npm:stripe@18.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const priceMap={
  Starter:{monthly:Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY'),yearly:Deno.env.get('STRIPE_PRICE_STARTER_YEARLY')},
  Business:{monthly:Deno.env.get('STRIPE_PRICE_BUSINESS_MONTHLY'),yearly:Deno.env.get('STRIPE_PRICE_BUSINESS_YEARLY')},
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  try{
    const auth=req.headers.get('Authorization'); if(!auth)throw new Error('Unauthorized')
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}})
    const {data:{user}}=await supabase.auth.getUser(); if(!user)throw new Error('Unauthorized')
    const {plan,billing}=await req.json(); const priceId=priceMap[plan as keyof typeof priceMap]?.[billing as 'monthly'|'yearly']; if(!priceId)throw new Error('Stripe Price ID is not configured')
    const {data:shop,error:shopError}=await supabase.from('shops').select('id').eq('owner_id',user.id).single(); if(shopError)throw shopError
    const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
    const origin=req.headers.get('origin')||Deno.env.get('SITE_URL')!
    const session=await stripe.checkout.sessions.create({mode:'subscription',customer_email:user.email,line_items:[{price:priceId,quantity:1}],success_url:`${origin}/pricing?payment=success`,cancel_url:`${origin}/checkout?plan=${plan}&billing=${billing}&cancelled=1`,client_reference_id:shop.id,metadata:{shop_id:shop.id,plan,billing},subscription_data:{trial_period_days:14,metadata:{shop_id:shop.id,plan,billing}}})
    return new Response(JSON.stringify({url:session.url}),{headers:{...corsHeaders,'Content-Type':'application/json'}})
  }catch(error){return new Response(JSON.stringify({error:error.message}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}})}
})
