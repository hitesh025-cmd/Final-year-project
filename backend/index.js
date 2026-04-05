import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { initDb } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Init DB
initDb();

// --- API Routes ---

// --- Donors ---
app.get('/api/donors', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM donors');
    res.json(rows.map(d => ({ ...d, available: !!d.available })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/donors', async (req, res) => {
  const { name, bloodGroup, city, contact, lastDonationDate, available } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO donors (name, "bloodGroup", city, contact, "lastDonationDate", available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, bloodGroup, city, contact, lastDonationDate || null, available !== false]
    );
    res.json({ id: rows[0].id, ...req.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/donors/:id', async (req, res) => {
  const { name, bloodGroup, city, contact, lastDonationDate, available } = req.body;
  try {
    await pool.query(
      'UPDATE donors SET name = $1, "bloodGroup" = $2, city = $3, contact = $4, "lastDonationDate" = $5, available = $6 WHERE id = $7',
      [name, bloodGroup, city, contact, lastDonationDate || null, !!available, req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/donors/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM donors WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Requests ---
app.get('/api/requests', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM requests');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/requests', async (req, res) => {
  const { patientName, bloodGroup, hospitalName, units, urgency } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO requests ("patientName", "bloodGroup", "hospitalName", units, urgency) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [patientName, bloodGroup, hospitalName, units, urgency]
    );
    res.json({ id: rows[0].id, ...req.body, status: 'pending', assignedDonorId: null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/requests/:id', async (req, res) => {
  const { status, assignedDonorId } = req.body;
  try {
    await pool.query('UPDATE requests SET status = $1, "assignedDonorId" = $2 WHERE id = $3', [status, assignedDonorId || null, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Inventory ---
app.get('/api/inventory', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inventory');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/inventory/:bloodGroup', async (req, res) => {
  const { units } = req.body;
  try {
    await pool.query('UPDATE inventory SET units = $1 WHERE "bloodGroup" = $2', [units, req.params.bloodGroup]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Hospitals ---
app.get('/api/hospitals', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM hospitals');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/hospitals', async (req, res) => {
  const { name, city, address, contact, email } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO hospitals (name, city, address, contact, email) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, city, address || '', contact, email || '']
    );
    res.json({ id: rows[0].id, ...req.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/hospitals/:id', async (req, res) => {
  const { name, city, address, contact, email } = req.body;
  try {
    await pool.query(
      'UPDATE hospitals SET name = $1, city = $2, address = $3, contact = $4, email = $5 WHERE id = $6',
      [name, city, address || '', contact, email || '', req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/hospitals/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM hospitals WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Catch-all route to serve the React app for any deep-linked routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
