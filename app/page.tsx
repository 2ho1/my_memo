"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Search, Edit3, Trash2, Pin, Calendar } from "lucide-react"
import dynamic from 'next/dynamic'

// React Quill을 동적으로 로드 (SSR 문제 방지)
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
})

// Quill 에디터 설정
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
}

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'bullet', 'indent',
  'align', 'link', 'image'
]
import { cn } from "@/lib/utils"
import UserMenu from "@/components/user-menu"

interface Note {
  id: string
  title: string
  content: string
  createdAt: Date | string
  isFavorite: boolean
  color: string
}

const noteColors = [
  "bg-yellow-100 border-yellow-200",
  "bg-pink-100 border-pink-200",
  "bg-blue-100 border-blue-200",
  "bg-green-100 border-green-200",
  "bg-purple-100 border-purple-200",
  "bg-orange-100 border-orange-200",
]

export default function MemoApp() {
  const { data: session, status } = useSession()
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newNote, setNewNote] = useState({ title: "", content: "" })
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [viewingNote, setViewingNote] = useState<Note | null>(null)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [editNote, setEditNote] = useState({ title: "", content: "" })

  // Load notes from database
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch("/api/notes")
        if (response.ok) {
          const data = await response.json()
          setNotes(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error("Failed to fetch notes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchNotes()
    }
  }, [session])

  const handleCreateNote = async () => {
    // ReactQuill content는 HTML이므로 텍스트만 추출해서 확인
    const textContent = newNote.content.replace(/<[^>]*>/g, '').trim()
    if (!newNote.title.trim() || !textContent) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNote.title.trim(),
          content: newNote.content, // HTML 그대로 저장
          color: noteColors[Math.floor(Math.random() * noteColors.length)],
        }),
      })

      if (response.ok) {
        const note = await response.json()
        console.log('저장 성공:', note)
        // 응답된 note 객체가 올바른 구조인지 확인
        if (note && typeof note === 'object' && note.id) {
          setNotes((prev) => {
            const prevNotes = Array.isArray(prev) ? prev : []
            return [note, ...prevNotes]
          })
          setNewNote({ title: "", content: "" })
          setIsCreating(false)
          alert('메모가 저장되었습니다!')
        } else {
          console.error('잘못된 응답 형식:', note)
          alert('저장에 실패했습니다. 다시 시도해주세요.')
        }
      } else {
        const errorData = await response.json()
        console.error('저장 실패:', response.status, errorData)
        alert(`저장에 실패했습니다: ${errorData.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error("Failed to create note:", error)
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setNotes((prev) => {
          const prevNotes = Array.isArray(prev) ? prev : []
          return prevNotes.filter((note) => note.id !== id)
        })
        setDeleteDialogOpen(false)
        setNoteToDelete(null)
      }
    } catch (error) {
      console.error("Failed to delete note:", error)
    }
  }

  const togglePin = async (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !note.isFavorite }),
      })

      if (response.ok) {
        setNotes((prev) => {
          const prevNotes = Array.isArray(prev) ? prev : []
          return prevNotes.map((n) =>
            n.id === id ? { ...n, isFavorite: !n.isFavorite } : n
          )
        })
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error)
    }
  }

  const openDeleteDialog = (note: Note) => {
    setNoteToDelete(note)
    setDeleteDialogOpen(true)
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // 메모 보기 모드 열기
  const openViewMode = (note: Note) => {
    setViewingNote(note)
  }

  // 메모 편집 모드 열기
  const openEditMode = (note: Note) => {
    setEditNote({ title: note.title, content: note.content })
    setEditingNote(note)
    setViewingNote(null)
  }

  // 메모 편집 저장
  const handleUpdateNote = async () => {
    if (!editingNote || !editNote.title.trim() || !editNote.content.replace(/<[^>]*>/g, '').trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    try {
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editNote.title.trim(),
          content: editNote.content,
        }),
      })

      if (response.ok) {
        const updatedNote = await response.json()
        console.log('편집 성공:', updatedNote)
        
        setNotes((prev) => {
          const prevNotes = Array.isArray(prev) ? prev : []
          return prevNotes.map((n) => (n.id === editingNote.id ? updatedNote : n))
        })
        
        setEditingNote(null)
        setEditNote({ title: "", content: "" })
        alert('메모가 수정되었습니다!')
      } else {
        const errorData = await response.json()
        console.error('편집 실패:', response.status, errorData)
        alert(`편집에 실패했습니다: ${errorData.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error("Failed to update note:", error)
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  // 보기/편집 모드 닫기
  const closeViewMode = () => {
    setViewingNote(null)
  }

  const closeEditMode = () => {
    setEditingNote(null)
    setEditNote({ title: "", content: "" })
  }





  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">✨ 메모장</h1>
          <p className="text-muted-foreground mb-6">로그인이 필요합니다</p>
          <Button onClick={() => window.location.href = "/auth/signin"}>
            로그인하기
          </Button>
        </div>
      </div>
    )
  }

  // Filter notes based on search term
  const filteredNotes = Array.isArray(notes) ? notes.filter((note) => {
    if (!note || typeof note !== 'object') return false
    const title = note.title || ''
    const content = note.content || ''
    return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           content.toLowerCase().includes(searchTerm.toLowerCase())
  }) : []

  // Check if currently searching
  const isSearching = searchTerm.length > 0

  // Separate pinned and regular notes
  const pinnedNotes = filteredNotes.filter((note) => note.isFavorite)
  const regularNotes = filteredNotes.filter((note) => !note.isFavorite)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          {/* User Menu - Top right */}
          <div className="flex justify-end mb-4 sm:mb-6 px-2 sm:px-0">
            <div className="w-auto">
              <UserMenu />
            </div>
          </div>
          
          {/* Title - Centered */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg sm:text-xl">M</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-balance">나의 메모장</h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-4">{"생각을 기록하고 아이디어를 정리해보세요"}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Search className="w-3 h-3 text-white" />
            </div>
          </div>
          <Input
            placeholder="메모 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
          />
        </div>

        {/* Create Note Form */}
        {isCreating && (
          <Card className="p-8 mb-8 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-3xl shadow-xl">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">+</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">새 메모 작성</h2>
              </div>
              
              <Input
                placeholder="메모 제목을 입력하세요..."
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className="text-lg font-medium border-2 border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
              />
              
              <div className="bg-white/80 border-2 border-gray-200/50 rounded-xl overflow-hidden">
                <ReactQuill
                  value={newNote.content}
                  onChange={(content) => setNewNote({ ...newNote, content })}
                  modules={quillModules}
                  formats={quillFormats}
                  theme="snow"
                  placeholder="내용을 입력하세요..."
                  style={{ height: '150px' }}
                />
              </div>
              
              <div className="flex gap-3 justify-end mt-8 px-2 py-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false)
                    setNewNote({ title: "", content: "" })
                  }}
                  className="px-8 py-3 border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                >
                  취소
                </Button>
                <Button 
                  onClick={() => {
                    console.log('저장 버튼 클릭됨')
                    console.log('제목:', newNote.title)
                    console.log('내용:', newNote.content)
                    handleCreateNote()
                  }} 
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  저장
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Create Note Button */}
        {!isCreating && (
          <div className="text-center mb-8">
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              새 메모 작성하기
            </Button>
          </div>
        )}

        {/* Pinned Notes Section */}
        {pinnedNotes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Pin className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold text-foreground">고정된 메모</h2>
              <span className="text-sm text-muted-foreground">({pinnedNotes.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pinnedNotes.map((note) => (
                <Card
                  key={note.id}
                  className={cn(
                    "p-6 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-l-4 cursor-pointer group",
                    note.color,
                    note.color?.includes('yellow') ? "border-l-yellow-500" :
                    note.color?.includes('pink') ? "border-l-pink-500" :
                    note.color?.includes('blue') ? "border-l-blue-500" :
                    note.color?.includes('green') ? "border-l-green-500" :
                    note.color?.includes('purple') ? "border-l-purple-500" :
                    note.color?.includes('orange') ? "border-l-orange-500" :
                    "border-l-blue-500"
                  )}
                  onClick={() => openViewMode(note)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg text-card-foreground line-clamp-1 text-balance">{note.title || '제목 없음'}</h3>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePin(note.id)
                        }}
                        className="w-8 h-8 p-0 text-blue-500 hover:bg-blue-50"
                      >
                        <Pin className="w-4 h-4 fill-current" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteDialog(note)
                        }}
                        className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive hover:bg-white/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div 
                    className="text-card-foreground/80 text-sm mb-4 line-clamp-4 leading-relaxed prose prose-sm max-w-none prose-ul:list-disc prose-ol:list-decimal prose-li:list-item"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />

                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(note.createdAt)}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Regular Notes Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-foreground">모든 메모</h2>
            <span className="text-sm text-muted-foreground">({regularNotes.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularNotes.map((note) => (
              <Card
                key={note.id}
                className={cn(
                  "p-6 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-l-4 cursor-pointer group",
                  note.color,
                  note.color?.includes('yellow') ? "border-l-yellow-500" :
                  note.color?.includes('pink') ? "border-l-pink-500" :
                  note.color?.includes('blue') ? "border-l-blue-500" :
                  note.color?.includes('green') ? "border-l-green-500" :
                  note.color?.includes('purple') ? "border-l-purple-500" :
                  note.color?.includes('orange') ? "border-l-orange-500" :
                  "border-l-blue-500"
                )}
                onClick={() => openViewMode(note)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-card-foreground line-clamp-1 text-balance">{note.title || '제목 없음'}</h3>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePin(note.id)
                      }}
                      className={cn(
                        "w-8 h-8 p-0 hover:bg-white/50",
                        note.isFavorite ? "text-blue-500" : "text-muted-foreground",
                      )}
                    >
                      <Pin className={cn("w-4 h-4", note.isFavorite && "fill-current")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteDialog(note)
                      }}
                      className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive hover:bg-white/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div 
                  className="text-card-foreground/80 text-sm mb-4 line-clamp-4 leading-relaxed prose prose-sm max-w-none prose-ul:list-disc prose-ol:list-decimal prose-li:list-item"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />

                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(note.createdAt)}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {!isSearching && regularNotes.length === 0 && pinnedNotes.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Edit3 className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              첫 번째 메모를 작성해보세요
            </h3>
            <p className="text-muted-foreground mb-6">
              새로운 아이디어나 할 일을 기록해보세요
            </p>
            <Button onClick={() => setIsCreating(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />첫 메모 작성하기
            </Button>
          </div>
        )}

        {isSearching && filteredNotes.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Search className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              일치하는 메모가 없습니다
            </h3>
            <p className="text-muted-foreground mb-6">
              다른 키워드로 검색해보세요
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border-2 border-gray-200 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">메모 삭제</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 text-base leading-relaxed">
              정말로 <span className="font-semibold text-gray-900">"{noteToDelete?.title || '제목 없음'}"</span> 메모를 삭제하시겠습니까? 
              <br />
              <span className="text-red-600 font-medium">이 작업은 되돌릴 수 없습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-6 py-2 rounded-xl font-medium">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => noteToDelete && handleDeleteNote(noteToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 보기 모드 */}
      {viewingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className={cn(
            "w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border-l-4",
            viewingNote.color,
            viewingNote.color?.includes('yellow') ? "border-l-yellow-500" :
            viewingNote.color?.includes('pink') ? "border-l-pink-500" :
            viewingNote.color?.includes('blue') ? "border-l-blue-500" :
            viewingNote.color?.includes('green') ? "border-l-green-500" :
            viewingNote.color?.includes('purple') ? "border-l-purple-500" :
            viewingNote.color?.includes('orange') ? "border-l-orange-500" :
            "border-l-blue-500"
          )}>
            {/* 헤더 - 고정 */}
            <div className="p-6 pb-4 border-b border-gray-200/50 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">{viewingNote.title || '제목 없음'}</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openEditMode(viewingNote)}
                    className="bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-lg font-semibold px-4 py-2 rounded-xl transition-all duration-200"
                  >
                    편집
                  </Button>
                  <Button
                    onClick={closeViewMode}
                    className="bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200 hover:border-gray-300 shadow-lg font-semibold px-4 py-2 rounded-xl transition-all duration-200"
                  >
                    닫기
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {formatDate(viewingNote.createdAt)}
              </div>
            </div>
            
            {/* 콘텐츠 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <div 
                className="prose max-w-none prose-ul:list-disc prose-ol:list-decimal prose-li:list-item"
                dangerouslySetInnerHTML={{ __html: viewingNote.content }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* 편집 모드 */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className={cn(
            "w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-l-4",
            editingNote.color,
            editingNote.color?.includes('yellow') ? "border-l-yellow-500" :
            editingNote.color?.includes('pink') ? "border-l-pink-500" :
            editingNote.color?.includes('blue') ? "border-l-blue-500" :
            editingNote.color?.includes('green') ? "border-l-green-500" :
            editingNote.color?.includes('purple') ? "border-l-purple-500" :
            editingNote.color?.includes('orange') ? "border-l-orange-500" :
            "border-l-blue-500"
          )}>
            {/* 헤더 - 고정 */}
            <div className="p-6 pb-4 border-b border-gray-200/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">메모 편집</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateNote}
                    className="bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-lg font-semibold px-4 py-2 rounded-xl transition-all duration-200"
                  >
                    저장
                  </Button>
                  <Button
                    onClick={closeEditMode}
                    className="bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200 hover:border-gray-300 shadow-lg font-semibold px-4 py-2 rounded-xl transition-all duration-200"
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
            
            {/* 콘텐츠 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <div className="space-y-4">
                <Input
                  placeholder="메모 제목을 입력하세요..."
                  value={editNote.title}
                  onChange={(e) => setEditNote({ ...editNote, title: e.target.value })}
                  className="text-lg font-medium border-0 bg-transparent focus:ring-2 focus:ring-primary/20"
                />
                
                <div className="ios-card">
                  <ReactQuill
                    value={editNote.content}
                    onChange={(content) => setEditNote({ ...editNote, content })}
                    modules={quillModules}
                    formats={quillFormats}
                    theme="snow"
                    placeholder="내용을 입력하세요..."
                    style={{ height: '300px' }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}