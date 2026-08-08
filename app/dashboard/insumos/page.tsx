import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getInsumos, getCategoriasWithCount } from '@/lib/supabase/insumos'
import InsumosClient from '@/components/Insumos/InsumosClient'

export default async function InsumosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const insumos = await getInsumos()
  const categories = await getCategoriasWithCount()

  return <InsumosClient initialInsumos={insumos} initialCategories={categories} />
}