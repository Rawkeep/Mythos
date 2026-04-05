// Real Scheduler + Job Queue + n8n Webhook Integration (SQLite-backed)
import cron from "node-cron";
import {
  dbGetSchedulerJobs, dbInsertJob, dbUpdateJob,
  dbAddLog, dbGetLog,
} from "./db.js";

// --- Active Cron Tasks ---
const activeTasks = new Map();

// --- Schedule a Post ---

export function schedulePost({ id, content, platforms, scheduledAt, webhookUrl }) {
  const job = {
    id: id || `job-${Date.now()}`,
    type: "scheduled",
    content,
    platforms: platforms || [],
    scheduledAt,
    webhookUrl, // n8n callback URL
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };

  dbInsertJob(job);

  // Create actual cron task
  const date = new Date(scheduledAt);
  const cronExpr = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;

  const task = cron.schedule(cronExpr, async () => {
    await executeJob(job);
    task.stop();
    activeTasks.delete(job.id);
  }, { timezone: "Europe/Berlin" });

  activeTasks.set(job.id, task);

  addLog({ type: "scheduled", jobId: job.id, platforms: job.platforms, scheduledAt });
  return job;
}

// --- Execute a Job ---

async function executeJob(job) {
  dbUpdateJob(job.id, { status: "running" });

  const results = {};

  for (const platform of job.platforms) {
    try {
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
      const resp = await fetch(`${backendUrl}/api/platforms/${platform}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: job.content }),
      });
      results[platform] = await resp.json();
    } catch (err) {
      results[platform] = { success: false, error: err.message };
    }
  }

  // Update job status
  dbUpdateJob(job.id, {
    status: "completed",
    results,
    completedAt: new Date().toISOString(),
  });

  // Notify n8n webhook if configured
  if (job.webhookUrl) {
    try {
      await fetch(job.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "post_published",
          jobId: job.id,
          results,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      addLog({ type: "webhook_error", jobId: job.id, error: err.message });
    }
  }

  addLog({ type: "completed", jobId: job.id, results });
  return results;
}

// --- Cancel a Job ---

export function cancelJob(jobId) {
  const task = activeTasks.get(jobId);
  if (task) {
    task.stop();
    activeTasks.delete(jobId);
  }

  dbUpdateJob(jobId, { status: "cancelled" });
  addLog({ type: "cancelled", jobId });
  return true;
}

// --- Recurring Schedule (e.g. daily posting) ---
const MAX_RECURRING_JOBS = 10; // max 10 active recurring jobs

export function scheduleRecurring({ id, content, platforms, cronExpression, webhookUrl }) {
  const jobs = dbGetSchedulerJobs();
  const activeCount = jobs.active.filter(j => j.status === "active").length;
  if (activeCount >= MAX_RECURRING_JOBS) {
    throw new Error(`Max ${MAX_RECURRING_JOBS} aktive Recurring-Jobs erlaubt. Loesche alte Jobs zuerst.`);
  }

  const job = {
    id: id || `recurring-${Date.now()}`,
    type: "recurring",
    content,
    platforms,
    cronExpression,
    webhookUrl,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  dbInsertJob(job);

  const task = cron.schedule(cronExpression, async () => {
    await executeJob(job);
  }, { timezone: "Europe/Berlin" });

  activeTasks.set(job.id, task);

  addLog({ type: "recurring_created", jobId: job.id, cronExpression });
  return job;
}

// --- Stop Recurring Job ---

export function stopRecurring(jobId) {
  const task = activeTasks.get(jobId);
  if (task) {
    task.stop();
    activeTasks.delete(jobId);
  }

  dbUpdateJob(jobId, { status: "stopped" });
  addLog({ type: "recurring_stopped", jobId });
  return true;
}

// --- Get Status ---

export function getSchedulerStatus() {
  const jobs = dbGetSchedulerJobs();
  const log = loadLog();
  return {
    scheduled: jobs.scheduled.filter(j => j.status === "scheduled").length,
    completed: jobs.scheduled.filter(j => j.status === "completed").length,
    recurring: jobs.active.filter(j => j.status === "active").length,
    recentLog: log.slice(0, 20),
    jobs: jobs.scheduled.slice(0, 50),
    activeRecurring: jobs.active,
  };
}

// --- Log wrappers ---

export function addLog(entry) {
  dbAddLog(entry);
}

export function loadLog() {
  return dbGetLog(200);
}

// Keep named exports compatible with server.js imports
export function loadJobs() {
  return dbGetSchedulerJobs();
}
