import {
  Home,
  MessageCircle,
  BookOpen,
  UsersRound,
  PlusSquare,
} from "lucide-react";

export const appNav = [
  { href: "/app/feed", label: "Feed", icon: Home },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
  { href: "/app/wiki", label: "Wiki", icon: BookOpen },
  { href: "/app/personas", label: "Personas", icon: UsersRound },
] as const;

// ações rápidas (opcional)
export const quickActions = [
  { href: "/app/feed/new", label: "Novo post", icon: PlusSquare },
  { href: "/app/wiki/new", label: "Nova wiki", icon: PlusSquare },
] as const;
