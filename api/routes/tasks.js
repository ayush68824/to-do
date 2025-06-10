const express = require('express');
const Task = require('../models/Task');
const router = express.Router();

// Create
router.post('/', async (req, res) => {
  try {
    const task = new Task({ ...req.body, userId: req.userId });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create task' });
  }
});

// Read with filtering, sorting, and search
router.get('/', async (req, res) => {
  try {
    const { status, sortBy, q } = req.query;
    const query = { userId: req.userId };
    if (status) query.status = status;
    if (q) query.$or = [
      { title: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') }
    ];
    const sortOptions = {
      'dueDate': 'dueDate',
      'createdAt': 'createdAt',
      'priority': 'priority',
    };
    const tasks = await Task.find(query).sort(sortOptions[sortBy] || 'createdAt');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update task' });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
