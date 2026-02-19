const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('../frontend'));

// Initialize database
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(16) UNIQUE NOT NULL,
        pin_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT username_length CHECK (char_length(username) >= 4 AND char_length(username) <= 16)
      );

      CREATE TABLE IF NOT EXISTS tabs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tab_id VARCHAR(50) NOT NULL,
        tab_name TEXT,
        content TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tab_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_tabs ON tabs(user_id);
    `);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  } finally {
    client.release();
  }
}

// Validate username
function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 4 || username.length > 16) return false;
  return /^[a-zA-Z0-9]+$/.test(username);
}

// Validate PIN
function validatePin(pin) {
  if (!pin || typeof pin !== 'string') return false;
  if (pin.length < 4 || pin.length > 16) return false;
  return /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(pin);
}

// Register new user
app.post('/api/register', async (req, res) => {
  const { username, pin } = req.body;

  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Username must be 4-16 characters (letters and numbers only)' });
  }

  if (!validatePin(pin)) {
    return res.status(400).json({ error: 'PIN must be 4-16 characters' });
  }

  try {
    const pinHash = await bcrypt.hash(pin, 10);
    const result = await pool.query(
      'INSERT INTO users (username, pin_hash) VALUES ($1, $2) RETURNING id, username',
      [username.toLowerCase(), pinHash]
    );

    res.json({ 
      success: true, 
      user: { id: result.rows[0].id, username: result.rows[0].username }
    });
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
    } else {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, pin } = req.body;

  if (!validateUsername(username) || !validatePin(pin)) {
    return res.status(400).json({ error: 'Invalid credentials format' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, pin_hash FROM users WHERE username = $1',
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or PIN' });
    }

    const user = result.rows[0];
    const validPin = await bcrypt.compare(pin, user.pin_hash);

    if (!validPin) {
      return res.status(401).json({ error: 'Invalid username or PIN' });
    }

    res.json({ 
      success: true, 
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all tabs for user
app.get('/api/tabs/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT tab_id, tab_name, content, updated_at FROM tabs WHERE user_id = $1 ORDER BY tab_id',
      [userId]
    );

    res.json({ success: true, tabs: result.rows });
  } catch (err) {
    console.error('Get tabs error:', err);
    res.status(500).json({ error: 'Failed to fetch tabs' });
  }
});

// Save/update tab
app.post('/api/tabs', async (req, res) => {
  const { userId, tabId, tabName, content } = req.body;

  if (!userId || !tabId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await pool.query(
      `INSERT INTO tabs (user_id, tab_id, tab_name, content, updated_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, tab_id) 
       DO UPDATE SET tab_name = $3, content = $4, updated_at = CURRENT_TIMESTAMP`,
      [userId, tabId, tabName || '', content || '']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Save tab error:', err);
    res.status(500).json({ error: 'Failed to save tab' });
  }
});

// Delete tab
app.delete('/api/tabs/:userId/:tabId', async (req, res) => {
  const { userId, tabId } = req.params;

  try {
    await pool.query(
      'DELETE FROM tabs WHERE user_id = $1 AND tab_id = $2',
      [userId, tabId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete tab error:', err);
    res.status(500).json({ error: 'Failed to delete tab' });
  }
});

// Clear all tabs for user
app.delete('/api/tabs/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    await pool.query('DELETE FROM tabs WHERE user_id = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Clear tabs error:', err);
    res.status(500).json({ error: 'Failed to clear tabs' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initDatabase();
});
