import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Link href="/" className="text-blue-500 hover:text-blue-700">
        Return Home
      </Link>
    </div>
  );
}
