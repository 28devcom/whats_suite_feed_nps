import pool from '../infra/db/postgres.js';
import { AppError } from '../shared/errors.js';
import {
  listConnectionsForUser,
  listQueuesForSession,
  listQueuesForSessionAndUser
} from '../infra/db/queueConnectionRepository.js';
import { listWhatsappSessions } from '../infra/db/whatsappSessionRepository.js';
import {
  listSessions as listLiveWhatsappSessions,
  getStatusForSession
} from './whatsappService.js';

// Allowed connection statuses for selección (solo conexiones realmente operativas)
const ELIGIBLE_STATUSES = ['connected'];

const isEffectivelyConnected = (status, lastConnectedAt) => {
  const normalized = (status || '').toLowerCase();
  if (ELIGIBLE_STATUSES.includes(normalized)) return true;
  // Fallback: si el último conectado fue reciente (5 min), considérese operativa aunque el status no llegue actualizado.
  if (lastConnectedAt) {
    const ts = new Date(lastConnectedAt).getTime();
    if (!Number.isNaN(ts) && Date.now() - ts <= 5 * 60 * 1000) return true;
  }
  return false;
};

// Metrics windows (minutes)
const TRAFFIC_WINDOW_MIN = 15;
const ERROR_WINDOW_MIN = 30;

// Fetch live status with same logic que la UI: primero status en vivo por sesión, luego fallback list + DB.
const buildSessionStatusMap = async (sessionNames = []) => {
  const map = new Map();

  // 1) Intentar status live por sesión (GET /status)
  for (const name of sessionNames) {
    try {
      const st = await getStatusForSession(name);
      map.set(name, {
        status: (st?.status || '').toLowerCase(),
        lastConnectedAt: st?.lastConnectedAt || null,
        updatedAt: st?.updatedAt || null
      });
    } catch (_err) {
      // ignore per-session errors; fallback later
    }
  }

  // Si ya tenemos todos, retorna
  if (map.size === sessionNames.length && sessionNames.length > 0) return map;

  // 2) Lote via listSessions (live-ish)
  try {
    const sessions = await listLiveWhatsappSessions();
    sessions.forEach((s) => {
      const name = s.session || s.sessionName || s.id;
      if (!name) return;
      if (map.has(name)) return;
      map.set(name, {
        status: (s.status || '').toLowerCase(),
        lastConnectedAt: s.lastConnectedAt || s.last_connected_at || null,
        updatedAt: s.updatedAt || s.updated_at || null
      });
    });
  } catch (_err) {
    // ignore; go to DB
  }

  // 3) DB snapshot fallback
  if (map.size < sessionNames.length) {
    const sessions = await listWhatsappSessions();
    sessions.forEach((s) => {
      if (map.has(s.sessionName)) return;
      map.set(s.sessionName, {
        status: (s.status || '').toLowerCase(),
        lastConnectedAt: s.lastConnectedAt,
        updatedAt: s.updatedAt
      });
    });
  }

  return map;
};

