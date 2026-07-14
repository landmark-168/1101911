import Stripe from 'npm:stripe@18.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async req=>{
  const signature=req.headers.get('stripe-signature'); if(!signature)return new Response('Missing signature',{status:400})
  try{
    const body=await req.text()
    const event=await stripe.webhooks.constructEventAsync(body,signature,Deno.env.get('STRIPE_WEBHOOK_SECRET')!,undefined,Stripe.createSubtleCryptoProvider())
    if(event.type==='checkout.session.completed'){
      const session=event.data.object as Stripe.Checkout.Session
      const shopId=session.metadata?.shop_id; const plan=session.metadata?.plan; const billing=session.metadata?.billing
      if(shopId&&plan){
        const subscription=await stripe.subscriptions.retrieve(session.subscription as string)
        const endsAt=subscription.trial_end?new Date(subscription.trial_end*1000).toISOString():new Date(subscription.current_period_end*1000).toISOString()
        await admin.from('subscriptions').update({package:plan,billing_cycle:billing,amount:(session.amount_total||0)/100,status:subscription.status==='trialing'?'trialing':'active',ends_at:endsAt}).eq('shop_id',shopId)
        await admin.from('shops').update({package:plan,updated_at:new Date().toISOString()}).eq('id',shopId)
      }
    }
    if(event.type==='invoice.paid'){
      const invoice=event.data.object as Stripe.Invoice
      const subscriptionId=typeof invoice.subscription==='string'?invoice.subscription:null
      if(subscriptionId){const sub=await stripe.subscriptions.retrieve(subscriptionId);const shopId=sub.metadata.shop_id;if(shopId)await admin.from('payments').insert({shop_id:shopId,amount:invoice.amount_paid/100,status:'paid',paid_at:new Date((invoice.status_transitions.paid_at||Math.floor(Date.now()/1000))*1000).toISOString()})}
    }
    return new Response(JSON.stringify({received:true}),{headers:{'Content-Type':'application/json'}})
  }catch(error){return new Response(error.message,{status:400})}
})
