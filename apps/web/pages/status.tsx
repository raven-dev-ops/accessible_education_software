import type { GetServerSideProps } from "next";
import { Layout } from "../components/Layout";

type StatusProps = {
  envLabel: string;
  nodeEnv: string;
  authEnabled: boolean;
  stagingBanner: boolean;
  auth0IssuerBaseUrl: string | null;
  auth0BaseUrl: string | null;
  hasDatabaseUrl: boolean;
  hasOcrServiceUrl: boolean;
};

export const getServerSideProps: GetServerSideProps<StatusProps> = async () => {
  const authEnabled =
    process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

  const stagingBanner =
    process.env.NEXT_PUBLIC_SHOW_STAGING_BANNER === "true" ||
    process.env.NEXT_PUBLIC_SHOW_STAGING_BANNER === "1";

  const nodeEnv = process.env.NODE_ENV ?? "development";

  const envLabel =
    process.env.NEXT_PUBLIC_ENV_LABEL ??
    (nodeEnv === "production"
      ? authEnabled
        ? "production-auth"
        : "production-coming-soon"
      : "development");

  return {
    props: {
      envLabel,
      nodeEnv,
      authEnabled,
      stagingBanner,
      auth0IssuerBaseUrl: process.env.AUTH0_ISSUER_BASE_URL ?? null,
      auth0BaseUrl: process.env.AUTH0_BASE_URL ?? null,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasOcrServiceUrl: Boolean(process.env.OCR_SERVICE_URL),
    },
  };
};

export default function StatusPage(props: StatusProps) {
  return (
    <Layout title="System status">
      <section aria-labelledby="status-overview">
        <h2 id="status-overview" className="text-lg font-semibold mb-4">
          Deployment overview
        </h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium w-48">Environment label</dt>
            <dd>{props.envLabel}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-48">NODE_ENV</dt>
            <dd>{props.nodeEnv}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-48">Auth enabled</dt>
            <dd>{props.authEnabled ? "Yes" : "No"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-48">Staging banner</dt>
            <dd>{props.stagingBanner ? "Visible" : "Hidden"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-48">Auth0 issuer base URL</dt>
            <dd>{props.auth0IssuerBaseUrl ?? "Not configured"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-48">Auth0 base URL</dt>
            <dd>{props.auth0BaseUrl ?? "Not configured"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-48">Database URL configured</dt>
            <dd>{props.hasDatabaseUrl ? "Yes" : "No"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-48">OCR service URL configured</dt>
            <dd>{props.hasOcrServiceUrl ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </section>
    </Layout>
  );
}

