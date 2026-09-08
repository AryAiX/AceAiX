import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="card-glass max-w-md w-full p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-azure">404</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-3 text-sm text-white/55 leading-6">
          This link is missing or out of date. Head back to the homepage or sign in to continue.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary justify-center">Go home</Link>
          <Link to="/auth/login" className="btn-secondary justify-center">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
