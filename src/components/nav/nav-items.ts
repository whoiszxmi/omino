import {
  BookOpen,
  FileText,
  Home,
  MessageCircle,
  Star,
  UserRound,
  UsersRound,
} from "lucide-react";

export const appNavItems = [
  { href: "/app/feed", label: "Feed", icon: Home },
  { href: "/app/chats", label: "Chats", icon: MessageCircle },
  { href: "/app/wiki", label: "Wiki", icon: BookOpen },
  { href: "/app/highlights", label: "Destaques", icon: Star },
  { href: "/app/personas", label: "Personas", icon: UsersRound },
  { href: "/app/profile", label: "Perfil", icon: UserRound },
  { href: "/app/drafts", label: "Rascunhos", icon: FileText },
] as const;
