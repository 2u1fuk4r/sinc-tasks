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

type Task = {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
      } else {
        fetchTasks()
      }
    })
  }, [router])

  async function fetchTasks() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from<Task>('tasks')
      .select('*')
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
      setError('Kullanıcı bulunamadı.')
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

  return (
    <div className="overflow-x-auto">
      <div className="min-h-screen bg-gray-100 p-8 flex justify-center items-start gap-6 text-black">
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map((columnId) => {
            const columnTasks = tasks.filter((task) => task.status === columnId)
            return (
              <Droppable droppableId={columnId} key={columnId}>
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
                              {task.task_name}
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
                          Ekle
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
        {loading && <p className="text-black">Yükleniyor...</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>
  )
}
