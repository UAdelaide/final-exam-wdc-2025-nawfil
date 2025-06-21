// routes/dogRoutes.js
const express = require('express');
const db = require('../models/db'); 
const router = express.Router();

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
