import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export function useStoreRows<T>(storeId:string|undefined, table:string, fallback:T[]){
  const client=useQueryClient()
  const query=useQuery({queryKey:['store',storeId,table],queryFn:async()=>{
    if(!storeId||!supabase) return fallback
    const {data,error}=await supabase.from(table).select('*').eq('store_id',storeId)
    if(error) throw error
    return (data||[]) as T[]
  },placeholderData:fallback,retry:false})
  useEffect(()=>{
    if(!storeId||!supabase) return
    const channel=supabase.channel(`${table}:${storeId}`).on('postgres_changes',{event:'*',schema:'public',table,filter:`store_id=eq.${storeId}`},()=>client.invalidateQueries({queryKey:['store',storeId,table]})).subscribe()
    return()=>{supabase.removeChannel(channel)}
  },[client,storeId,table])
  return query
}
