const prisma = require('../config/database');
const fallbackDb = require('../utils/fallbackDb');
const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Initialize AI Client
let aiClient;
try {
  aiClient = new OpenAI({
    baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
    apiKey: process.env.AI_API_KEY || 'placeholder',
    timeout: 30000 // 30 seconds timeout to prevent long hangs on slow endpoints
  });
} catch (e) {
  console.warn('⚠️ NEXA AI Automation module offline: Missing OpenAI client setup.');
}

async function runQuery(systemPrompt, userPrompt, options = {}) {
  if (!aiClient || !process.env.AI_API_KEY || process.env.AI_API_KEY === 'placeholder') {
    throw new Error('AI Provider Offline');
  }
  
  const body = {
    model: process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384
  };

  if (options.enableThinking) {
    body.extra_body = {
      chat_template_kwargs: { enable_thinking: true },
      reasoning_budget: 16384
    };
  }

  const completion = await aiClient.chat.completions.create(body);
  
  const choice = completion.choices[0];
  const reasoningContent = choice.message?.reasoning_content || '';
  const content = choice.message?.content || '';

  if (reasoningContent) {
    console.log(`🧠 [NEXA AUTOMATION THINKING PROCESS]:\n${reasoningContent}\n----------------------------------`);
  }

  return content;
}

// Helper: Match best employees by tech stack and workload
async function matchEmployees(techStack, requiredCount = 2) {
  try {
    const users = (await fallbackDb.find('users', {})) || [];
    const tasks = (await fallbackDb.find('tasks', {})) || [];

    // Filter out admins/non-dev roles if possible, but keep specialists
    const specialists = users.filter(u => {
      const email = (u.email || '').toLowerCase();
      return email !== 'nexovtech@myyahoo.com' && email !== 'nexovtech@nexovtech.com';
    });

    if (specialists.length === 0) return [];

    // Calculate active task burden for each specialist
    const scoredSpecialists = specialists.map(u => {
      const userId = u.id || u._id;
      const userEmail = (u.email || '').toLowerCase().trim();
      
      const activeTasksCount = tasks.filter(t => 
        (t.assignedTo === userId || (userEmail && t.assignedTo === userEmail)) && 
        t.status !== 'Completed'
      ).length;

      // Scoring matching tech stack
      let skillMatchScore = 0;
      const department = (u.department || '').toLowerCase();
      const role = (u.role || '').toLowerCase();

      techStack.forEach(tech => {
        const t = tech.toLowerCase();
        if (department.includes(t) || role.includes(t)) {
          skillMatchScore += 10;
        }
      });

      // Prefer low workload (burden) and high skill match
      // Score = (skillMatchScore * 2) - (activeTasksCount * 3)
      const suitabilityScore = (skillMatchScore * 2) - (activeTasksCount * 3);

      return {
        id: userId,
        name: u.name,
        email: u.email,
        role: u.role,
        activeTasksCount,
        suitabilityScore
      };
    });

    // Sort descending by suitability score
    scoredSpecialists.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    return scoredSpecialists.slice(0, requiredCount).map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role
    }));
  } catch (err) {
    console.error('⚠️ Employee matching failed, using defaults.', err.message);
    return [];
  }
}

