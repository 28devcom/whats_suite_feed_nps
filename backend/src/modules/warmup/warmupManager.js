import { createWarmupEngine } from '../../services/warmupEngine.js';
import { createWarmupScheduler } from '../../services/warmupScheduler.js';
import { listWhatsappSessions } from '../../infra/db/whatsappSessionRepository.js';
import { snapshotWarmupMetrics } from '../../services/warmupTelemetry.js';
import { isAllowed, getSelection, setSelection } from '../../services/warmupSelection.js';

let engine = null;
let scheduler = null;
const autoStart = process.env.WARMUP_AUTOSTART !== 'false';

const buildEngine = () => {
  if (engine) return engine;
  engine = createWarmupEngine({
    allowSend: true,
    simulate: false
  });
  return engine;
};

const fetchLines = async () => {
  const sessions = await listWhatsappSessions();
  const lines = [];
  for (const s of sessions) {
    if (!s.status || s.status.toLowerCase() === 'deleted') continue;
    const allowed = await isAllowed(s.sessionName);
    if (!allowed) continue;
    lines.push({
      id: s.sessionName,
      sessionName: s.sessionName,
      phone: s.sessionName,
      status: s.status || 'active',
      warmupProfile: 'estable',
      tenantId: s.tenantId || null
    });
  }
  return lines;
};

const buildScheduler = () => {
  if (scheduler) return scheduler;
  scheduler = createWarmupScheduler({
    engine: buildEngine(),
    fetchLines,
    frequencyMs: 120_000
  });
  if (autoStart) {
    scheduler.start();
  }
  return scheduler;
};

export const getWarmupStatus = () => {
  const eng = buildEngine();
  const sch = buildScheduler();
  return {
    running: sch.paused === false && Boolean(sch.timer),
    paused: sch.paused,
    simulate: eng.simulate,
    allowSend: eng.allowSend,
    failShutdown: eng.disabled,
    nextRunMs: sch.frequencyMs
  };
};

export const startWarmup = async () => {
  const sch = buildScheduler();
  sch.start();
  return getWarmupStatus();
};

export const pauseWarmup = async () => {
  const sch = buildScheduler();
  sch.pause();
  return getWarmupStatus();
};

export const resumeWarmup = async () => {
  const sch = buildScheduler();
  sch.resume();
  return getWarmupStatus();
};

export const setSimulation = async (simulate = false) => {
  const eng = buildEngine();
  eng.simulate = Boolean(simulate);
  return getWarmupStatus();
};

export const runWarmupCycle = async () => {
  const sch = buildScheduler();
  await sch.runCycle();
  return getWarmupStatus();
};

export const listWarmupLines = async () => {
  const lines = await fetchLines();
  const enriched = await Promise.all(
    lines.map(async (line) => {
      const metrics = await snapshotWarmupMetrics(line.id);
      return {
        ...line,
        metrics
      };
    })
  );
  return enriched;
};

export const getWarmupSelection = async () => getSelection();
export const updateWarmupSelection = async (selection) => setSelection(selection);
