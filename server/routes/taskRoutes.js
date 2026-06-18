const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fallbackDb = require('../utils/fallbackDb');
const { bucket } = require('../firebaseAdmin');
const { auth } = require('../middleware/auth');
 
// GET /tasks — get all tasks (Admin)
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await fallbackDb.find('tasks', { tenantId: req.tenantId || 'org_default' });
    const projects = await fallbackDb.find('projects', { tenantId: req.tenantId || 'org_default' });
    const users = await fallbackDb.find('users', { tenantId: req.tenantId || 'org_default' });
    
    const populated = tasks.map(task => {
      const project = projects.find(p => p.id === task.projectId || p._id === task.projectId);
      const user = users.find(u => u.id === task.assignedTo || u._id === task.assignedTo);
      return { 
        ...task, 
        project: project || { title: 'No Project', sector: 'General' },
        assignedUser: user || { name: 'Unknown Specialist', avatar: '' }
      };
    });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve global task queue' });
  }
});

// Use Memory Storage for Serverless environments
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// GET /tasks/download/:filename — Redirect to Cloud Storage
router.get('/download/:filename', async (req, res) => {
  const fileName = req.params.filename;
  
  if (!bucket) {
    return res.status(503).json({ message: 'Cloud storage engine offline' });
  }

  try {
    const file = bucket.file(`tasks/${fileName}`);
    const [exists] = await file.exists();
    
    if (!exists) {
      return res.status(404).json({ message: 'File not found in mission archive' });
    }

    // Generate a signed URL that expires in 1 hour
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    res.redirect(url);
  } catch (err) {
    console.error('❌ DOWNLOAD_ERROR:', err);
    res.status(500).json({ message: 'Failed to generate secure download link' });
  }
});

// GET /tasks/my — tasks assigned to logged-in user
router.get('/my', auth, async (req, res) => {
  const userId = req.query.userId || req.user.id || req.user._id;
  if (!userId) return res.status(400).json({ message: 'User ID is required' });
  
  try {
    const tasks = await fallbackDb.find('tasks', { assignedTo: userId, tenantId: req.tenantId || 'org_default' });
    
    // Manual Populate for Project Info
    const projects = await fallbackDb.find('projects', { tenantId: req.tenantId || 'org_default' });
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
router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const task = await fallbackDb.findById('tasks', req.params.id);
    if (!task || (task.tenantId !== (req.tenantId || 'org_default') && req.tenantId !== 'org_admin_override')) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const updated = await fallbackDb.update('tasks', req.params.id, { status });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update mission status' });
  }
});

// POST /tasks/:id/comment — add comment
router.post('/:id/comment', auth, async (req, res) => {
  const { text, userId } = req.body;
  try {
    const task = await fallbackDb.findById('tasks', req.params.id);
    if (!task || (task.tenantId !== (req.tenantId || 'org_default') && req.tenantId !== 'org_admin_override')) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const comments = task.comments || [];
    comments.push({ user: userId || req.user.id || req.user._id, text, date: new Date() });
    
    const updated = await fallbackDb.update('tasks', req.params.id, { comments });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Comment transmission failed' });
  }
});

// DELETE /tasks/:id — remove task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await fallbackDb.findById('tasks', req.params.id);
    if (!task || (task.tenantId !== (req.tenantId || 'org_default') && req.tenantId !== 'org_admin_override')) {
      return res.status(404).json({ message: 'Task not found' });
    }
    // Optional: Delete from Firebase Storage too
    if (task.files && bucket) {
      for (const f of task.files) {
        try { await bucket.file(`tasks/${f.filename}`).delete(); } catch(e) {}
      }
    }
    await fallbackDb.deleteOne('tasks', req.params.id);
    res.json({ message: 'Task terminated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to terminate task' });
  }
});

