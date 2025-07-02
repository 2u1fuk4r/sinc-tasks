'use server'

import { supabase } from '@/lib/supabaseClient'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getUserTasks() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('User not found.')

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function addTask(formData: FormData) {
  const task_name = formData.get('task_name') as string
  const status = formData.get('status') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not found.')

  await supabase.from('tasks').insert([{ task_name, status, user_id: user.id }])
  revalidatePath('/tasks')
  redirect('/tasks')
}

export async function updateTaskName(formData: FormData) {
  const id = formData.get('id') as string
  const task_name = formData.get('task_name') as string
  await supabase.from('tasks').update({ task_name }).eq('id', id)
  revalidatePath('/tasks')
}

export async function updateTaskStatus(formData: FormData) {
  const id = formData.get('id') as string
  const status = formData.get('status') as string
  await supabase.from('tasks').update({ status }).eq('id', id)
  revalidatePath('/tasks')
}

export async function deleteTask(formData: FormData) {
  const id = formData.get('id') as string
  await supabase.from('tasks').delete().eq('id', id)
  revalidatePath('/tasks')
}
