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
    const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const uploadsDir = IS_SERVERLESS ? '/tmp' : path.join(__dirname, '..', 'uploads');
    const invoiceDir = IS_SERVERLESS ? '/tmp' : path.join(uploadsDir, 'invoices');
    if (!fs.existsSync(invoiceDir)) {
      try {
        fs.mkdirSync(invoiceDir, { recursive: true });
      } catch (err) {
        // Safe catch
      }
    }
    
    const fileName = `invoice-${projectId}.pdf`;
    const invoicePath = path.join(invoiceDir, fileName);
    const invoiceRelativeUrl = `/uploads/invoices/${fileName}`;
    
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);
    
    const formatINR = (val) => {
      return `Rs. ${Number(val).toLocaleString('en-IN')}`;
    };
    
    const getPhaseSubtitle = (index) => {
      const subs = [
        'Technical specification docs, database schema designs, and sprint mapping.',
        'Database initialization, cloud environment staging, and repo setup.',
        'Core backend development, API integration, and front-end interface builds.',
        'User acceptance testing, client feedback loops, and deployment optimization.'
      ];
      return subs[index] || '';
    };

    // 1. Header (Slate Banner)
    doc.roundedRect(30, 30, 535, 110, 8).fill('#0f172a');
    
    // Try to load client asset logo if exists
    let logoPath = path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'logo.jpeg');
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'logo-silver.png');
    }
    let nameStartX = 50;
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 48, { width: 50 });
        nameStartX = 115;
      } catch (e) {
        console.warn('⚠️ Could not load silver logo image into PDF:', e.message);
      }
    }

    // Company details on the left
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('NEXOVTECH', nameStartX, 50);
    
    // Colored slogan text
    doc.fontSize(8.5).font('Helvetica-Bold');
    doc.text('INNOVATE. ', nameStartX, 82, { continued: true })
       .fillColor('#06b6d4').text('CONNECT. ', { continued: true })
       .fillColor('#ec4899').text('ELEVATE.');
    
    doc.fillColor('#94a3b8').fontSize(8.5).font('Helvetica').text('AI Solutions. Software Development. Digital Transformation.', nameStartX, 98);

    // Vertical separator
    doc.moveTo(350, 45).lineTo(350, 125).strokeColor('#334155').lineWidth(1).stroke();

    // Invoice metadata on the right
    doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('INVOICE', 370, 42);
    
    // Invoice Reference ID Pill
    const safeProjId = (projectId || 'UNKNOWN').toUpperCase();
    const invRef = 'INV-' + safeProjId.substring(0, 8);
    doc.roundedRect(370, 75, 110, 16, 8).fillColor('#1e293b').fill();
    doc.roundedRect(370, 75, 110, 16, 8).strokeColor('#475569').lineWidth(1).stroke();
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text('#' + invRef, 370, 79, { width: 110, align: 'center' });

    // Dates
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('Invoice Date:', 370, 100);
    doc.fillColor('#ffffff').font('Helvetica-Bold').text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 440, 100);
    
    doc.fillColor('#94a3b8').font('Helvetica').text('Due Date:', 370, 113);
    const dueDateStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fillColor('#ffffff').font('Helvetica-Bold').text(dueDateStr, 440, 113);

    // 2. Bill To / From Section
    const billY = 160;
    
    // BILL TO column
    doc.fillColor('#7c3aed').fontSize(9).font('Helvetica-Bold').text('BILL TO', 40, billY);
    doc.moveTo(40, 172).lineTo(230, 172).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(clientName, 40, 180, { width: 190 });
    doc.fillColor('#475569').fontSize(9).font('Helvetica');
    doc.text('Client Entity / Partner', 40, 198, { width: 190 });
    doc.text(clientEmail || 'billing@clientcompany.com', 40, 212, { width: 190 });
    
    // FROM column
    doc.fillColor('#06b6d4').fontSize(9).font('Helvetica-Bold').text('FROM', 260, billY);
    doc.moveTo(260, 172).lineTo(430, 172).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('NexovTech Private Limited', 260, 180, { width: 170 });
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
    doc.text('5th Floor, Nexovgen Tower, Innovation Park, Whitefield, Bengaluru, Karnataka 560066', 260, 196, { width: 170, lineGap: 1 });
    doc.text('hello@nexovtech.com | +91 98765 43210', 260, 222, { width: 170 });

    // Thank You Dotted Box
    doc.roundedRect(455, 160, 100, 75, 6).strokeColor('#cbd5e1').lineWidth(1).dash(4, { space: 2 }).stroke();
    doc.undash();
    doc.fillColor('#4f46e5').fontSize(11).font('Helvetica-Bold').text('Thank you!', 455, 175, { width: 100, align: 'center' });
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('for choosing\nNexovTech!', 455, 195, { width: 100, align: 'center' });

    // 3. Items Table Section
    const tableY = 255;
    doc.roundedRect(30, tableY, 535, 25, 4).fill('#0f172a');
    
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
    doc.text('#', 40, tableY + 8);
    doc.text('DESCRIPTION', 70, tableY + 8);
    doc.text('QTY', 340, tableY + 8, { width: 30, align: 'center' });
    doc.text('UNIT PRICE', 380, tableY + 8, { width: 80, align: 'right' });
    doc.text('AMOUNT', 475, tableY + 8, { width: 80, align: 'right' });

    const phases = [
      { name: 'Phase 1: Specs & Requirement Analysis', pct: 0.25 },
      { name: 'Phase 2: Architectural Setup & DB Design', pct: 0.25 },
      { name: 'Phase 3: Core Implementation & API Dev', pct: 0.25 },
      { name: 'Phase 4: Client Staging & Review', pct: 0.25 }
    ];

    let currentY = 290;
    phases.forEach((phase, index) => {
      const rowAmt = budget * phase.pct;

      if (index % 2 === 1) {
        doc.roundedRect(30, currentY - 5, 535, 32, 4).fill('#f8fafc');
      }

      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(`0${index + 1}`, 40, currentY);
      
      // Description text
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(phase.name, 70, currentY);
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(getPhaseSubtitle(index), 70, currentY + 11);

      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica').text('1', 340, currentY + 4, { width: 30, align: 'center' });
      doc.text(formatINR(rowAmt), 380, currentY + 4, { width: 80, align: 'right' });
      doc.font('Helvetica-Bold').text(formatINR(rowAmt), 475, currentY + 4, { width: 80, align: 'right' });
      
      currentY += 32;
    });

    // 4. Notes & Summary Section
    const summaryY = 440;

    // Notes (Left)
    doc.fillColor('#4f46e5').fontSize(9).font('Helvetica-Bold').text('NOTES', 40, summaryY);
    doc.moveTo(40, 452).lineTo(150, 452).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Thank you for choosing NexovTech. We appreciate your business and look forward to working with you again!', 40, 460, { width: 280, lineGap: 3 });
    
    // Signature
    doc.fillColor('#4f46e5').fontSize(16).font('Courier-BoldOblique').text('NexovTech', 40, 500);
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('Authorized Signature', 40, 518);
    doc.text('NexovTech Private Limited', 40, 527);

    // Totals Box (Right)
    doc.roundedRect(355, summaryY, 200, 95, 6).strokeColor('#cbd5e1').lineWidth(1).stroke();
    
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold').text('SUBTOTAL', 370, summaryY + 12);
    doc.fillColor('#0f172a').font('Helvetica').text(formatINR(budget), 450, summaryY + 12, { width: 90, align: 'right' });
    
    doc.fillColor('#475569').font('Helvetica-Bold').text('TAX (18% GST)', 370, summaryY + 32);
    doc.fillColor('#0f172a').font('Helvetica').text(formatINR(budget * 0.18), 450, summaryY + 32, { width: 90, align: 'right' });
    
    doc.moveTo(370, summaryY + 52).lineTo(540, summaryY + 52).strokeColor('#cbd5e1').lineWidth(1).dash(2, { space: 2 }).stroke();
    doc.undash();
    
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('TOTAL DUE', 370, summaryY + 66);
    doc.fillColor('#4f46e5').fontSize(13).font('Helvetica-Bold').text(formatINR(budget * 1.18), 450, summaryY + 64, { width: 90, align: 'right' });

    // 5. Payment Information & Quote Card
    const infoY = 560;

    // Payment Info (Left)
    doc.fillColor('#4f46e5').fontSize(9).font('Helvetica-Bold').text('PAYMENT INFORMATION', 40, infoY);
    doc.moveTo(40, 572).lineTo(230, 572).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('Bank Transfer:', 40, 580);
    doc.fillColor('#475569').font('Helvetica').text('Beneficiary: NexovTech Private Limited\nBank: HDFC Bank | A/C: 50200012345678\nIFSC: HDFC0001234', 40, 592, { lineGap: 2 });
    
    doc.fillColor('#0f172a').font('Helvetica-Bold').text('UPI / PayPal:', 40, 634);
    doc.fillColor('#475569').font('Helvetica').text('UPI ID: nexovtech@upi | PayPal: payments@nexovtech.com', 40, 646, { lineGap: 2 });

    // Quote Box (Right)
    doc.roundedRect(260, infoY, 295, 95, 6).fill('#f8fafc');
    doc.rect(260, infoY, 4, 95).fill('#4f46e5');
    doc.fillColor('#334155').fontSize(9).font('Helvetica-Oblique').text('"Empowering ideas with technology.\nBuilding the future together."', 275, infoY + 25, { width: 265, align: 'center', lineGap: 4 });
    doc.moveTo(380, infoY + 75).lineTo(440, infoY + 75).strokeColor('#ec4899').lineWidth(1.5).stroke();

    // 6. Solid Footer Bar
    doc.rect(0, 802, 595, 40).fill('#0f172a');
    doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica');
    doc.text('5th Floor, Nexovgen Tower, Innovation Park, Whitefield, Bengaluru, Karnataka 560066', 30, 816, { continued: true, width: 535, align: 'center' });
    doc.text('   |   hello@nexovtech.com   |   www.nexovtech.com');

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

