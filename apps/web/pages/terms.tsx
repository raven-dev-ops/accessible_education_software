import { Layout } from "../components/Layout";

export default function TermsPage() {
  return (
    <Layout title="Terms of Service">
      <article className="prose dark:prose-invert max-w-3xl">
        <h1>Terms of Service (Draft)</h1>
        <p>
          This is a placeholder terms-of-service document for the Accessibility Education Platform. Full, legally reviewed
          terms will replace this draft before any public release.
        </p>
        <p>By using this software, you agree that:</p>
        <ul>
          <li>The platform is provided for educational and accessibility research purposes.</li>
          <li>No production use with real student data should occur until the terms are finalized.</li>
          <li>The maintainers may modify or remove access to this service during active development.</li>
        </ul>
      </article>
    </Layout>
  );
}
