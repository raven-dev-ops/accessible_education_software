import Link from "next/link";
import { Layout } from "../components/Layout";

export default function NotFoundPage() {
  return (
    <Layout title="Page not found">
      <section
        aria-labelledby="not-found-heading"
        className="max-w-xl space-y-4"
      >
        <h2 id="not-found-heading" className="text-xl font-semibold">
          Page not found
        </h2>
        <p>
          We couldn&apos;t find this page in the Accessible Education Platform.
          It may have been moved, or the URL might be incorrect.
        </p>
        <div className="space-y-2">
          <p className="font-medium">Try one of these options:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <Link href="/" className="underline">
                Go to the home page
              </Link>
            </li>
            <li>
              <Link href="/login" className="underline">
                Go to the login / “Coming Soon” page
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="underline">
                Go to your dashboard
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </Layout>
  );
}