// POST /tasks — create new task (Admin) with CLOUD file support
router.post('/', auth, upload.array('attachments'), async (req, res) => {
  console.log('🚀 MISSION_CONTROL: Received cloud task assignment request');
  
  try {
    const taskData = req.body;
    const files = [];

    if (req.files && req.files.length > 0) {
      if (!bucket) throw new Error('DATABASE_OFFLINE: Cloud Storage unavailable');

      for (const file of req.files) {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        const blob = bucket.file(`tasks/${uniqueName}`);
        const blobStream = blob.createWriteStream({
          metadata: { contentType: file.mimetype },
          resumable: false
        });

        await new Promise((resolve, reject) => {
          blobStream.on('error', reject);
          blobStream.on('finish', resolve);
          blobStream.end(file.buffer);
        });

        files.push({
          name: file.originalname,
          filename: uniqueName,
          url: `/api/tasks/download/${uniqueName}`, // Proxy URL for signed access
          size: (file.size / 1024).toFixed(1) + 'KB'
        });
      }
    }

    const tenantIdToSave = req.tenantId === 'org_admin_override' ? 'org_default' : (req.tenantId || 'org_default');
    const newTask = {
      ...taskData,
      files: files.length > 0 ? files : (typeof taskData.files === 'string' ? JSON.parse(taskData.files || '[]') : taskData.files || []),
      status: taskData.status || 'Assigned',
      tenantId: tenantIdToSave,
      createdAt: new Date().toISOString()
    };
    
    const saved = await fallbackDb.save('tasks', newTask);
    
    // Dispatch Notification
    try {
      await fallbackDb.save('notifications', {
        userId: newTask.assignedTo,
        type: 'TASK_ASSIGNED',
        title: 'New Mission Assigned',
        message: `You have been assigned to: ${newTask.title}`,
        link: '/employee/tasks',
        read: false,
        tenantId: tenantIdToSave,
        createdAt: new Date().toISOString()
      });
    } catch (notifErr) {
      console.warn('⚠️ NOTIFICATION_FAILURE');
    }

    // Dynamic Telegram Push Alert (If employee is linked to bot)
    try {
      const { sendNotification } = require('../bot/telegramBot');
      const targetUserMapping = await fallbackDb.findOne('telegram_users', { companyEmail: newTask.assignedTo }) ||
                                await fallbackDb.findOne('telegram_users', { companyEmail: newTask.assignedTo?.toLowerCase().trim() }) ||
                                await fallbackDb.findOne('telegram_users', { firebaseUid: newTask.assignedTo });
      
      if (targetUserMapping && targetUserMapping.telegramId) {
        const regEmp = await fallbackDb.findOne('employees', { email: targetUserMapping.companyEmail }) ||
                       await fallbackDb.findOne('employees', { companyEmail: targetUserMapping.companyEmail }) ||
                       await fallbackDb.findOne('users', { email: targetUserMapping.companyEmail });
        
        const name = regEmp?.name || targetUserMapping.companyEmail.split('@')[0];
        const directAlert = `🚀 *New Mission Assigned!* 🎯\n\n` +
                            `Hello *${name}*, you have just been assigned a new task directly from the NexovTech Portal:\n\n` +
                            `📋 *Mission:* ${newTask.title}\n` +
                            `📖 *Objective:* _${newTask.description || 'None provided'}_\n` +
                            `📅 *Target Due Date:* ${newTask.dueDate || '--'}\n\n` +
                            `Please review details on the workspace and mark your check-in!`;
        
        await sendNotification(targetUserMapping.telegramId, directAlert);
        console.log(`💬 TELEGRAM_ALERT: Dispatched portal task alert to ${name}`);
      }
    } catch (tgAlertErr) {
      console.warn('⚠️ TELEGRAM_TASK_ALERT_FAILURE:', tgAlertErr.message);
    }

    res.status(201).json(saved);
  } catch (err) {
    console.error('❌ MISSION_FAILURE:', err);
    res.status(500).json({ 
      message: 'Failed to deploy new task', 
      error: err.message
    });
  }
});

module.exports = router;
