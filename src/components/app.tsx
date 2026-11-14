import { Leaf } from 'lucide-react';
export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-8">
      <Leaf className="size-10 text-primary" aria-hidden="true" />
      <p className="text-sm tracking-widest text-muted-foreground uppercase">
        Welcome to Oasis
      </p>
      <h1 className="text-5xl font-semibold tracking-tight">
        Your personal space on the web.
      </h1>
      <p className="max-w-lg text-lg text-muted-foreground">
        A calmer home for your bookmarks, ideas, and everyday browsing. Your
        library will live on this device.
      </p>
      <p className="text-sm text-muted-foreground">
        Project foundation · Dashboard coming next
      </p>
    </main>
  );
}
