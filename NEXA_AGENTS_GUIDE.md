# NEXA Multi-Agent Network - Developer & Operations Guide

Welcome to the **NEXA Multi-Agent Network Guide**. This document details the internal architecture, event-driven loops, agent roster, and operational instructions for interacting with NEXA's autonomous agentic intelligence.

---

## 1. System Architecture & How Agents Work

The NEXA Multi-Agent Network operates as a decentralized corporate event loop. Instead of traditional linear workflows, tasks are coordinated autonomously by an orchestration event bus.

### The Agentic Event Loop Flow
1. **User Request Input**: The user sends a query to the **CEO Agent** via the UI Console or the WhatsApp Bot.
2. **Selector/Routing Phase**: The CEO Agent analyzes the query and decides which specialized sub-agents are needed to resolve it, returning a JSON array of keys.
3. **Event Bus Dispatch**: The event loop emits queries (e.g. `finance.query`, `hr.query`) to the selected sub-agents.
4. **Data Acquisition**: Sub-agents connect to the local fallback database (`fallbackDb`) or Prisma PostgreSQL client to fetch real-time metrics.
5. **LLM Evaluation**: Sub-agents query the Nvidia Llama-3 LLM with their unique system prompt and data context.
6. **Synthesis Phase**: Sub-agents reply on the event bus (`finance.response`, etc.). The CEO Agent intercepts these reports, compiles them into a command-level strategic executive summary, and returns it to the user.

```mermaid
graph TD
    UserQuery["User Query / WhatsApp Msg"] ──► CEO_Decision["CEO Agent: Routing Selector"]
    CEO_Decision ──►|JSON Array| Dispatcher["Event Loop Bus (EventEmitter)"]
    
    Dispatcher ──► HR["HR Agent"]
    Dispatcher ──► Fin["Finance Agent"]
    Dispatcher ──► Sales["Sales Agent"]
    Dispatcher ──► Mktg["Marketing Agent"]
    Dispatcher ──► Sec["Security Agent"]
    Dispatcher ──► Proj["Project Agent"]
    Dispatcher ──► Supp["Support Agent"]
    Dispatcher ──► Deal["Dealings Agent"]
    
    HR ──►|Roster Data| CEO_Synth["CEO Agent: Strategic Synthesis"]
    Fin ──►|Ledger Data| CEO_Synth
    Sales ──►|Lead Scores| CEO_Synth
    Mktg ──►|Campaign Analytics| CEO_Synth
    Sec ──►|Access logs| CEO_Synth
    Proj ──►|Task Milestone status| CEO_Synth
    Supp ──►|Client tickets| CEO_Synth
    Deal ──►|Proposals & Outreach| CEO_Synth
    
    CEO_Synth ──► UserReport["Unified Strategic Report"]
```

### Autonomous Lead Scoring & Execution Flow
When a lead is Qualified in the Sales Hub, the autonomous execution pipeline runs without user intervention:

```mermaid
graph TD
    ScrapedLead[Lead Discovered via Real-Time AI] ──► AI_Scoring[AI Scorer evaluates Opportunity Index]
    AI_Scoring ──► ScoreCheck{Is Score >= 75?}
    
    ScoreCheck ──►|No| Archive[Archive Lead: Status = Archived]
    ScoreCheck ──►|Yes| DraftProposal[1. Dealings Agent drafts Proposal in INR]
    
    DraftProposal ──► OutboundCampaign[2. Auto Outbound Campaign: Dispatches Email]
    OutboundCampaign ──► ProjectLaunch[3. Project Agent initializes CRM Deployment]
    ProjectLaunch ──► SpecialistsMatch[4. Matches Specialist Roster & Dispatches Tasks]
    SpecialistsMatch ──► TelegramNotify[5. Broadcasts Notification via Telegram Bot]
```

