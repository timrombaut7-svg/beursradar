import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted">Deze pagina of asset bestaat niet.</p>
      <Link href="/" className="mt-6 inline-block text-accent hover:underline">
        Terug naar dashboard
      </Link>
    </div>
  );
}
