const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fallbackDb = require('../utils/fallbackDb');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    console.log('📂 MISSION_CONTROL: Saving to:', uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    console.log('📄 MISSION_CONTROL: Generated filename:', uniqueName);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// GET /tasks/download/:filename — Download task attachments
router.get('/download/:filename', (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', fileName);
  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error('Download failed:', err);
      if (!res.headersSent) {
        res.status(404).json({ message: 'File not found' });
      }
    }
  });
});

// GET /tasks/my — tasks assigned to logged-in user
router.get('/my', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: 'User ID is required' });
  
  try {
    const tasks = await fallbackDb.find('tasks', { assignedTo: userId });
    
    // Manual Populate for Project Info
    const projects = await fallbackDb.find('projects', {});
    const tasksWithProject = tasks.map(task => {
      const project = projects.find(p => p.id === task.projectId || p._id === task.projectId);
      return { ...task, projectId: project || { title: 'Unknown Project', sector: 'General' } };
    });

    res.json(tasksWithProject);
  } catch (err) {
    res.status(500).json({ message: 'Failed to synchronize task queue' });
  }
});

// PUT /tasks/:id/status — update task status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const updated = await fallbackDb.update('tasks', req.params.id, { status });
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update mission status' });
  }
});

// POST /tasks/:id/comment — add comment
router.post('/:id/comment', async (req, res) => {
  const { text, userId } = req.body;
  try {
    const task = await fallbackDb.findById('tasks', req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    const comments = task.comments || [];
    comments.push({ user: userId, text, date: new Date() });
    
    const updated = await fallbackDb.update('tasks', req.params.id, { comments });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Comment transmission failed' });
  }
});

// DELETE /tasks/:id — remove task
router.delete('/:id', async (req, res) => {
  try {
    await fallbackDb.deleteOne('tasks', req.params.id);
    res.json({ message: 'Task terminated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to terminate task' });
  }
});

// POST /tasks — create new task (Admin) with file support
router.post('/', upload.array('attachments'), async (req, res) => {
  console.log('🚀 MISSION_CONTROL: Received task assignment request');
  console.log('Body:', req.body);
  console.log('Files received:', req.files?.length || 0);
  
  try {
    const taskData = req.body;
    
    // Parse files if they exist
    const files = (req.files || []).map(f => ({
      name: f.originalname,
      filename: f.filename,
      path: f.path,
      url: `/uploads/${f.filename}`,
      size: (f.size / 1024).toFixed(1) + 'KB'
    }));
    
    console.log('Processed files:', files);

    const newTask = { 
      ...taskData, 
      files: files.length > 0 ? files : (taskData.files ? (typeof taskData.files === 'string' ? JSON.parse(taskData.files) : taskData.files) : []),
      createdAt: new Date() 
    };
    
    const saved = await fallbackDb.save('tasks', newTask);
    res.status(201).json(saved);
  } catch (err) {
    console.error('❌ MISSION_FAILURE: Task deployment failed:', err);
    res.status(500).json({ message: 'Failed to deploy new task' });
  }
});

module.exports = router;