#### Visual Pipeline Blueprint Flowchart:
You can view the generated high-tech flowchart image here: [nexa_pipeline_flowchart.png](file:///C:/Users/dnava/.gemini/antigravity-ide/brain/cdb31327-2425-479f-9b97-4435af2d3d13/nexa_pipeline_flowchart_1781458372903.png)

---

## 2. Specialized Roster of Agents

NEXA integrates 9 specialized agent personas:

| Agent | Division | Primary Responsibility | Data Source Context |
| :--- | :--- | :--- | :--- |
| **CEO Agent** | Executive | Strategic orchestration, routing decisions, report compilation | Sub-agent outputs |
| **HR Agent** | People Ops | Personnel onboarding compliance, employee rosters, timesheets | `users` collection |
| **Finance Agent** | Ledger ERP | Active budgets in Rupees (₹), cash flow MRR projections, ledgers | `projects` collection |
| **Sales Agent** | Pipeline | Lead generation, pipeline analysis, opportunity scoping | `leads` collection |
| **Marketing Agent** | Campaigns | Social brand copy, tracking campaign log metrics | `outreach_logs` collection |
| **Security Agent** | Zero Trust | Access logs monitoring, geofence login audits, breach alerts | `audit_logs` collection |
| **Project Agent** | Milestones | Tasks dispatched, specialist allocations, bottleneck audits | `projects` & `tasks` collections |
| **Support Agent** | Helpdesk | Customer happiness metrics, client retention, ticket alerts | `retention_alerts` collection |
| **Dealings Agent** | Outbound | Autonomously negotiate deals, outreach campaigns, propose contracts (₹) | `proposals` & `outreach_logs` collections |

---

## 3. How to Use the Agents

You can leverage the agentic capabilities through three main interfaces:

### Interface 1: CEO Orchestrator Console (Chat Tab)
1. Navigate to the **Agent Network** tab on the dashboard.
2. Under **CEO Orchestrator Console**, type a query into the chat input.
   - *Example query*: `"Check active project budgets, employee roster, and security breach flags."`
3. Hit **Send**. You will watch the visual **Specialized Agent Roster** grid light up. The **Event Loop Communication Hub** console outputs real-time log hops showing the network messages.
4. The CEO returns the synthesized command-level report.

### Interface 2: WhatsApp Simulator Bot
1. Navigate to the **WhatsApp Bot** tab.
2. The phone simulator presents the active WhatsApp connection to **NEXA AI Admin**.
3. Type an instruction.
   - *Example query*: `"What is the status of our active deal proposals, negotiation velocity, and outbound outreach attempts?"`
4. The bot routes the inquiry through the multi-agent loop in the background and responds directly inside the WhatsApp bubble window.

### Interface 3: Human-in-the-Loop (HITL) Campaign approvals
The **Sales Hub** leads qualification incorporates manager validation:
1. Navigate to **Sales Hub** and execute a discovery search scrape.
2. Click **Qualify** on a discovered lead. The AI Sales scoring engine evaluates it.
3. If the **Opportunity Score is >= 75/100 (Hot Lead)**:
   - The autonomous campaign is **intercepted and held** at the gate.
   - The lead status is updated to `Pending_Approval`.
   - A proposal draft is compiled in Indian Rupees (`₹`), and a record is created in the **Pending Approvals Gateway** dashboard list.
   - Admins are alerted via Yahoo email and Telegram that a deal requires authorization.
4. Review the queued cards in the **Pending Approvals Gateway** panel:
   - **Approve Deployment**: Triggers proposal finalization, dispatches cold email outreach, matches developers, deploys project tasks, and broadcasts the launch milestone on LinkedIn.
   - **Reject**: Rejects the deal and archives the lead.

---

## 4. Developer API & Code Setup

The network's event loop is implemented in the server:

*   **Network Controller**: [agentNetworkController.js](file:///c:/Users/dnava/OneDrive/Desktop/Nexovgen-management/server/controllers/agentNetworkController.js) contains the `runMultiAgentOrchestration` function which binds the `EventEmitter` loops (`loop.on('agent.query')` and `loop.emit('agent.response')`).
*   **Prompt Registry**: Prompts are stored in the app data directory [prompts/](file:///C:/Users/dnava/.gemini/antigravity-ide/brain/cdb31327-2425-479f-9b97-4435af2d3d13/prompts/) and consolidated in [agent_training_prompt.md](file:///C:/Users/dnava/.gemini/antigravity-ide/brain/cdb31327-2425-479f-9b97-4435af2d3d13/agent_training_prompt.md).
*   **Test Script**: To test the loop from the command-line, run:
    ```bash
    node server/scratch/test_dealings_routing.js
    ```
