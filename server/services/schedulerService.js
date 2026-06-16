const fallbackDb = require('../utils/fallbackDb');
const { pollLinkedInComments } = require('../services/linkedinPollingService');
const { compileExecutiveBriefingData } = require('../controllers/executiveController');
const { sendEmail } = require('../utils/mailer');
const { runMultiAgentOrchestration } = require('../controllers/agentNetworkController');

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
    const checkInItemsHtml = [];
    const absenteeItemsHtml = [];

    for (const emp of employees) {
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
        
        const statusColor = record.attendanceStatus === 'Late' ? '#f59e0b' : '#10b981';
        const statusBadge = `<span style="background-color: ${statusColor}15; color: ${statusColor}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; margin-left: 6px;">${record.attendanceStatus.toUpperCase()}</span>`;
        checkInItemsHtml.push(`
          <li style="padding: 8px 0; border-bottom: 1px solid #f8fafc; overflow: hidden; list-style: none;">
            <span style="float: left; font-weight: 600; color: #334155;">${emp.name} <span style="font-weight: 400; font-size: 10px; color: #64748b;">(${emp.role})</span></span>
            <span style="float: right; font-size: 11px; font-weight: 700; color: #1e293b;">${time} ${statusBadge}</span>
          </li>
        `);
      } else {
        absenteeItems.push(`• *${emp.name}* (${emp.role}) 💤`);
        
        absenteeItemsHtml.push(`
          <li style="padding: 8px 0; border-bottom: 1px solid #f8fafc; overflow: hidden; list-style: none;">
            <span style="float: left; font-weight: 600; color: #64748b;">${emp.name} <span style="font-weight: 400; font-size: 10px; color: #94a3b8;">(${emp.role})</span></span>
            <span style="float: right; font-size: 11px; font-weight: 700; color: #ef4444; background-color: #ef444410; padding: 2px 6px; border-radius: 4px;">ABSENT 💤</span>
          </li>
        `);
      }
    }

    const checkInsList = checkInItems.length > 0 ? checkInItems.join('\n') : '• _No check-ins recorded today._';
    const absenteesList = absenteeItems.length > 0 ? absenteeItems.join('\n') : '• _All personnel checked in._';
    const checkInsListHtml = checkInItemsHtml.length > 0 ? checkInItemsHtml.join('\n') : '<li style="padding: 8px 0; color: #94a3b8; font-style: italic; list-style: none;">No check-ins recorded today.</li>';
    const absenteesListHtml = absenteeItemsHtml.length > 0 ? absenteeItemsHtml.join('\n') : '<li style="padding: 8px 0; color: #94a3b8; font-style: italic; list-style: none;">All personnel checked in.</li>';

    const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const textReport = `📅 *NexovTech Daily Attendance Alert* 📊\n` +
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

    const htmlReport = `<div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; box-sizing: border-box;">
  <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: #ffffff; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <span style="font-size: 24px; margin-right: 8px; vertical-align: middle;">📅</span>
    <h1 style="font-size: 20px; font-weight: 800; margin: 0; display: inline-block; letter-spacing: -0.025em; text-transform: uppercase; vertical-align: middle;">Daily Attendance Alert</h1>
    <p style="font-size: 10px; opacity: 0.7; margin: 6px 0 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Generated at ${localTime} | Timezone: IST</p>
  </div>
  
  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
    <p style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 10px 0; letter-spacing: 0.05em;">Registry Statistics</p>
    <div style="font-size: 12px; line-height: 1.8; color: #334155;">
      • Total Personnel: <strong>${totalEmployees}</strong><br>
      • Present: <span style="color: #10b981; font-weight: 700;">${presentCount}</span> ✅<br>
      • Late: <span style="color: #f59e0b; font-weight: 700;">${lateCount}</span> ⚠️<br>
      • Half Day: <span style="color: #06b6d4; font-weight: 700;">${halfDayCount}</span> ⏳<br>
      • Absent: <span style="color: #ef4444; font-weight: 700;">${absentCount}</span> 💤
    </div>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
    <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1e293b; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; letter-spacing: 0.05em;">
      📝 Active Check-Ins
    </h3>
    <ul style="padding: 0; margin: 0; font-size: 12px; line-height: 1.6;">
      ${checkInsListHtml}
    </ul>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
    <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1e293b; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; letter-spacing: 0.05em;">
      🔍 Awaiting Check-In (Absent)
    </h3>
    <ul style="padding: 0; margin: 0; font-size: 12px; line-height: 1.6;">
      ${absenteesListHtml}
    </ul>
  </div>

  <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
    🤖 NexovAI Operational Intelligence
  </div>
</div>`;

    return { text: textReport, html: htmlReport };
  } catch (err) {
    console.error("Failed to generate attendance report:", err);
    return {
      text: "⚠️ *NexovTech Intelligence Failure*: Unable to compile daily attendance statistics.",
      html: `<div style="font-family: sans-serif; color: #ef4444; padding: 20px; border: 1px solid #fee2e2; border-radius: 8px; background-color: #fef2f2;">⚠️ <strong>NexovTech Intelligence Failure</strong>: Unable to compile daily attendance statistics.</div>`
    };
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

    const adminReportObj = await generateAttendanceReport();
    const adminReportText = typeof adminReportObj === 'object' ? adminReportObj.text : adminReportObj;
    const adminReportHtml = typeof adminReportObj === 'object' ? adminReportObj.html : null;

    // -------------------------------------------------------------
    // PART 0: DISPATCH REAL EMAIL BRIEFINGS TO FOUNDER
    // -------------------------------------------------------------
    try {
      await sendEmail(
        'daggupatinavaneeswar8980@gmail.com',
        `[Daily brief] NexovTech Daily Attendance Alert - ${today}`,
        adminReportText,
        adminReportHtml
      );
    } catch (mailErr) {
      console.error("⏰ SCHEDULER: Failed to email daily attendance report:", mailErr.message);
    }

    try {
      console.log("⏰ SCHEDULER: Invoking NEXA Multi-Agent Orchestration for strategic report...");
      const userMessage = "Compile the daily strategic executive operations report for NexovTech. Review personnel attendance, active project budgets, task deadlines, lead pipeline, security status, and support/retention logs.";
      
      const finalState = await runMultiAgentOrchestration(userMessage, null, 'org_default');
      const strategicReport = finalState.response || "No strategic report compiled.";
      const hops = finalState.hops || [];
      
      const formattedHops = hops.map((h, i) => {
        return `[Hop ${i + 1}] ${h.sender} ➔ ${h.recipient}\n` +
               `Message:\n${h.message}\n` +
               `--------------------------------------------`;
      }).join('\n\n');

      const formattedHopsHtml = hops.map((h, i) => {
        let bgTheme = '#e2e8f0';
        let textTheme = '#475569';
        let borderTheme = '#cbd5e1';
        let emoji = '👤';
        const sender = h.sender.toLowerCase();
        
        if (sender.includes('ceo')) {
          bgTheme = '#f3e8ff';
          textTheme = '#6b21a8';
          borderTheme = '#e9d5ff';
          emoji = '🤖';
        } else if (sender.includes('hr')) {
          bgTheme = '#e0e7ff';
          textTheme = '#3730a3';
          borderTheme = '#c7d2fe';
          emoji = '👥';
        } else if (sender.includes('finance')) {
          bgTheme = '#d1fae5';
          textTheme = '#065f46';
          borderTheme = '#a7f3d0';
          emoji = '₹';
        } else if (sender.includes('project')) {
          bgTheme = '#ecfeff';
          textTheme = '#155e75';
          borderTheme = '#c5f2f7';
          emoji = '📋';
        } else if (sender.includes('sales')) {
          bgTheme = '#fef3c7';
          textTheme = '#92400e';
          borderTheme = '#fde68a';
          emoji = '🎯';
        } else if (sender.includes('marketing')) {
          bgTheme = '#fae8ff';
          textTheme = '#86198f';
          borderTheme = '#f5d0fe';
          emoji = '✨';
        } else if (sender.includes('security')) {
          bgTheme = '#fee2e2';
          textTheme = '#991b1b';
          borderTheme = '#fca5a5';
          emoji = '🛡️';
        } else if (sender.includes('support')) {
          bgTheme = '#fce7f3';
          textTheme = '#9d174d';
          borderTheme = '#fbcfe8';
          emoji = '💬';
        } else if (sender.includes('dealings')) {
          bgTheme = '#ffedd5';
          textTheme = '#9a3412';
          borderTheme = '#fed7aa';
          emoji = '💼';
        }

        return `
          <div style="margin-bottom: 16px; border: 1px solid ${borderTheme}; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02); box-sizing: border-box;">
            <div style="background-color: ${bgTheme}; color: ${textTheme}; padding: 10px 14px; font-size: 11px; font-weight: 700; border-bottom: 1px solid ${borderTheme}; overflow: hidden;">
              <span style="float: left;">${emoji} ${h.sender} &nbsp;➔&nbsp; ${h.recipient}</span>
              <span style="float: right; font-weight: 400; opacity: 0.8; font-size: 9px;">Hop ${i + 1}</span>
            </div>
            <div style="padding: 12px 16px; font-size: 12px; line-height: 1.5; color: #334155; font-family: monospace; white-space: pre-wrap; word-break: break-word; background-color: #fafafa;">${h.message}</div>
          </div>
        `;
      }).join('\n');

      const execBriefText = `🏢 NexovTech AI Strategic Operations Report 📈\n` +
        `Generated via NEXA Multi-Agent Network\n` +
        `Date: ${today}\n` +
        `--------------------------------------------\n\n` +
        `🤖 CONSOLIDATED STRATEGIC CEO BRIEF:\n` +
        `============================================\n` +
        `${strategicReport}\n\n` +
        `============================================\n` +
        `👥 COLLABORATIVE AGENT DISCUSSION LOGS (HOPS):\n` +
        `============================================\n\n` +
        `${formattedHops}\n\n` +
        `--------------------------------------------\n` +
        `🤖 NEXA Autonomous Operations Coordinator`;

      const execBriefHtml = `<div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f5f3ff; padding: 25px; color: #1e293b; max-width: 650px; margin: 0 auto; border-radius: 20px; border: 1px solid #ddd6fe; box-sizing: border-box;">
  <div style="background: linear-gradient(135deg, #4c1d95, #2e1065); color: #ffffff; padding: 35px; border-radius: 14px; text-align: center; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(139,92,246,0.15);">
    <span style="font-size: 28px; margin-right: 8px; vertical-align: middle;">🏢</span>
    <h1 style="font-size: 22px; font-weight: 900; margin: 0; display: inline-block; letter-spacing: -0.025em; text-transform: uppercase; vertical-align: middle;">NEXA Strategic Briefing</h1>
    <p style="font-size: 10px; opacity: 0.8; margin: 8px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Daily Operations Report | Date: ${today}</p>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #ddd6fe; border-radius: 14px; padding: 24px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
    <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #4c1d95; margin: 0 0 16px 0; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; letter-spacing: 0.05em;">
      🤖 Consolidated Strategic CEO Brief
    </h2>
    <div style="font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${strategicReport}</div>
  </div>

  <h2 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #581c87; margin: 30px 0 16px 0; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; padding-left: 4px;">
    <span>👥</span> Collaborative Agent Discussion Logs
  </h2>
  
  <div style="max-height: 600px; overflow-y: auto; padding-right: 4px;">
    ${formattedHopsHtml}
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9d5ff; font-size: 9px; color: #701a75; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
    🤖 NEXA Autonomous Operations Coordinator
  </div>
</div>`;
        
      await sendEmail(
        'daggupatinavaneeswar8980@gmail.com',
        `[Executive brief] NexovTech AI Business & Financial Operations Report - ${today}`,
        execBriefText,
        execBriefHtml
      );
      console.log("⏰ SCHEDULER: Multi-agent strategic email report successfully dispatched.");
    } catch (execErr) {
      console.error("⏰ SCHEDULER: Failed to compile and email agentic executive report:", execErr.message);
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
          const success = await sendNotification(admin.telegramId, adminReportText);
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
        const emailAddress = regEmp?.companyEmail || regEmp?.email || emp.companyEmail;

        const reminderMsg = `🔔 *NexovTech Attendance Reminder* ⏰\n\n` +
                            `Hello *${name}*!\n` +
                            `We noticed you haven't marked your check-in for today's mission yet.\n\n` +
                            `🏢 Core office hours began at *09:00 AM*.\n` +
                            `Please access the management platform immediately to log your attendance and secure your shift credit.\n\n` +
                            `🔗 [Access NexovTech Web Portal](https://nexovtech-management.netlify.app)\n\n` +
                            `🤖 *NexovAI Enterprise Security*`;

        const reminderHtml = `<div style="font-family: system-ui, -apple-system, sans-serif; background-color: #fffbeb; padding: 20px; color: #78350f; max-width: 500px; margin: 0 auto; border-radius: 16px; border: 1px solid #fde68a; box-sizing: border-box;">
  <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 16px;">
    <span style="font-size: 32px;">🔔</span>
    <h1 style="font-size: 18px; font-weight: 800; margin: 12px 0 6px 0; color: #92400e; text-transform: uppercase; letter-spacing: -0.01em;">Attendance Reminder</h1>
    <p style="font-size: 12px; font-weight: 600; margin: 0; opacity: 0.85;">NexovTech Enterprise Operations</p>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); line-height: 1.5; font-size: 13px;">
    <p style="margin-top: 0; color: #1e293b;">Hello <strong>${name}</strong>,</p>
    <p style="color: #334155;">We noticed you haven't marked your check-in for today's mission yet.</p>
    <p style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px; border-radius: 4px; font-weight: 700; color: #c2410c; margin: 16px 0;">
      🏢 Core office hours began at 09:00 AM.
    </p>
    <p style="color: #334155;">Please access the management platform immediately to log your attendance and secure your shift credit.</p>
    
    <div style="text-align: center; margin: 24px 0 12px 0;">
      <a href="https://nexovtech-management.netlify.app" target="_blank" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; box-shadow: 0 4px 6px rgba(217,119,6,0.15);">
        Access Web Portal
      </a>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #b45309; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
    🤖 NexovAI Enterprise Security
  </div>
</div>`;
        
        // Dispatch Telegram
        if (emp.telegramId) {
          await sendNotification(emp.telegramId, reminderMsg);
        }

        // Dispatch Email
        if (emailAddress && emailAddress.includes('@')) {
          try {
            await sendEmail(emailAddress, `[Action Required] NexovTech Daily Attendance Reminder`, reminderMsg, reminderHtml);
            employeeReminderCount++;
          } catch (mailErr) {
            console.error(`⏰ SCHEDULER: Failed to email attendance reminder to ${emailAddress}:`, mailErr.message);
          }
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
