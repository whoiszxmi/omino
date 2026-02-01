import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Kyodo-like</h1>
        <Button size="sm" variant="secondary">
          Entrar
        </Button>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">MVP</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Feed, Wiki, Biblioteca, Chats e Personas — tudo em uma comunidade.
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button className="rounded-2xl">Feed</Button>
        <Button className="rounded-2xl" variant="secondary">
          Wiki
        </Button>
        <Button className="rounded-2xl" variant="secondary">
          Biblioteca
        </Button>
        <Button className="rounded-2xl" variant="secondary">
          Chats
        </Button>
      </div>

      <div className="mt-auto text-xs text-muted-foreground">
        Mobile-first • PWA • Supabase
      </div>
    </main>
  );
}
