import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-display text-4xl">Not found</h1>
      <p className="mt-2 text-ivory-dim">That lead doesn&rsquo;t exist, or it was removed.</p>
      <Link href="/" className="btn mt-6">Back to the pipeline</Link>
    </div>
  );
}
