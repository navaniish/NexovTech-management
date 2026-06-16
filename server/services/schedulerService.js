const fallbackDb = require('../utils/fallbackDb');
const { pollLinkedInComments } = require('../services/linkedinPollingService');
const { compileExecutiveBriefingData } = require('../controllers/executiveController');
const { sendEmail } = require('../utils/mailer');

let lastTriggeredDate = null;

/**
 * Compiles a detailed, high-fidelity daily attendance summary for administrators.
 */
async function generateAttendanceReport() {
  try {
    const allEmployees = await fallbackDb.find('employees', {}) || [];
    const employees = allEmployees.filter(emp => emp.role !== 'Admin' && emp.role !== 'Super Admin' && emp.role !== 'Manager');
    const records = await fallbackDb.find('attendance', {}) || [];
    
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const todayRecords = records.filter(r => {
      if (r.date !== today) return false;
      const specialist = employees.find(s => s.id === r.employeeId || s.companyEmail === r.employeeId || s.email === r.employeeId);
      return specialist !== undefined;
    });
    
    const totalEmployees = employees.length;
    const presentCount = todayRecords.filter(r => r.attendanceStatus === 'Present').length;
    const lateCount = todayRecords.filter(r => r.attendanceStatus === 'Late').length;
    const halfDayCount = todayRecords.filter(r => r.attendanceStatus === 'Half Day').length;
    const totalPresent = presentCount + lateCount + halfDayCount;
    const absentCount = Math.max(0, totalEmployees - totalPresent);

    const checkInItems = [];
    const absenteeItems = [];

    for (const emp of employees) {
      // Clean email address to prevent lookup mismatch
      const empEmailClean = emp.email?.toLowerCase().trim();
      const empCoEmailClean = emp.companyEmail?.toLowerCase().trim();

      const record = todayRecords.find(r => 
        r.employeeId === emp.id || 
        r.employeeId === emp._id || 
        (empEmailClean && r.employeeId?.toLowerCase().trim() === empEmailClean) ||
        (empCoEmailClean && r.employeeId?.toLowerCase().trim() === empCoEmailClean)
      );

      if (record) {
        const time = record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';
        const statusEmoji = record.attendanceStatus === 'Late' ? '⚠️ (Late)' : '✅';
        checkInItems.push(`• *${emp.name}* (${emp.role}) - ${time} ${statusEmoji}`);
      } else {
        absenteeItems.push(`• *${emp.name}* (${emp.role}) 💤`);
      }
    }

    const checkInsList = checkInItems.length > 0 ? checkInItems.join('\n') : '• _No check-ins recorded today._';
    const absenteesList = absenteeItems.length > 0 ? absenteeItems.join('\n') : '• _All personnel checked in._';

    const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return `📅 *NexovTech Daily Attendance Alert* 📊\n` +
           `*Time:* 10:00 AM Daily Briefing (Generated at ${localTime})\n\n` +
           `👥 *Registry Statistics:*\n` +
           `• Total Personnel: ${totalEmployees}\n` +
           `• Present: ${presentCount} ✅\n` +
           `• Late: ${lateCount} ⚠️\n` +
           `• Half Day: ${halfDayCount} ⏳\n` +
           `• Absent/On Leave: ${absentCount} 💤\n\n` +
           `📝 *Active Check-Ins:*\n` +
           `${checkInsList}\n\n` +
           `🔍 *Awaiting Check-in (Absent):*\n` +
           `${absenteesList}\n\n` +
           `🤖 *NexovAI Operational Intelligence*`;
  } catch (err) {
    console.error("Failed to generate attendance report:", err);
    return "⚠️ *NexovTech Intelligence Failure*: Unable to compile daily attendance statistics.";
  }
}

/**
 * Triggers the attendance alert broadcast:
 * 1. Sends the aggregated summary report to linked Administrators.
 * 2. Sends personalized check-in reminders to linked Employees who haven't checked in yet.
 */
