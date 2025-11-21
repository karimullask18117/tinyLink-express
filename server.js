const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const Links = require('./db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Healthcheck
app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: "1.0" });
});

// API routes
app.post('/api/links', async (req, res) => {
  try {
    const { url, code } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const created = await Links.createLink(url, code);
    res.status(201).json(created);
  } catch (err) {
    if (err && err.code === 'EEXISTS') return res.status(409).json({ error: err.message });
    return res.status(400).json({ error: err.message || 'bad request' });
  }
});

app.get('/api/links', async (req, res) => {
  const rows = await Links.listLinks();
  res.json(rows);
});

app.get('/api/links/:code', async (req, res) => {
  const code = req.params.code;
  const row = await Links.getLink(code);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.delete('/api/links/:code', async (req, res) => {
  const code = req.params.code;
  const ok = await Links.deleteLink(code);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.status(204).send();
});

// Redirect route (must be after API routes)
app.get('/:code', async (req, res) => {
  const code = req.params.code;
  // don't treat known API/static paths as redirect
  if (code === 'api' || code === 'healthz') return res.status(404).send('Not found');
  const row = await Links.getLink(code);
  if (!row) return res.status(404).send('Not found');
  // redirect and increment
  await Links.incrementClick(code);
  res.redirect(302, row.url);
});

// Serve frontend index for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TinyLink running on http://localhost:${PORT}`);
});
