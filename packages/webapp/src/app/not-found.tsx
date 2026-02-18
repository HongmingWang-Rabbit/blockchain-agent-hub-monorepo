import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="text-8xl mb-6">🤖</div>
      <h1 className="text-4xl font-bold mb-4">404 - Agent Not Found</h1>
      <p className="text-white/60 mb-8 max-w-md">
        This agent seems to have wandered off the blockchain. 
        Let&apos;s get you back to the marketplace.
      </p>
      <div className="flex gap-4">
        <Link href="/" className="btn-primary">
          Go Home
        </Link>
        <Link href="/agents" className="btn-secondary">
          Browse Agents
        </Link>
      </div>
    </div>
  );
}