exports.createStripeOrPDFInvoice = createStripeOrPDFInvoice;

// 4. GET NEXA AUTOPILOT STATUS
exports.getAutopilotStatus = async (req, res) => {
  try {
    const settings = await fallbackDb.findOne('system_settings', { id: 'autopilot_settings' });
    const enabled = settings ? settings.nexa_autopilot === true : false;
    res.json({ success: true, enabled });
  } catch (error) {
    console.error('❌ Failed to get autopilot status:', error);
    res.status(500).json({ success: false, message: 'Failed to get autopilot status', error: error.message });
  }
};

// 5. TOGGLE NEXA AUTOPILOT STATUS
exports.toggleAutopilot = async (req, res) => {
  try {
    const { enabled } = req.body;
    let settings = await fallbackDb.findOne('system_settings', { id: 'autopilot_settings' });
    if (!settings) {
      settings = { id: 'autopilot_settings' };
    }
    
    settings.nexa_autopilot = !!enabled;
    await fallbackDb.save('system_settings', settings);

    console.log(`🤖 [NEXA AUTOPILOT]: Autopilot mode set to ${settings.nexa_autopilot ? 'ENABLED' : 'DISABLED'}`);

    // If enabled, run one cycle immediately and await it in serverless environment to prevent early termination
    if (settings.nexa_autopilot) {
      const { runAutopilotCycle } = require('../services/nexaAutopilotService');
      try {
        await runAutopilotCycle();
      } catch (cycleErr) {
        console.error('🤖 [NEXA AUTOPILOT]: Immediate background cycle failed:', cycleErr.message);
      }
    }

    res.json({ success: true, enabled: settings.nexa_autopilot });
  } catch (error) {
    console.error('❌ Failed to toggle autopilot:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle autopilot', error: error.message });
  }
};

// End of file
