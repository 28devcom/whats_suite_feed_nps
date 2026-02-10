import { createWarmupEngine } from '../../services/warmupEngine.js';
import { createWarmupScheduler } from '../../services/warmupScheduler.js';
import { listWhatsappSessions } from '../../infra/db/whatsappSessionRepository.js';
import { listSessions } from '../../services/whatsappService.js';
import { snapshotWarmupMetrics } from '../../services/warmupTelemetry.js';
import { isAllowed, getSelection, setSelection } from '../../services/warmupSelection.js';

let engine = null;
let scheduler = null;
// Por defecto NO auto-iniciar; requiere acción manual. Solo se autostartea si WARMUP_AUTOSTART=true explícitamente.
const autoStart = process.env.WARMUP_AUTOSTART === 'true';

const buildEngine = () => {
  if (engine) return engine;
  engine = createWarmupEngine({
    allowSend: true,
    simulate: true // modo simulación por defecto; no debe enviar hasta que se desactive manualmente
  });
  return engine;
};

const fetchLines = async () => {
  // Usa la misma lógica que la página de conexiones: live status + persistido.
  const sessions = await listSessions();
  const lines = [];
  for (const s of sessions) {
    const status = (s.status || '').toLowerCase();
    if (!status || status === 'deleted') continue;
    const allowed = await isAllowed(s.session || s.sessionName || s.id);
    if (!allowed) continue;
    lines.push({
      id: s.session || s.sessionName,
      sessionName: s.session || s.sessionName,
      phone: s.session || s.sessionName,
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
  // Estado inicial pausado siempre; solo se arranca si se indica explícitamente.
  scheduler.pause();
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
