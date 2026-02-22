import {
  Home,
  MessageCircle,
  BookOpen,
  UsersRound,
  Star,
  UserRound,
  FileText,
  PlusSquare,
} from "lucide-react";

// Rota corrigida: /app/chat → /app/chats
export const appNav = [
  { href: "/app/feed", label: "Feed", icon: Home },
  { href: "/app/chats", label: "Chats", icon: MessageCircle }, // ← era /app/chat (rota inexistente)
  { href: "/app/wiki", label: "Wiki", icon: BookOpen },
  { href: "/app/highlights", label: "Destaques", icon: Star },
  { href: "/app/personas", label: "Personas", icon: UsersRound },
  { href: "/app/profile", label: "Perfil", icon: UserRound },
  { href: "/app/drafts", label: "Rascunhos", icon: FileText },
] as const;

export const quickActions = [
  { href: "/app/feed/new", label: "Novo post", icon: PlusSquare },
  { href: "/app/wiki/new", label: "Nova wiki", icon: PlusSquare },
] as const;
