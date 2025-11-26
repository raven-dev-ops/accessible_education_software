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
          Looks like you&apos;ve followed a broken link or entered a URL that
          doesn&apos;t exist on this site.
        </p>
        <p className="text-sm text-gray-700">
          This site hosts the Accessible Education Platform, an AI-powered
          system for making STEM notes accessible to blind and low-vision
          students. Use the links below to get back to a known page.
        </p>
        <div className="space-y-2">
          <p className="font-medium">Where would you like to go?</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <Link href="/" className="underline">
                Go to the home page
              </Link>
            </li>
            <li>
              <Link href="/login" className="underline">
                Go to the login / &quot;Coming Soon&quot; page
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