// Helper: Action Hook - Create GitHub Repository
async function createGitHubRepository(projectName, description, tasksList) {
  const token = process.env.GITHUB_TOKEN;
  const isReal = token && token !== 'placeholder' && token.trim() !== '';
  
  const repoName = projectName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)/g, '');
  
  if (isReal) {
    console.log(`🐙 [NEXA PROJECT AGENT]: Creating real GitHub repository '${repoName}'...`);
    try {
      const repoRes = await axios.post(
        'https://api.github.com/user/repos',
        {
          name: repoName,
          description: description || 'NexovTech project repo',
          private: true
        },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'NexovTech-Management'
          }
        }
      );
      
      const githubRepoUrl = repoRes.data.html_url;
      const owner = repoRes.data.owner.login;
      const repo = repoRes.data.name;
      
      console.log(`🐙 [NEXA PROJECT AGENT]: Created repo successfully: ${githubRepoUrl}`);
      
      const issues = [];
      for (let i = 0; i < tasksList.length; i++) {
        const taskTitle = tasksList[i];
        console.log(`🐙 [NEXA PROJECT AGENT]: Creating GitHub issue for task: "${taskTitle}"...`);
        
        try {
          const issueRes = await axios.post(
            `https://api.github.com/repos/${owner}/${repo}/issues`,
            {
              title: taskTitle,
              body: `Allocated automatically by NEXA Agentic AI.\nPhase: ${i + 1}\nStatus: Pending`
            },
            {
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'NexovTech-Management'
              }
            }
          );
          
          issues.push({
            title: taskTitle,
            githubIssueUrl: issueRes.data.html_url,
            githubIssueNumber: issueRes.data.number
          });
        } catch (issueErr) {
          console.error(`⚠️ Failed to create real GitHub issue for "${taskTitle}":`, issueErr.message);
          issues.push({
            title: taskTitle,
            githubIssueUrl: `https://github.com/${owner}/${repo}/issues`,
            githubIssueNumber: i + 1
          });
        }
      }
      
      return { githubRepoUrl, issues };
    } catch (err) {
      console.error(`⚠️ Real GitHub repository creation failed. Falling back to simulation. Error:`, err.message);
    }
  }
  
  // Detailed Simulation Fallback
  console.log(`🐙 [NEXA PROJECT AGENT - SIMULATION]: Simulating GitHub repository creation for '${repoName}'...`);
  const simulatedRepoUrl = `https://github.com/nexovtech-simulation/${repoName}`;
  const simulatedIssues = tasksList.map((title, i) => {
    const issueNum = i + 1;
    return {
      title,
      githubIssueUrl: `${simulatedRepoUrl}/issues/${issueNum}`,
      githubIssueNumber: issueNum
    };
  });
  
  console.log(`🐙 [NEXA PROJECT AGENT - SIMULATION]: Simulated Repository Link: ${simulatedRepoUrl}`);
  return { githubRepoUrl: simulatedRepoUrl, issues: simulatedIssues };
}

