const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 8080;

app.use(express.json());

let db;

(async () => {
  try {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });
    console.log('✅ Connected to DogWalkService database');

    // Seed test data if not already present
    const [userCount] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (userCount[0].count === 0) {
      console.log('📦 Seeding initial test data...');

      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role)
        VALUES
          ('alice123', 'alice@example.com', 'hashed123', 'owner'),
          ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
          ('carol123', 'carol@example.com', 'hashed789', 'owner'),
          ('davewalker', 'dave@example.com', 'hashed321', 'walker'),
          ('eveowner', 'eve@example.com', 'hashed654', 'owner')
      `);

      await db.execute(`
        INSERT INTO Dogs (name, size, owner_id)
        VALUES
          ('Max', 'medium', (SELECT user_id FROM Users WHERE username='alice123')),
          ('Bella', 'small', (SELECT user_id FROM Users WHERE username='carol123')),
          ('Rocky', 'large', (SELECT user_id FROM Users WHERE username='eveowner')),
          ('Luna', 'medium', (SELECT user_id FROM Users WHERE username='carol123')),
          ('Coco', 'small', (SELECT user_id FROM Users WHERE username='alice123'))
      `);

      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        VALUES
          ((SELECT dog_id FROM Dogs WHERE name='Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
          ((SELECT dog_id FROM Dogs WHERE name='Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
          ((SELECT dog_id FROM Dogs WHERE name='Rocky'), '2025-06-11 10:00:00', 60, 'Hilltop Trail', 'open'),
          ((SELECT dog_id FROM Dogs WHERE name='Luna'), '2025-06-11 14:30:00', 20, 'Riverbank Walk', 'open'),
          ((SELECT dog_id FROM Dogs WHERE name='Coco'), '2025-06-12 07:00:00', 40, 'Botanic Gardens', 'open')
      `);

      console.log('✅ Test data inserted.');
    }
  } catch (err) {
    console.error('❌ DB Setup Error:', err.message);
  }
})();

// =========================
// ROUTE: /api/dogs
// =========================
app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs', details: err.message });
  }
});

// =========================
// ROUTE: /api/walkrequests/open
// =========================
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
    SELECT wr.request_id, d.name AS dog_name, wr.requested_time AS requested_time,
         wr.duration_minutes, wr.location, u.username AS owner_username
    FROM WalkRequests wr
    JOIN Dogs d ON wr.dog_id = d.dog_id
    JOIN Users u ON d.owner_id = u.user_id
    WHERE wr.status = 'open'
`);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch open walk requests', details: err.message });
  }
});

// =========================
// ROUTE: /api/walkers/summary
// =========================
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        u.username AS walker_username,
        COUNT(wr.rating_id) AS total_ratings,
        ROUND(AVG(wr.rating), 1) AS average_rating,
        (
          SELECT COUNT(*)
          FROM WalkRequests wr2
          JOIN WalkApplications wa2 ON wr2.request_id = wa2.request_id
          WHERE wa2.walker_id = u.user_id AND wr2.status = 'completed' AND wa2.status = 'accepted'
        ) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings wr ON u.user_id = wr.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walker summary', details: err.message });
  }
});

// =========================
// Start the Server
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
