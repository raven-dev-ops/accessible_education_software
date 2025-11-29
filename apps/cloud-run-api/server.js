const express = require('express');
const RateLimit = require('express-rate-limit');
const { Connector } = require('@google-cloud/cloud-sql-connector');
const { Pool } = require('pg');

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY;
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME; // e.g. cs-poc-kvjwpp97kjozemn894cmvvg:us-central1:accessible-software-db
const DB_USER = process.env.DB_USER || 'appuser';
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME || 'appdb';

// Rate limiter: max 100 requests per 15 minutes per IP for DB-backed routes
const dbLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

if (!API_KEY) {
  console.warn('WARNING: API_KEY is not set. Set API_KEY to protect the Cloud Run endpoint.');
}

if (!INSTANCE_CONNECTION_NAME) {
  console.warn('WARNING: INSTANCE_CONNECTION_NAME is not set. Set it to your Cloud SQL instance connection name.');
}

const app = express();
app.use(express.json());

// Simple API key guard
app.use((req, res, next) => {
  if (!API_KEY) return res.status(500).json({ error: 'API_KEY is not configured' });
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
});

let pool;

async function initPool() {
  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: INSTANCE_CONNECTION_NAME,
    ipType: 'PRIVATE',
  });

  pool = new Pool({
    ...clientOpts,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    // The connector provides an SSL config when needed.
    ssl: clientOpts.ssl,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
}

app.get('/health', (req, res) => {
  return res.json({ ok: true, status: 'healthy' });
});

app.get('/db-ping', dbLimiter, async (req, res) => {
  try {
    if (!pool) {
      await initPool();
    }
    const result = await pool.query('SELECT current_user, now() as now');
    return res.json({ ok: true, result: result.rows[0] });
  } catch (error) {
    console.error('DB ping failed', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Placeholder profile read (you can adapt to your schema)
app.get('/profile', dbLimiter, async (req, res) => {
  try {
    if (!pool) {
      await initPool();
    }
    // Replace with your own profile table/query.
    const result = await pool.query('SELECT current_user');
    return res.json({ ok: true, user: result.rows[0].current_user });
  } catch (error) {
    console.error('Profile fetch failed', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Students list (admin-facing)
app.get('/students', dbLimiter, async (req, res) => {
  try {
    if (!pool) {
      await initPool();
    }
    const result = await pool.query(
      'SELECT "id", "name", "email", "createdAt" FROM "User" WHERE "role" = $1 ORDER BY "createdAt" ASC LIMIT 100',
      ['student']
    );
    const students = result.rows.map((row) => ({
      id: row.id,
      name: row.name || row.email,
      email: row.email,
      course: null,
      createdAt: row.createdat ? new Date(row.createdat).toISOString() : null,
    }));
    return res.json({ ok: true, students });
  } catch (error) {
    console.error('Students fetch failed', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Uploads summary
app.get('/uploads', dbLimiter, async (req, res) => {
  try {
    if (!pool) {
      await initPool();
    }
    const result = await pool.query(
      'SELECT "id", "filename", "mimetype", "size", "status", "createdAt" FROM "Upload" ORDER BY "createdAt" DESC LIMIT 50'
    );
    const uploads = result.rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      mimetype: row.mimetype,
      size: row.size,
      status: row.status,
      createdAt: row.createdat ? new Date(row.createdat).toISOString() : null,
    }));
    return res.json({ ok: true, uploads });
  } catch (error) {
    console.error('Uploads fetch failed', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Modules summary (with course name)
app.get('/modules', dbLimiter, async (req, res) => {
  try {
    if (!pool) {
      await initPool();
    }
    const result = await pool.query(
      'SELECT m."id", m."title", c."name" as course FROM "Module" m JOIN "Course" c ON m."courseId" = c."id" ORDER BY m."createdAt" ASC'
    );
    const modules = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      course: row.course,
    }));
    return res.json({ ok: true, modules });
  } catch (error) {
    console.error('Modules fetch failed', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Support tickets derived from Log table
app.get('/support-tickets', dbLimiter, async (req, res) => {
  try {
    if (!pool) {
      await initPool();
    }
    const result = await pool.query(
      'SELECT "id", "message", "createdAt", "meta" FROM "Log" WHERE "level" = $1 ORDER BY "createdAt" DESC LIMIT 50',
      ['support_ticket']
    );
    const tickets = result.rows.map((row) => {
      const meta = row.meta || {};
      return {
        id: row.id,
        detail: row.message,
        createdAt: row.createdat ? new Date(row.createdat).toISOString() : null,
        score: meta.score ?? null,
        userEmail: meta.userEmail ?? null,
        attachmentUrl: meta.attachmentUrl ?? null,
        scannedText: meta.scannedText ?? null,
        correctedText: meta.correctedText ?? null,
        fileName: meta.fileName ?? null,
      };
    });
    return res.json({ ok: true, tickets });
  } catch (error) {
    console.error('Support tickets fetch failed', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Cloud Run API listening on port ${PORT}`);
});
