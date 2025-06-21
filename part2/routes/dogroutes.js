// routes/dogRoutes.js
const express = require('express');
const db = require('../models/db');
const router = express.Router();

// GET dogs owned by the logged-in user
router.get('/mydogs', async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const ownerId = req.session.user.user_id;
    try {
      const [dogs] = await db.query('SELECT dog_id, name FROM Dogs WHERE owner_id = ?', [ownerId]);
      res.json(dogs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load dogs' });
    }
  });

// GET all dogs with owner_id
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT dog_id, name, size, owner_id FROM Dogs');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

module.exports = router;
