const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { param } = require('express-validator');

router.get('/:type', [
  auth,
  param('type').isIn(['daily', 'weekly', 'all-time'])
], async (req, res) => {
  try {
    const { type } = req.params;
    let query = { username: { $exists: true, $ne: '' }, xp: { $gt: 0 } };
    let sort = { xp: -1 };  // Always sort by XP, descending

    const now = new Date();

    switch (type) {
      case 'daily':
        query.lastTapTime = { 
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) 
        };
        break;
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        query.lastTapTime = { $gte: startOfWeek };
        break;
      case 'all-time':
        // No additional query needed for all-time
        break;
    }

    const leaderboard = await User.find(query)
      .sort(sort)
      .limit(100)
      .select('username xp computePower compute lastTapTime');

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/position/:type', [
  auth,
  param('type').isIn(['daily', 'weekly', 'all-time'])
], async (req, res) => {
  try {
    const { type } = req.params;
    const user = await User.findOne({ telegramId: req.user.telegramId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    let query = { xp: { $gt: user.xp } };

    const now = new Date();

    switch (type) {
      case 'daily':
        query.lastTapTime = { 
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) 
        };
        break;
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        query.lastTapTime = { $gte: startOfWeek };
        break;
      case 'all-time':
        // No additional query needed for all-time
        break;
    }

    const position = await User.countDocuments(query) + 1;
    const totalUsers = await User.countDocuments({ xp: { $gt: 0 } });

    res.json({ position, totalUsers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
