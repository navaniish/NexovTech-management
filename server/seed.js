const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Client = require('./models/Client');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Transaction = require('./models/Transaction');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexovtech';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Client.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Transaction.deleteMany({});

    console.log('Cleared existing data.');

    // Create Admin and Employee
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@nexovtech.com',
      password: hashedPassword,
      role: 'Admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
    });

    const employee = await User.create({
      name: 'David Smith',
      email: 'employee@nexovtech.com',
      password: hashedPassword,
      role: 'Developer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
      performance: {
        tasksCompleted: 45,
        onTimeRate: 98,
        rating: 4.9
      }
    });

    console.log('Created Users.');

    // Create Clients
    const clients = await Client.create([
      { name: 'Reliance Industries', contactInfo: { email: 'contact@reliance.com' }, businessType: 'Enterprise', serviceType: 'AI Solutions', status: 'Active' },
      { name: 'Tata Motors', contactInfo: { email: 'it@tatamotors.com' }, businessType: 'Enterprise', serviceType: 'Web Development', status: 'Active' },
      { name: 'Zomato', contactInfo: { email: 'ops@zomato.com' }, businessType: 'Startup', serviceType: 'Cybersecurity', status: 'Active' },
      { name: 'SpaceX India', contactInfo: { email: 'missions@spacex.com' }, businessType: 'Enterprise', serviceType: 'Video Editing', status: 'Converted' },
    ]);

    console.log('Created Clients.');

    // Create Projects
    const projects = await Project.create([
      { 
        title: 'Dashboard Analytics', 
        description: 'Building a real-time SaaS dashboard for NexovTech.', 
        sector: 'Web', 
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
        budget: 350000, 
        client: clients[0]._id, 
        status: 'In Progress',
        team: [employee._id]
      },
      { 
        title: 'Auth Flow Design', 
        description: 'Redesigning the authentication flow.', 
        sector: 'Web', 
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 
        budget: 120000, 
        client: clients[1]._id, 
        status: 'Pending'
      },
      { 
        title: 'Cyber Audit R1', 
        description: 'Quarterly security audit for fintech application.', 
        sector: 'Cybersecurity', 
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 
        budget: 85000, 
        client: clients[2]._id, 
        status: 'Review'
      }
    ]);

    console.log('Created Projects.');

    // Create Transactions (Revenue)
    await Transaction.create([
      { type: 'Revenue', amount: 1240000, description: 'January Subscription Revenue', date: new Date('2024-01-15') },
      { type: 'Revenue', amount: 1380000, description: 'February Subscription Revenue', date: new Date('2024-02-15') },
      { type: 'Revenue', amount: 1520000, description: 'March Subscription Revenue', date: new Date('2024-03-15') },
      { type: 'Revenue', amount: 1840000, description: 'May Subscription Revenue', date: new Date('2024-05-15') },
      { type: 'Revenue', amount: 2190000, description: 'June Subscription Revenue', date: new Date('2024-06-15') },
      { type: 'Expense', amount: 420000, description: 'Cloud Infrastructure (AWS)', date: new Date() },
    ]);

    console.log('Created Transactions.');

    console.log('Database seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
