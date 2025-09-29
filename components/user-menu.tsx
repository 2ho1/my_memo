"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"

export default function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      console.log("Starting logout process...")
      await signOut({ 
        callbackUrl: "/auth/signin",
        redirect: true 
      })
      console.log("Logout successful")
    } catch (error) {
      console.error("Logout error:", error)
      // Fallback: redirect manually
      window.location.href = "/auth/signin"
    }
  }

  if (!session) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/auth/signin")}
          className="glass-effect border-0"
        >
          로그인
        </Button>
        <Button
          onClick={() => router.push("/auth/signup")}
          className="bg-primary hover:bg-primary/90"
        >
          회원가입
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 shadow-sm max-w-fit">
      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 ring-2 ring-blue-500/20 flex-shrink-0">
        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-xs sm:text-sm">
          {session.user?.name?.charAt(0) || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="hidden sm:block min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-20">
          {session.user?.name}님
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-lg transition-all duration-200 flex-shrink-0 px-1.5 sm:px-2 h-6 sm:h-8"
      >
        <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline ml-1 text-xs sm:text-sm">로그아웃</span>
      </Button>
    </div>
  )
}
