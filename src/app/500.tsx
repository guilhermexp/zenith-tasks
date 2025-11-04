export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-200">Erro interno do servidor</h2>
        <p className="text-neutral-400">Algo deu errado. Tente novamente mais tarde.</p>
      </div>
    </div>
  );
}
