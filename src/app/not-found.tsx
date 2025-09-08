import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-200">Página não encontrada</h2>
        <p className="text-neutral-400">A página que você está procurando não existe.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}