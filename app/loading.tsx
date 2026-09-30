export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl animate-pulse px-5 py-8 lg:px-8">
      <span className="sr-only">Carregando conteúdo</span>
      <div className="h-4 w-36 rounded bg-white/[.06]" />
      <div className="mt-4 h-10 w-72 max-w-full rounded bg-white/[.08]" />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="grim-card h-52 rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
