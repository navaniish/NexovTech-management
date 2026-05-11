const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

router.get('/stats', async (req, res) => {
  try {
    const projects = await fallbackDb.find('projects', {});
    const tasks = await fallbackDb.find('tasks', {});
    const clients = await fallbackDb.find('clients', {});
    const users = await fallbackDb.find('users', {});
    const team = users.filter(u => u.role !== 'Admin'); // Specialists roster
    const leaves = await fallbackDb.find('leaves', {});
    const candidates = await fallbackDb.find('recruitment', {});
    const transactions = await fallbackDb.find('transactions', {});

    // Metrics calculation
    const projectsCount = projects.length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const pendingProjects = projects.filter(p => p.status === 'Planning' || p.status === 'In Progress').length;
    
    // STRICT REAL-TIME REVENUE: Only from 'Paid' transactions
    const paidRevenue = transactions
      .filter(t => t.type === 'Revenue' && t.status === 'Paid')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    
    const mrr = Math.round(paidRevenue / 12);

    // Recent Activity (using last 4 tasks)
    const recentOrders = tasks.slice(-4).reverse().map(t => ({
      name: t.title,
      avatar: (t.title || 'T')[0],
      color: t.priority === 'High' ? '#ef4444' : '#3b82f6',
      address: t.status || 'Pending',
      date: new Date(t.createdAt || Date.now()).toLocaleDateString(),
      status: t.status === 'Completed' ? 'Delivered' : 'Processed',
      price: `₹${(Math.random() * 5000 + 1000).toFixed(0)}`
    }));

    // Real-time Sales Data (Strictly from transactions)
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentYear = new Date().getFullYear();
    const salesData = months.map((month, index) => {
      const monthRevenue = transactions
        .filter(t => {
          const d = new Date(t.date || t.createdAt);
          return d.getMonth() === index && d.getFullYear() === currentYear && t.type === 'Revenue' && t.status === 'Paid';
        })
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      return { month, value: monthRevenue };
    });

    res.json({
      mrr: mrr,
      mrrGrowth: '+0.0%', // Growth calculation logic can be added here
      activeSubscribers: clients.length,
      totalUsers: users.length,
      totalEmployees: team.length,
      onSiteRatio: '100%',
      activeVacancies: candidates.filter(c => c.status === 'Interviewing').length || 0,
      totalApplicants: candidates.length,
      pendingLeaves: leaves.filter(l => l.status === 'Pending').length,
      totalProjects: projectsCount,
      salesData,
      recentOrders,
      overview: {
        pending: pendingProjects,
        completed: completedProjects,
        newClients: clients.filter(c => {
          const d = new Date(c.createdAt || Date.now());
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return d > thirtyDaysAgo;
        }).length
      }
    });
  } catch (err) {
    console.error('CRITICAL DASHBOARD ERROR:', err);
    res.status(500).json({ message: 'Dashboard engine failure.' });
  }
});

module.exports = router;