// Aggregate lightweight load/traffic/error metrics per session using existing tables
const buildSessionMetrics = async (sessionNames) => {
  if (!sessionNames.length) return { load: new Map(), traffic: new Map(), errors: new Map() };

  const load = new Map();
  const traffic = new Map();
  const errors = new Map();

  // Chat load: open and unassigned counts per session
  const { rows: loadRows } = await pool.query(
    `SELECT whatsapp_session_name AS session, 
            SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
            SUM(CASE WHEN status = 'UNASSIGNED' THEN 1 ELSE 0 END) AS unassigned_count
     FROM chats
     WHERE whatsapp_session_name = ANY($1)
     GROUP BY whatsapp_session_name`,
    [sessionNames]
  );
  loadRows.forEach((r) => {
    load.set(r.session, {
      open: Number(r.open_count || 0),
      unassigned: Number(r.unassigned_count || 0)
    });
  });

  // Recent traffic (15m) inbound/outbound counts
  const { rows: trafficRows } = await pool.query(
    `SELECT whatsapp_session_name AS session,
            SUM(CASE WHEN direction = 'out' THEN 1 ELSE 0 END) AS outbound_count,
            SUM(CASE WHEN direction = 'in' THEN 1 ELSE 0 END) AS inbound_count
     FROM chat_messages
     WHERE whatsapp_session_name = ANY($1)
       AND created_at >= NOW() - ($2 || ' minutes')::interval
     GROUP BY whatsapp_session_name`,
    [sessionNames, TRAFFIC_WINDOW_MIN]
  );
  trafficRows.forEach((r) => {
    traffic.set(r.session, {
      out: Number(r.outbound_count || 0),
      in: Number(r.inbound_count || 0)
    });
  });

  // Recent errors per session (30m)
  const { rows: errorRows } = await pool.query(
    `SELECT session_name AS session, COUNT(*) AS total
     FROM whatsapp_error_log
     WHERE session_name = ANY($1)
       AND created_at >= NOW() - ($2 || ' minutes')::interval
     GROUP BY session_name`,
    [sessionNames, ERROR_WINDOW_MIN]
  );
  errorRows.forEach((r) => {
    errors.set(r.session, Number(r.total || 0));
  });

  return { load, traffic, errors };
};

// Scoring function; higher is better. Missing metrics are neutral (0 impact).
const scoreSession = ({ status, load, traffic, errors, lastConnectedAt }) => {
  if (!isEffectivelyConnected(status, lastConnectedAt)) return -Infinity;

  let score = 0;
  // Status weight (solo connected puntúa; otros estados se filtran en isEffectivelyConnected)
  const normalized = (status || '').toLowerCase();
  if (normalized === 'connected') score += 3;

  // Load penalties
  const open = load?.open ?? null;
  const unassigned = load?.unassigned ?? null;
  if (open !== null) score -= open * 1;
  if (unassigned !== null) score -= unassigned * 0.5;

  // Traffic penalty (saturación reciente)
  const totalTraffic = (traffic?.in ?? 0) + (traffic?.out ?? 0);
  score -= totalTraffic * 0.02; // -0.2 por 10 msgs aprox

  // Error penalty
  const errCount = errors ?? 0;
  score -= errCount * 2;

  // Uptime bonus
  if (lastConnectedAt) {
    const lastConnMs = new Date(lastConnectedAt).getTime();
    if (!Number.isNaN(lastConnMs)) {
      const hours = (Date.now() - lastConnMs) / 3600000;
      if (hours >= 24) score += 2;
      else if (hours >= 1) score += 1;
    }
  }

  return score;
};

/**
 * Selecciona automáticamente una conexión (teléfono) para un nuevo chat 1-a-1.
 * No modifica chats existentes ni afecta módulos de warmup/broadcast.
 *
 * Objetivo:
 *   - Elegir la conexión WhatsApp “más sana” y menos cargada cuando el cliente no envía sessionName.
 *
 * Flujo resumido:
 *   1) Determina las conexiones visibles para el usuario (o todas si es admin/supervisor).
 *   2) Filtra por cola si se solicita y aplica exclusiones opcionales.
 *   3) Enriquecimiento con estado vivo (whatsapp_sessions) y métricas ligeras (carga de chats, tráfico reciente, errores recientes).
 *   4) Calcula un score on-the-fly; descarta estados no elegibles.
 *   5) Ordena por score, luego menor carga, luego último connectedAt; retorna la primera.
 *
 * Punto de integración:
 *   - Usado por chatService.createOrReopenChat antes de validar colas/persistir el chat,
 *     únicamente cuando sessionName no viene en la solicitud.
 *
 * Métricas usadas (todas existentes):
 *   - Estado: status/lastConnectedAt de whatsapp_sessions.
 *   - Carga: conteo de chats OPEN/UNASSIGNED por whatsapp_session_name.
 *   - Tráfico: mensajes in/out últimos 15 min (chat_messages).
 *   - Errores: whatsapp_error_log últimos 30 min.
 *
 * Limitaciones:
 *   - No mide latencia de entrega; si se necesita, deberá estimarse con timestamps de message_update.
 *   - Ventanas fijas (15/30 min) configuradas en constantes; no parametrizadas por tenant.
 *   - Usa advisory locks por usuario/tenant; no evita colisiones entre usuarios distintos eligiendo la misma línea.
 *
 * Riesgos conocidos:
 *   - Si todas las conexiones elegibles están “pending/reconnecting” con poca carga, pueden empatar en score; se rompe por carga/connectedAt.
 *   - Si el estado en whatsapp_sessions está desactualizado, la selección podría no reflejar la salud real del socket.
 *
 * @param {Object} params
 * @param {Object} params.user         - Usuario que crea el chat (requiere id/role).
 * @param {string|null} params.tenantId - Tenant actual (opcional).
 * @param {string|null} params.queueId  - Cola deseada (opcional); filtra conexiones que la tengan.
 * @param {Array<string>} [params.excludeSessions] - Lista de sessionNames a excluir (reservadas o bloqueadas).
 * @returns {Promise<{sessionName: string, score: number, status: string}>} Conexión seleccionada y score.
 */
