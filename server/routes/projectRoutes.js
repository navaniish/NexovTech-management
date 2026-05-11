const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// GET All Projects with Task Progress and Real-time Team Sync
router.get('/', async (req, res) => {
  try {
    let projects = await fallbackDb.find('projects', {});
    const tasks = await fallbackDb.find('tasks', {});
    const users = await fallbackDb.find('users', {});
    
    const projectsWithProgress = (projects || []).map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id || t.projectId === project._id);
      const completed = projectTasks.filter(t => t.status === 'Completed').length;
      
      // Hydrate team members with latest profiles from users collection
      const hydratedTeam = (project.team || []).map(member => {
        const latestProfile = users.find(u => u.email?.toLowerCase() === member.email?.toLowerCase());
        return latestProfile ? { ...member, ...latestProfile } : member;
      });

      return {
        ...project,
        team: hydratedTeam,
        progress: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : (project.progress || 0),
        tasksCount: projectTasks.length || 0
      };
    });

    res.json(projectsWithProgress);
  } catch (err) {
    res.status(500).json({ message: 'Project engine failure' });
  }
});

// POST Create Project
router.post('/', async (req, res) => {
  console.log('🚀 MISSION_CONTROL: Attempting project launch...', req.body);
  try {
    const projectData = {
      ...req.body,
      budget: Number(req.body.budget) || 0,
      progress: 0,
      status: req.body.status || 'Planning',
      createdAt: new Date()
    };
    const saved = await fallbackDb.save('projects', projectData);
    console.log('✅ MISSION_SUCCESS: Project deployed to cloud:', saved.id || saved._id);
    res.json(saved);
  } catch (err) {
    console.error('❌ MISSION_FAILURE:', err.message);
    res.status(500).json({ message: 'Failed to launch project' });
  }
});

// PUT Update Project
router.put('/:id', async (req, res) => {
  try {
    const updated = await fallbackDb.save('projects', { ...req.body, id: req.params.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update project intelligence' });
  }
});

// DELETE Project
router.delete('/:id', async (req, res) => {
  try {
    await fallbackDb.deleteOne('projects', req.params.id);
    res.json({ message: 'Project archived successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to archive project' });
  }
});

module.exports = router;
