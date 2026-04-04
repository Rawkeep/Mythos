// Real Scheduler + Job Queue + n8n Webhook Integration
import cron from "node-cron";
import { readFileSync, writeFileSync, existsSync } from "fs";

const JOBS_PATH = "./scheduled-jobs.json";
const LOG_PATH = "./job-log.json";

// --- Job Storage ---

function loadJobs() {
  if (existsSync(JOBS_PATH)) return JSON.parse(readFileSync(JOBS_PATH, "utf-8"));
  return { scheduled: [], active: [] };
}

function saveJobs(jobs) {
  writeFileSync(JOBS_PATH, JSON.stringify(jobs, null, 2));
}

function loadLog() {
  if (existsSync(LOG_PATH)) return JSON.parse(readFileSync(LOG_PATH, "utf-8"));
  return [];
}

function addLog(entry) {
  const log = loadLog();
  log.unshift({ ...entry, timestamp: new Date().toISOString() });
  writeFileSync(LOG_PATH, JSON.stringify(log.slice(0, 200), null, 2));
}

// --- Active Cron Tasks ---
const activeTasks = new Map();

// --- Schedule a Post ---

export function schedulePost({ id, content, platforms, scheduledAt, webhookUrl }) {
  const jobs = loadJobs();
  const job = {
    id: id || `job-${Date.now()}`,
    content,
    platforms: platforms || [],
    scheduledAt,
    webhookUrl, // n8n callback URL
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };

  jobs.scheduled.push(job);
  saveJobs(jobs);

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
  const jobs = loadJobs();
  const idx = jobs.scheduled.findIndex(j => j.id === job.id);
  if (idx !== -1) {
    jobs.scheduled[idx].status = "running";
    saveJobs(jobs);
  }

  const results = {};

  for (const platform of job.platforms) {
    try {
      const resp = await fetch(`http://localhost:3001/api/platforms/${platform}/post`, {
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
  if (idx !== -1) {
    jobs.scheduled[idx].status = "completed";
    jobs.scheduled[idx].results = results;
    jobs.scheduled[idx].completedAt = new Date().toISOString();
    saveJobs(jobs);
  }

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

  const jobs = loadJobs();
  const idx = jobs.scheduled.findIndex(j => j.id === jobId);
  if (idx !== -1) {
    jobs.scheduled[idx].status = "cancelled";
    saveJobs(jobs);
  }

  addLog({ type: "cancelled", jobId });
  return true;
}

// --- Recurring Schedule (e.g. daily posting) ---

export function scheduleRecurring({ id, content, platforms, cronExpression, webhookUrl }) {
  const jobs = loadJobs();
  const job = {
    id: id || `recurring-${Date.now()}`,
    content,
    platforms,
    cronExpression,
    webhookUrl,
    type: "recurring",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  jobs.active.push(job);
  saveJobs(jobs);

  const task = cron.schedule(cronExpression, async () => {
    await executeJob(job);
  }, { timezone: "Europe/Berlin" });

  activeTasks.set(job.id, task);

  addLog({ type: "recurring_created", jobId: job.id, cronExpression });
  return job;
}

// --- Get Status ---

export function getSchedulerStatus() {
  const jobs = loadJobs();
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

export { loadJobs, loadLog, addLog };