export const selectAutoConnectionForChat = async ({ user, tenantId = null, queueId = null, excludeSessions = [] }) => {
  if (!user?.id) throw new AppError('Usuario requerido para selección de conexión', 400);

  // 1) Conexiones visibles para el usuario
  const includeAll = user.role === 'ADMIN' || user.role === 'SUPERVISOR';
  const connections = await listConnectionsForUser(user.id, { includeAll });
  const normalized = connections.map((c) => ({
    sessionName: c.sessionName,
    queues: c.queues || [],
    status: c.status || null
  }));

  const excluded = new Set((excludeSessions || []).map((s) => s.trim()).filter(Boolean));

  // 2) Filtrado por cola, si se solicitó una específica
  const filtered = normalized.filter((c) => {
    if (excluded.has(c.sessionName)) return false;
    if (!queueId) return true;
    return c.queues.some((q) => q.id === queueId);
  });
  if (!filtered.length) {
    throw new AppError('No hay conexiones elegibles para la cola seleccionada', 404);
  }

  // 3) Enriquecer con estado actual y métricas livianas
  const statusMap = await buildSessionStatusMap(filtered.map((c) => c.sessionName));
  const sessionNames = filtered.map((c) => c.sessionName);
  const { load, traffic, errors } = await buildSessionMetrics(sessionNames);

  // 4) Calcular score
  let scored;
  try {
    scored = filtered
      .map((c) => {
        const status = (statusMap.get(c.sessionName)?.status || c.status || '').toLowerCase();
        return {
          sessionName: c.sessionName,
          score: scoreSession({
            status,
            load: load.get(c.sessionName),
            traffic: traffic.get(c.sessionName),
            errors: errors.get(c.sessionName),
            lastConnectedAt: statusMap.get(c.sessionName)?.lastConnectedAt
          }),
          load: load.get(c.sessionName),
          status
        };
      })
      .filter((c) => c.score > -Infinity);
  } catch (err) {
    throw new AppError(`Error al calcular score de conexiones: ${err.message}`, 500);
  }

  if (!scored.length) {
    throw new AppError('No hay conexiones activas disponibles para selección automática', 503);
  }

  // 5) Selección con desempate determinista
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aLoad = (a.load?.open || 0) + (a.load?.unassigned || 0);
    const bLoad = (b.load?.open || 0) + (b.load?.unassigned || 0);
    if (aLoad !== bLoad) return aLoad - bLoad; // menos carga gana
    const aConn = statusMap.get(a.sessionName)?.lastConnectedAt || 0;
    const bConn = statusMap.get(b.sessionName)?.lastConnectedAt || 0;
    return new Date(bConn) - new Date(aConn);
  });

  return {
    sessionName: scored[0].sessionName,
    score: scored[0].score,
    status: scored[0].status
  };
};

export default selectAutoConnectionForChat;
