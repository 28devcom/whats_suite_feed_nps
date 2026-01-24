## WarmupEngine

### Objetivo
Orquestar conversaciones simuladas entre líneas propias de WhatsApp para calentar reputación sin afectar tráfico real, con cadencia humana, variación de contenido y controles de riesgo (dry-run, límites, auto-shutdown, auditoría).

### Arquitectura
```
lines -> WarmupScheduler -> WarmupEngine
           |                    |
           |                    +-- Grouping: warmupBlenderService (parejas/grupos sin repetir)
           |                    +-- Content: warmupConversationGenerator (mensaje corto/largo, typos, emoji)
           |                    +-- Timing: humanTimingService (delays, typing, horarios activos)
           |                    +-- Profiles: warmupProfiles (nuevo/tibio/estable/recuperacion)
           |                    +-- Telemetry: warmupTelemetry (metrics Redis + auditoría)
           |                    +-- Transport: whatsappService (Baileys adapter)
           |
           +-- Quotas/locks Redis (daily quota, last-run)
```

### Componentes clave
- `warmupEngine.js`: motor principal, controla runGroups/runConversation, perfiles, dry-run/simulate, límites, fail-safe, auto-shutdown.
- `warmupBlenderService.js`: agrupa líneas evitando repeticiones recientes (pares/grupos), rotación por recencia.
- `warmupConversationGenerator.js`: genera diálogos human-like con plantillas, typos y emoji.
- `humanTimingService.js`: calcula delays, typing y respeta ventanas horarias.
- `warmupProfiles.js`: perfiles por línea (nuevo, tibio, estable, recuperacion) ajustan límite diario, turnos y ritmo.
- `warmupScheduler.js`: ejecuta ciclos periódicos, aplica quotas por perfil y minInterval, llama al motor.
- `warmupTelemetry.js`: métricas por línea en Redis (sent/failed/skipped), historial reproducible, auditoría.

### Configuración principal
Constructor de `createWarmupEngine(options)`:
- `allowSend` (bool, default false): si es false no envía a WhatsApp (dry-run).
- `simulate` (bool, default false): no espera delays ni envía; solo emite evento `simulation`.
- `timingConfig` (`buildTimingConfig()`): delays base, longPause, typing, activeHours.
- `retryDelaysMs` (array): backoff para reintentos.
- `emojiChance`/`typoChance`: valores base si el perfil no define.
- `maxMessagesPerRun` (cap global), `maxPerSessionPerRun` (cap por sesión).
- `failShutdownThreshold` + `autoShutdown`: si supera fallos consecutivos se deshabilita el motor.

Perfiles (`warmupProfiles.js`):
- `nuevo`: dailyLimit 12, minInterval 30m, 4 turnos, ritmo lento.
- `tibio`: dailyLimit 18, minInterval 20m, 6 turnos.
- `estable`: dailyLimit 30, minInterval 10m, 8 turnos.
- `recuperacion`: dailyLimit 8, minInterval 45m, 4 turnos, pausas largas.

Scheduler (`createWarmupScheduler`):
- `frequencyMs`: intervalo entre ciclos.
- `fetchLines`: función async que retorna `{ id, sessionName, phone, status, warmupProfile? }[]`.
- `allowedStatuses`: lista de estados permitidos (default `['active']`).
- Aplica cuotas diarias, minInterval y pasa `simulate` del motor.

Blender (`planWarmupGroups`):
- Tamaño grupos 3–8, TTL pares/grupos (evita repeticiones), lock Redis para concurrencia.

Timing (`computeHumanDelay`):
- Delays con jitter, longPauseChance, typing simulado, respeto de activeHours con reprogramación a la siguiente ventana.

### Ejemplos de uso

Motor en simulación (QA):
```js
import { createWarmupEngine } from '../../services/warmupEngine.js';

const engine = createWarmupEngine({ allowSend: false, simulate: true });
engine.on('simulation', (evt) => console.log('Plan:', evt));
await engine.runGroups({
  lines: [
    { id: 'lineA', sessionName: 'wa-a', phone: '5491112340000', warmupProfile: 'nuevo' },
    { id: 'lineB', sessionName: 'wa-b', phone: '5491112340001', warmupProfile: 'tibio' },
    { id: 'lineC', sessionName: 'wa-c', phone: '5491112340002', warmupProfile: 'estable' }
  ],
  topicKey: 'catchup',
  turns: 6
});
```

Scheduler en modo envío real con hardening:
```js
import { createWarmupScheduler } from '../../services/warmupScheduler.js';
import { createWarmupEngine } from '../../services/warmupEngine.js';

const engine = createWarmupEngine({
  allowSend: true,
  simulate: false,
  maxMessagesPerRun: 80,
  maxPerSessionPerRun: 25,
  failShutdownThreshold: 5,
  autoShutdown: true
});

const scheduler = createWarmupScheduler({
  engine,
  frequencyMs: 90_000,
  fetchLines: async () => /* retornar líneas activas con profile */,
  allowedStatuses: ['active']
});

engine.on('shutdown', (e) => console.error('Warmup auto-shutdown', e));
scheduler.start();
```

Métricas / historial:
```js
import { snapshotWarmupMetrics, listWarmupHistory } from '../../services/warmupTelemetry.js';

const metrics = await snapshotWarmupMetrics('lineA');
const history = await listWarmupHistory('lineA', 20);
```

### Eventos emitidos
- `simulation`: plan sin envío real.
- `typing`: typing simulado (solo envío real).
- `sent`: mensaje enviado.
- `dry_run`: mensaje normalizado en modo `allowSend=false`.
- `failed`: fallo de envío.
- `skipped`: grupo omitido por sesión no conectada.
- `session_skipped`: sesión fuera de servicio.
- `shutdown`: motor deshabilitado por umbral de fallos.

### Advertencias y buenas prácticas
- Mantener `allowSend=false` y/o `simulate=true` en entornos QA/staging.
- No mezclar perfiles de alto ritmo con líneas en reputación baja; el motor toma el ritmo más conservador pero revisa métricas.
- Ajustar `recentPairTtlSeconds`/`recentGroupTtlSeconds` si se observan patrones repetitivos.
- Monitorear `consecutiveFailures` y alertas `WARMUP_AUTO_SHUTDOWN`; re-habilitar solo tras corregir la causa.
- Respetar ventanas horarias locales para evitar patrones nocturnos anómalos.

### Diagramas textuales

Flujo principal:
```
fetchLines -> filter/quota (Scheduler)
           -> plan groups (Blender, Redis locks/TTL)
           -> conversation plan (Generator + Profiles)
           -> timing (HumanTiming)
           -> send/simulate (WhatsApp Adapter)
           -> telemetry + audit (Redis + audit_logs)
```

Controles de riesgo:
```
caps: maxMessagesPerRun, maxPerSessionPerRun
fail-safe: consecutiveFailures -> autoShutdown
dry-run/simulate: allowSend=false / simulate=true
quotas: daily per line (Redis)
cooldown: minInterval per profile (Redis last-run)
```

### Archivos relevantes
- `src/services/warmupEngine.js`
- `src/services/warmupScheduler.js`
- `src/services/warmupBlenderService.js`
- `src/services/warmupConversationGenerator.js`
- `src/services/humanTimingService.js`
- `src/services/warmupProfiles.js`
- `src/services/warmupTelemetry.js`
