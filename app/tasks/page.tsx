'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd'

import Image from 'next/image'

// Yeni task tipi
interface Task {
  id: string
  task_name: string
  status: 'Todo' | 'Pending' | 'Done'
  user_id: string
}

const columns: Task['status'][] = ['Todo', 'Pending', 'Done']

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAdding, setIsAdding] = useState<Task['status'] | null>(null)
  const [newTaskName, setNewTaskName] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskName, setEditTaskName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/login')
      } else {
        // Kullanıcıyı al
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Profil tablosundan avatar url'sini çek
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()
          if (profile && profile.avatar_url) {
            setAvatarUrl(profile.avatar_url)
          }
        }
        fetchTasks()
      }
    })
  }, [router])

  async function fetchTasks() {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('User Not Found.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else if (data) {
      setTasks(data)
    }
    setLoading(false)
  }

  async function updateTaskStatus(taskId: string, newStatus: Task['status']) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) setError(error.message)
    else fetchTasks()
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId !== source.droppableId) {
      updateTaskStatus(draggableId, destination.droppableId as Task['status'])
    }
  }

  async function handleAddTask(status: Task['status']) {
    if (!newTaskName.trim()) return
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('User Not Found.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('tasks').insert([
      {
        task_name: newTaskName,
        status,
        user_id: user.id,
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setNewTaskName('')
      setIsAdding(null)
      fetchTasks()
    }
    setLoading(false)
  }

  async function editTask(taskId: string, newName: string) {
    setLoading(true)
    setError('')
    const { error } = await supabase
      .from('tasks')
      .update({ task_name: newName })
      .eq('id', taskId)
    if (error) {
      setError(error.message)
    } else {
      setEditingTaskId(null)
      setEditTaskName('')
      fetchTasks()
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="overflow-x-auto">
      {/* Navbar */}
      <div className="flex justify-between items-center p-4 bg-gray-200">
        <div className="text-lg font-semibold text-black">My Tasks</div>
        <div className="flex items-center gap-4">
          <Image
            src={avatarUrl || "https://lh3.googleusercontent.com/a/ACg8ocJQus3niHVnRqVa5FL5VVAqmlpxSuRwwqfxibPPJS9RVvYCX6HX=s360-c-no"}
            alt="avatar"
            width={40}
            height={40}
            className="rounded-full"
          />
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="min-h-screen bg-gray-100 p-8 flex justify-center items-start gap-6 text-black">
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map((columnId) => {
            const columnTasks = tasks.filter((task) => task.status === columnId)
            return (
              <Droppable
                droppableId={columnId}
                key={columnId}
                isDropDisabled={false}
                isCombineEnabled={false}
              >
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-white rounded-lg p-4 w-96 min-h-[500px] shadow-md flex flex-col"
                  >
                    <h2 className="font-bold text-2xl mb-4 text-black flex justify-between items-center">
                      {columnId}
                      {!isAdding && (
                        <button
                          onClick={() => setIsAdding(columnId)}
                          className="text-green-600 font-bold text-xl hover:text-green-800 transition"
                          aria-label={`Add task to ${columnId}`}
                        >
                          +
                        </button>
                      )}
                    </h2>

                    <div className="flex-grow">
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-4 mb-3 rounded-lg shadow-md cursor-move select-none transition duration-200 ${
                                snapshot.isDragging
                                  ? 'bg-blue-300 text-black'
                                  : 'bg-gray-100 text-black'
                              }`}
                            >
                              {editingTaskId === task.id ? (
                                <form
                                  onSubmit={e => {
                                    e.preventDefault()
                                    editTask(task.id, editTaskName)
                                  }}
                                  className="flex gap-2"
                                >
                                  <input
                                    type="text"
                                    value={editTaskName}
                                    onChange={e => setEditTaskName(e.target.value)}
                                    className="flex-grow p-2 border rounded text-black"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 rounded"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    className="bg-gray-400 hover:bg-gray-500 text-white font-bold px-3 rounded"
                                    onClick={() => {
                                      setEditingTaskId(null)
                                      setEditTaskName('')
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </form>
                              ) : (
                                <div className="flex justify-between items-center">
                                  <span>{task.task_name}</span>
                                  <button
                                    className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                                    onClick={() => {
                                      setEditingTaskId(task.id)
                                      setEditTaskName(task.task_name)
                                    }}
                                    aria-label="Edit task"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>

                    {isAdding === columnId && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleAddTask(columnId)
                        }}
                        className="mt-4 flex gap-2"
                      >
                        <input
                          type="text"
                          autoFocus
                          placeholder="Yeni görev..."
                          className="flex-grow p-2 border rounded text-black"
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 rounded"
                        >
                          insert
                        </button>
                        <button
                          type="button"
                          className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 rounded"
                          onClick={() => {
                            setIsAdding(null)
                            setNewTaskName('')
                          }}
                        >
                          İptal
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </Droppable>
            )
          })}
        </DragDropContext>
        {loading && <p className="text-black">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>
  )
}