// Helper: Action Hook - Create Stripe payment link or generate PDF invoice
async function createStripeOrPDFInvoice(clientName, budget, projectId, clientEmail) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const isReal = stripeKey && stripeKey !== 'placeholder' && stripeKey.trim() !== '' && stripeKey.startsWith('sk_');
  
  if (isReal) {
    console.log(`💳 [NEXA FINANCE AGENT]: Generating Stripe billing payment link for ${clientName}...`);
    try {
      const customerRes = await axios.post(
        'https://api.stripe.com/v1/customers',
        new URLSearchParams({
          name: clientName,
          email: clientEmail || 'billing@nexovtech.com'
        }).toString(),
        {
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const customerId = customerRes.data.id;
      
      const sessionRes = await axios.post(
        'https://api.stripe.com/v1/checkout/sessions',
        new URLSearchParams({
          'line_items[0][price_data][currency]': 'inr',
          'line_items[0][price_data][product_data][name]': `Project Setup - Project #${projectId}`,
          'line_items[0][price_data][unit_amount]': Math.round(budget * 100),
          'line_items[0][quantity]': 1,
          'mode': 'payment',
          'success_url': 'http://localhost:5173/#/projects',
          'cancel_url': 'http://localhost:5173/#/projects',
          'customer': customerId
        }).toString(),
        {
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const invoiceUrl = sessionRes.data.url;
      console.log(`💳 [NEXA FINANCE AGENT]: Stripe Payment Link created: ${invoiceUrl}`);
      
      const transactionData = {
        id: `inv_${Date.now()}`,
        type: 'Revenue',
        amount: budget,
        description: `${clientName} - Stripe Invoice for Project #${projectId}`,
        date: new Date().toISOString(),
        status: 'Pending',
        invoiceUrl: invoiceUrl,
        createdAt: new Date().toISOString()
      };
      await fallbackDb.save('transactions', transactionData);
      
      return invoiceUrl;
    } catch (err) {
      console.error(`⚠️ Real Stripe invoice creation failed. Falling back to local PDF generation. Error:`, err.message);
    }
  }
  
  // Custom PDF Invoice using PDFKit
  console.log(`📄 [NEXA FINANCE AGENT]: Generating premium corporate PDF invoice for ${clientName}...`);
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const invoiceDir = path.join(uploadsDir, 'invoices');
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }
    
    const fileName = `invoice-${projectId}.pdf`;
    const invoicePath = path.join(invoiceDir, fileName);
    const invoiceRelativeUrl = `/uploads/invoices/${fileName}`;
    
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);
    
    const formatINR = (val) => {
      return `Rs. ${Number(val).toLocaleString('en-IN')}`;
    };
    
    doc.rect(0, 0, 612, 100).fill('#1e1b4b');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('NEXOVTECH SOLUTIONS', 50, 30);
    doc.fontSize(10).font('Helvetica').text('Autonomously Generated by NEXA AI', 50, 60);
    doc.fontSize(11).text('Date: ' + new Date().toLocaleDateString('en-IN'), 450, 32, { align: 'right' });
    doc.text('Invoice Ref: INV-' + projectId.substring(0, 8).toUpperCase(), 450, 48, { align: 'right' });
    doc.text('Project: #' + projectId, 450, 64, { align: 'right' });
    
    doc.moveDown(4);
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text('BILL TO:', 50, 130);
    doc.font('Helvetica').fontSize(14).text(clientName, 50, 150);
    doc.fontSize(10).text(clientEmail || 'billing@clientcompany.com', 50, 170);
    
    doc.fontSize(12).font('Helvetica-Bold').text('ISSUED BY:', 350, 130);
    doc.font('Helvetica').fontSize(12).text('NexovTech Management India', 350, 150);
    doc.fontSize(10).text('123 Tech Park, Phase II, Bangalore, KA, India', 350, 170);
    doc.text('finance@nexovtech.com', 350, 185);
    
    doc.moveTo(50, 215).lineTo(562, 215).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    doc.rect(50, 240, 512, 25).fill('#7c3aed');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('ITEM DESCRIPTION', 60, 248);
    doc.text('ALLOCATION', 350, 248, { align: 'right' });
    doc.text('AMOUNT (INR)', 500, 248, { align: 'right' });
    
    const phases = [
      { name: 'Phase 1: Specs & Requirement Analysis', pct: 0.25 },
      { name: 'Phase 2: Architectural Setup & DB Design', pct: 0.25 },
      { name: 'Phase 3: Core Implementation & API Dev', pct: 0.25 },
      { name: 'Phase 4: Client Staging & Review', pct: 0.25 }
    ];
    
    let currentY = 275;
    doc.fillColor('#000000').font('Helvetica');
    
    phases.forEach((phase, index) => {
      const rowAmt = budget * phase.pct;
      
      if (index % 2 === 1) {
        doc.rect(50, currentY - 5, 512, 25).fill('#f8fafc');
        doc.fillColor('#000000');
      }
      
      doc.text(phase.name, 60, currentY);
      doc.text(`${phase.pct * 100}%`, 350, currentY, { align: 'right' });
      doc.text(formatINR(rowAmt), 500, currentY, { align: 'right' });
      currentY += 25;
    });
    
    currentY += 15;
    doc.moveTo(50, currentY).lineTo(562, currentY).strokeColor('#7c3aed').lineWidth(2).stroke();
    
    currentY += 15;
    doc.fontSize(11).font('Helvetica-Bold').text('Subtotal:', 380, currentY);
    doc.font('Helvetica').text(formatINR(budget), 500, currentY, { align: 'right' });
    
    currentY += 20;
    doc.font('Helvetica-Bold').text('GST (18%):', 380, currentY);
    doc.font('Helvetica').text(formatINR(budget * 0.18), 500, currentY, { align: 'right' });
    
    currentY += 20;
    const finalTotal = budget * 1.18;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#7c3aed').text('Total Due:', 380, currentY);
    doc.text(formatINR(finalTotal), 500, currentY, { align: 'right' });
    
    currentY += 60;
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique').text('Note: This invoice is autonomously compiled, verified, and issued via NEXA AI. No physical signature is required.', 50, currentY);
    
    currentY += 25;
    doc.font('Helvetica').text('Thank you for choosing NexovTech Management.', 50, currentY);
    
    doc.end();
    
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    console.log(`📄 [NEXA FINANCE AGENT]: Local invoice PDF generated at: ${invoicePath}`);
    
    const transactionData = {
      id: `inv_${Date.now()}`,
      type: 'Revenue',
      amount: budget,
      description: `${clientName} - PDF Invoice for Project #${projectId}`,
      date: new Date().toISOString(),
      status: 'Pending',
      invoiceUrl: invoiceRelativeUrl,
      createdAt: new Date().toISOString()
    };
    await fallbackDb.save('transactions', transactionData);
    
    return invoiceRelativeUrl;
  } catch (pdfErr) {
    console.error('❌ Failed to generate local PDF invoice:', pdfErr.message);
    throw pdfErr;
  }
}