async function sendDailyAttendanceAlert() {
  try {
    console.log("⏰ SCHEDULER: Initiating daily 10:00 AM attendance alert sequence...");
    
    const { sendNotification } = require('../bot/telegramBot');
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const records = await fallbackDb.find('attendance', {}) || [];
    const todayRecords = records.filter(r => r.date === today);
    
    // Find all linked Telegram accounts
    const linkedUsers = await fallbackDb.find('telegram_users', {}) || [];

    const adminReport = await generateAttendanceReport();

    // -------------------------------------------------------------
    // PART 0: DISPATCH REAL EMAIL BRIEFINGS TO FOUNDER
    // -------------------------------------------------------------
    try {
      await sendEmail(
        'daggupatinavaneeswar8980@gmail.com',
        `[Daily brief] NexovTech Daily Attendance Alert - ${today}`,
        adminReport
      );
    } catch (mailErr) {
      console.error("⏰ SCHEDULER: Failed to email daily attendance report:", mailErr.message);
    }

    try {
      const execData = await compileExecutiveBriefingData('org_default');
      
      const churnText = execData.churnRisks.length > 0
        ? execData.churnRisks.map(c => `• ${c.clientName} (Probability: ${c.probability}%)\n  Reason: ${c.reason}\n  Action: ${c.recommendedAction}`).join('\n')
        : '• _No high churn risks flagged._';

      const execBriefText = `🏢 NexovTech AI Executive Briefing Report 📈\n` +
        `--------------------------------------------\n` +
        `*AI Business Health Score:* ${execData.healthScore}/100\n` +
        `*Database Sync Status:* ${execData.dbStatus}\n\n` +
        `📊 Key Performance Indices (KPIs):\n` +
        `- Attendance Index: ${execData.metrics.attendanceRate}%\n` +
        `- Task Completion Rate: ${execData.metrics.taskCompletionRate}%\n` +
        `- Project Success Rate: ${execData.metrics.projectSuccessRate}%\n` +
        `- Lead Conversion Index: ${execData.metrics.leadConversionRate}%\n` +
        `- Active Campaigns: ${execData.metrics.activeProjectsCount} Projects\n` +
        `- Total Leads Count: ${execData.metrics.totalLeadsCount} Leads\n\n` +
        `💰 Revenue Forecasts (30/60/90 Days):\n` +
        `- 30-Day Pipeline Projection: ₹${execData.forecasts.days30.toLocaleString()} (weighted)\n` +
        `- 60-Day Pipeline Projection: ₹${execData.forecasts.days60.toLocaleString()}\n` +
        `- 90-Day Pipeline Projection: ₹${execData.forecasts.days90.toLocaleString()}\n\n` +
        `🛡️ Client Churn Risk Assessment:\n` +
        `${churnText}\n\n` +
        `🤖 Consolidated Strategic AI COO Report:\n` +
        `${execData.aiCOOReport}\n\n` +
        `--------------------------------------------\n` +
        `🤖 NEXA Agentic AI Systems Manager`;
        
      await sendEmail(
        'daggupatinavaneeswar8980@gmail.com',
        `[Executive brief] NexovTech AI Business & Financial Operations Report - ${today}`,
        execBriefText
      );
    } catch (execErr) {
      console.error("⏰ SCHEDULER: Failed to email executive report:", execErr.message);
    }
    
    // -------------------------------------------------------------
    // PART A: ADMIN INTEL BRIEFINGS
    // -------------------------------------------------------------
    const admins = linkedUsers.filter(u => 
      u.role === 'Admin' || 
      u.role === 'Super Admin' || 
      u.role === 'Manager'
    );

    let adminSuccessCount = 0;
    if (admins.length > 0) {
      for (const admin of admins) {
        if (admin.telegramId) {
          const success = await sendNotification(admin.telegramId, adminReport);
          if (success) adminSuccessCount++;
        }
      }
    }

    // -------------------------------------------------------------
    // PART B: INDIVIDUAL EMPLOYEE CHECK-IN REMINDERS
    // -------------------------------------------------------------
    const employees = linkedUsers.filter(u => 
      u.role !== 'Admin' && 
      u.role !== 'Super Admin' && 
      u.role !== 'Manager'
    );

    let employeeReminderCount = 0;
    for (const emp of employees) {
      // Find employee details in the registry
      const regEmp = await fallbackDb.findOne('employees', { email: emp.companyEmail }) ||
                     await fallbackDb.findOne('employees', { companyEmail: emp.companyEmail }) ||
                     await fallbackDb.findOne('users', { email: emp.companyEmail });
      
      const empId = regEmp?.id || regEmp?._id || emp.firebaseUid;
      const empEmailClean = emp.companyEmail?.toLowerCase().trim();

      // Check if this specific employee has clocked in today
      const hasCheckedIn = todayRecords.some(r => 
        r.employeeId === empId || 
        (empEmailClean && r.employeeId?.toLowerCase().trim() === empEmailClean)
      );

      if (!hasCheckedIn) {
        const name = regEmp?.name || emp.companyEmail.split('@')[0];
        const reminderMsg = `🔔 *NexovTech Attendance Reminder* ⏰\n\n` +
                            `Hello *${name}*!\n` +
                            `We noticed you haven't marked your check-in for today's mission yet.\n\n` +
                            `🏢 Core office hours began at *09:00 AM*.\n` +
                            `Please access the management platform immediately to log your attendance and secure your shift credit.\n\n` +
                            `🔗 [Access NexovTech Web Portal](https://nexovtech-management.netlify.app)\n\n` +
                            `🤖 *NexovAI Enterprise Security*`;
        
        if (emp.telegramId) {
          const success = await sendNotification(emp.telegramId, reminderMsg);
          if (success) employeeReminderCount++;
        }
      }
    }

    console.log(`⏰ SCHEDULER: Alert delivery sequence completed:`);
    console.log(`   - Delivered Admin briefings: ${adminSuccessCount}/${admins.length}`);
    console.log(`   - Sent Employee reminders: ${employeeReminderCount}`);
    
    return { 
      totalAdmins: admins.length, 
      adminSuccessCount, 
      employeeReminderCount 
    };
  } catch (err) {
    console.error("⏰ SCHEDULER_ERROR: Daily alert sequence interrupted:", err);
    throw err;
  }
}

/**
 * Starts the interval ticker loop (checks every 30 seconds).
 */
function startScheduler() {
  console.log("⏰ SCHEDULER: Operational. Monitoring ticks for daily 10:00 AM IST execution...");
  
  setInterval(async () => {
    const now = new Date();
    
    // Get hours and minutes in Asia/Kolkata timezone (IST)
    const kolkataTime = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
    const [hoursStr, minutesStr] = kolkataTime.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Get date in Asia/Kolkata timezone
    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Trigger exactly at 10:00 AM IST
    if (hours === 10 && minutes === 0 && lastTriggeredDate !== dateStr) {
      lastTriggeredDate = dateStr;
      await sendDailyAttendanceAlert();
    }
    
    // Simpler: always call pollLinkedInComments (it handles its own rate limiting)
    await pollLinkedInComments();
  }, 30000);
}

module.exports = {
  startScheduler,
  generateAttendanceReport,
  sendDailyAttendanceAlert
};
