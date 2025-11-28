import { Layout } from "../components/Layout";

export default function PrivacyPolicyPage() {
  return (
    <Layout title="Privacy Policy">
      <article className="prose dark:prose-invert max-w-3xl">
        <h1>Privacy Policy (Draft)</h1>
        <p>
          This is a placeholder privacy policy for the Accessibility Education Platform.
          The full, legally reviewed policy will replace this draft before any public release.
        </p>
        <ul>
          <li>
            The platform processes educational materials and handwritten notes to create accessible formats for blind and
            low-vision learners.
          </li>
          <li>During early development, all data used will be synthetic or test data only.</li>
          <li>
            A full privacy policy describing data retention, security, and user rights will be provided before any real
            user data is processed.
          </li>
        </ul>
      </article>
    </Layout>
  );
}