// 1. AUTONOMOUS PROJECT LAUNCHER (ADMIN MODE)
exports.autoLaunchProject = async (req, res) => {
  try {
    const { leadId, proposalId } = req.body;

    let lead;
    let proposal;
    let useFallbackDb = false;

    try {
      if (proposalId) {
        proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, include: { lead: true } });
        lead = proposal?.lead;
      } else if (leadId) {
        lead = await prisma.lead.findUnique({ where: { id: leadId } });
        proposal = await prisma.proposal.findFirst({ where: { leadId } });
      }
      if (!lead) useFallbackDb = true;
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in autoLaunchProject, using fallbackDb:', dbErr.message);
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      lead = await fallbackDb.findById('leads', leadId);
      const proposalsList = await fallbackDb.find('proposals', { leadId });
      proposal = proposalsList[0];
    }

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found for project creation' });
    }

    // Check if project already launched
    const leadProjectId = lead.projectId || lead.project_id;
    if (leadProjectId) {
      return res.status(400).json({ message: 'Project already bound to this lead', projectId: leadProjectId });
    }

    const serviceType = proposal ? proposal.serviceType : 'AISolutions';
    const budgetVal = proposal ? Number(proposal.quotationAmount) : 5000;
    const techStack = Array.isArray(lead.techStack) ? lead.techStack : [];

    // Match team members
    const matchedTeam = await matchEmployees(techStack, 2);

    let projectBrief = `Provide automated services matching ${serviceType} specs.`;
    
    try {
      const systemPrompt = `You are the NEXA Agentic AI Project Architect. Generate a concise, 3-sentence technical project brief based on company requirements. Do not output anything else.`;
      const userPrompt = `
        Client Name: ${lead.companyName}
        Service Type: ${serviceType}
        Tech Stack: ${techStack.join(', ')}
        Budget: $${budgetVal}
      `;
      projectBrief = await runQuery(systemPrompt, userPrompt);
    } catch (e) {
      // Fallback description
    }

    const tasks = [
      { name: 'Phase 1: Specs & Requirement Analysis', duration: 'Week 1-2' },
      { name: 'Phase 2: Architectural Setup & DB Design', duration: 'Week 3-4' },
      { name: 'Phase 3: Core Implementation & API Dev', duration: 'Week 5-6' },
      { name: 'Phase 4: Client Staging & Review', duration: 'Week 7' }
    ];

    // Trigger GitHub Repository setup (Action Hook) before storing
    const repoSetup = await createGitHubRepository(
      `${lead.companyName} - ${serviceType.replace(/([A-Z])/g, ' $1').trim()}`,
      projectBrief,
      tasks.map(t => t.name)
    );

    // Save project in Firestore (via fallbackDb)
    const projectData = {
      projectName: `${lead.companyName} - ${serviceType.replace(/([A-Z])/g, ' $1').trim()}`,
      client: lead.companyName,
      budget: budgetVal,
      status: 'In Progress',
      progress: 0,
      description: projectBrief,
      team: matchedTeam,
      githubRepoUrl: repoSetup.githubRepoUrl || '',
      createdAt: new Date().toISOString()
    };

    const savedProject = await fallbackDb.save('projects', projectData);
    const projectId = savedProject.id || savedProject._id;

    if (!useFallbackDb) {
      try {
        // Bind project ID back to PostgreSQL Lead entity
        await prisma.lead.update({
          where: { id: lead.id },
          data: { projectId }
        });
      } catch (dbErr) {
        console.warn('⚠️ PostgreSQL write failed in autoLaunchProject:', dbErr.message);
      }
    }

    // Deploy initial tasks with bound GitHub issue fields
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      // Assign rotationally to matched team members
      const assignee = matchedTeam[i % matchedTeam.length] || { email: 'info@nexovtech.com', id: 'default' };
      const issueDetails = repoSetup.issues.find(iss => iss.title === task.name) || {};

      await fallbackDb.save('tasks', {
        projectId,
        projectName: projectData.projectName,
        title: task.name,
        assignedTo: assignee.email,
        assignedToName: assignee.name,
        status: i === 0 ? 'In Progress' : 'Pending',
        priority: 'High',
        dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        githubIssueUrl: issueDetails.githubIssueUrl || '',
        githubIssueNumber: issueDetails.githubIssueNumber || null
      });
    }

    // Trigger Stripe/PDF invoice generation immediately after project creation
    let invoiceUrl = '';
    try {
      invoiceUrl = await createStripeOrPDFInvoice(
        lead.companyName,
        budgetVal,
        projectId,
        lead.email || lead.contactEmail || 'billing@clientcompany.com'
      );
      // Bind invoiceUrl back to project
      await fallbackDb.update('projects', projectId, { invoiceUrl });
      savedProject.invoiceUrl = invoiceUrl;
    } catch (invErr) {
      console.error('⚠️ Failed to generate project invoice:', invErr.message);
    }

    // Update Lead Status to Converted
    if (!useFallbackDb) {
      try {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'Converted', projectId }
        });
      } catch (dbErr) {
        console.warn('⚠️ PostgreSQL write failed in autoLaunchProject status update:', dbErr.message);
      }
    } else {
      await fallbackDb.update('leads', lead.id || lead._id, { status: 'Converted', projectId });
    }

    // Automatically trigger a LinkedIn milestone announcement post for the new project!
    try {
      await exports.postMilestonePost(projectId, 'Project Launch');
    } catch (liErr) {
      console.warn('⚠️ Autonomous LinkedIn announcement post failed:', liErr.message);
    }

    res.status(201).json({
      message: 'Project autonomously launched, team assigned, and milestone tasks deployed.',
      projectId,
      project: { ...savedProject, invoiceUrl },
      team: matchedTeam
    });
  } catch (err) {
    console.error('❌ Autonomous project launch failure:', err);
    res.status(500).json({ message: 'Failed to autonomously launch project', error: err.message });
  }
};

// 2. AUTONOMOUS LINKEDIN MILESTONE SHARER
exports.postMilestonePost = async (projectId, milestoneName) => {
  let config;
  try {
    config = await prisma.linkedInConfig.findFirst();
  } catch (dbErr) {
    console.warn('⚠️ PostgreSQL offline, skipping milestone check.');
    return;
  }
  
  if (!config || !config.isActive) {
    console.log('ℹ️ LinkedIn integration offline, skipping milestone post.');
    return;
  }

  // Fetch project details
  const projects = await fallbackDb.find('projects', {});
  const project = projects.find(p => p.id === projectId || p._id === projectId);
  if (!project) return;

  const teamList = (project.team || []).map(t => t.name).join(', ');

  let postCommentary = `🚀 We are thrilled to announce the kick-off of our latest project: ${project.projectName}! 
Our specialized team is busy implementing custom solutions to scale efficiency. Kudos to ${teamList} for driving this project!`;

  try {
    const systemPrompt = `You are the NEXA Agentic AI Administrator. Draft a short, engaging LinkedIn post (max 4 sentences) announcing the project milestone: ${milestoneName} on behalf of NexovTech Administration. Highlight the client, the project name, and express appreciation for the team specialists: ${teamList}. Clearly note in the post that it was generated and posted autonomously by NEXA Agentic AI. Conclude with hashtags #NEXAAgenticAI #PostedAutonomously #AdminAI. Avoid placeholders.`;
    const userPrompt = `
      Project: ${project.projectName}
      Client: ${project.client}
      Team: ${teamList}
      Milestone: ${milestoneName}
    `;

    postCommentary = await runQuery(systemPrompt, userPrompt);
  } catch (e) {
    // Keep fallback text
  }

  // Publish to LinkedIn
  await axios.post(
    'https://api.linkedin.com/rest/posts',
    {
      author: config.organizationUrn,
      commentary: postCommentary,
      visibility: 'PUBLIC',
      lifecycleState: 'PUBLISHED',
      distribution: {
        feedDistribution: 'MAIN_FEED'
      }
    },
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'LinkedIn-Version': '202605',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      }
    }
  );

  console.log(`📢 Autonomous LinkedIn update posted successfully for project: ${project.projectName}`);
};

// 3. RETRIEVE ACTIVE AUTOMATIONS METRICS
exports.getAutomationData = async (req, res) => {
  try {
    let activeBinds = [];
    let boundCount = 0;

    try {
      const leads = await prisma.lead.findMany({
        where: { projectId: { not: null } }
      });
      boundCount = leads.length;

      const projectsList = await fallbackDb.find('projects', {});

      activeBinds = leads.map(lead => {
        const proj = projectsList.find(p => p.id === lead.projectId || p._id === lead.projectId);
        const rawCompany = lead.companyName;
        return {
          leadId: lead.id,
          companyName: typeof rawCompany === 'object' && rawCompany ? (rawCompany.name || 'Client') : (rawCompany || 'Client'),
          projectId: lead.projectId,
          projectName: proj ? proj.projectName : 'Unknown Project',
          progress: proj ? proj.progress : 0,
          team: proj ? proj.team : []
        };
      });
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in getAutomationData, querying Firestore projects:', dbErr.message);
      // Fallback: list all Firestore projects and show them as active binds
      const projectsList = (await fallbackDb.find('projects', {})) || [];
      activeBinds = projectsList.map(proj => {
        const rawClient = proj.client;
        return {
          leadId: proj.id || proj._id,
          companyName: typeof rawClient === 'object' && rawClient ? (rawClient.name || 'Client') : (rawClient || 'Client'),
          projectId: proj.id || proj._id,
          projectName: proj.projectName,
          progress: proj.progress || 0,
          team: proj.team || []
        };
      });
      boundCount = activeBinds.length;
    }

    res.json({
      totalBoundProjects: boundCount,
      bindings: activeBinds
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch automation data', error: err.message });
  }
};

// End of file
