import crypto from 'node:crypto';

// Generador de conversaciones human-like para warmups internos.
// Produce turnos con texto variado, typos leves, emojis ocasionales y pausas naturales.

const randomInt = (min, max) => crypto.randomInt(min, max + 1);
const randomFloat = () => Number.parseFloat((crypto.randomInt(0, 10_000) / 10_000).toFixed(4));
const pick = (arr) => arr[randomInt(0, arr.length - 1)];

const EMOJIS = ['🙂', '😉', '👍', '🙌', '🔥', '☕️', '📱', '💬', '✨', '😅', '🫡'];
const FILLERS = ['mmm', 'hmm', 'ya', 'ok', 'vale', 'sip', 'aja', 'buenazo', 'eso'];
const GREETINGS = ['hey', 'hola', 'holi', 'buenas', 'que tal', 'hey hey'];
const CLOSERS = ['luego me cuentas', 'avisame si puedes', 'te leo', 'nos leemos', 'avisame', 'quedo atento'];
const TIME_REFS = ['ahora en un rato', 'en 5', 'mas tarde', 'en la tarde', 'manana', 'despues de comer'];
const SMALLTALKS = [
  'como vas',
  'todo tranqui?',
  'que tal el dia',
  'como pinta la manana',
  'ya almorzaste?',
  'mucho calor hoy',
  'lloviendo a full aca',
  'andas full con algo?'
];
const TOPICS = [
  {
    key: 'logistica',
    hooks: ['te iba a preguntar algo rapido', 'necesito coordinar algo', 'estaba viendo lo de manana', 'podemos cuadrar?'],
    asks: ['te sirve pasar por la oficina?', 'quieres que nos veamos?', 'armamos una call corta?', 'prefieres chat?'],
    activities: ['cerrando pendientes', 'saliendo a una vuelta', 'entre reuniones', 'en camino a casa'],
    plans: ['dejamos listo el checklist', 'revisamos pendientes', 'vemos entregables', 'armo un breve resumen']
  },
  {
    key: 'soporte',
    hooks: ['me marco algo raro', 'estoy probando un flujo', 'vi un bugcito', 'el bot respondio raro'],
    asks: ['puedes mirar logs?', 'probaste el boton nuevo?', 'reiniciaste la sesion?', 'te llego mi mensaje anterior?'],
    activities: ['checando metricas', 'leyendo tickets', 'revisando alertas', 'corriendo un test'],
    plans: ['lo documento', 'subo un clip', 'mando captura', 'abro ticket']
  },
  {
    key: 'catchup',
    hooks: ['pense en ti', 'se me ocurrio algo', 'como vas con lo tuyo?', 'que tal la semana?'],
    asks: ['te animas a un cafe?', 'cuentame algo bueno', 'probaste ese lugar nuevo?', 'viste la serie que te dije?'],
    activities: ['caminando', 'tomando un cafe', 'en un break', 'volviendo del gym'],
    plans: ['te paso notas', 'te mando el link', 'mandame ubicacion', 'te mando un audio luego']
  }
];

const TEMPLATES = {
  short: [
    '{{greeting}} {{smalltalk}}',
    '{{hook}} {{ask}}',
    '{{filler}}, {{ask}}',
    '{{hook}} {{plan}}',
    '{{filler}}, te escribo {{timeRef}}',
    '{{ask}} {{emoji}}'
  ],
  long: [
    'Estaba {{activity}} y {{hook}}, pense que {{ask}}. {{plan}} {{emoji}}',
    '{{greeting}}, justo {{activity}} y vi que {{hook}}. {{ask}} {{closer}}',
    'Oye, {{hook}}. {{plan}} y despues {{ask}}. {{filler}}',
    'Voy a estar {{timeRef}}, {{ask}}? {{closer}} {{emoji}}',
    '{{greeting}} {{smalltalk}}. {{hook}} y {{ask}}. {{plan}}'
  ]
};

const keyboardAdjacency = {
  a: ['s', 'q', 'z'],
  e: ['w', 'r', 'd'],
  i: ['u', 'o', 'k'],
  o: ['i', 'p', 'l'],
  u: ['y', 'i', 'j'],
  s: ['a', 'd', 'w'],
  d: ['s', 'f', 'e'],
  l: ['k', 'o'],
  n: ['b', 'm', 'h'],
  m: ['n', 'k'],
  r: ['e', 't', 'f'],
  t: ['r', 'y', 'g'],
  c: ['x', 'v'],
  v: ['c', 'b'],
  b: ['v', 'n']
};

const maybeEmoji = (emojiChance) => (randomFloat() < emojiChance ? pick(EMOJIS) : '');

const injectTypos = (text, typoChance) => {
  if (typoChance <= 0) return text;
  return text
    .split('')
    .map((ch) => {
      const lower = ch.toLowerCase();
      if (!keyboardAdjacency[lower]) return ch;
      if (randomFloat() > typoChance) return ch;
      const mode = randomFloat();
      if (mode < 0.33) return ''; // drop char
      if (mode < 0.66) return pick(keyboardAdjacency[lower]); // adjacent key
      return `${ch}${ch}`; // double char
    })
    .join('');
};

const maybeFiller = (text) => {
  if (randomFloat() > 0.3) return text;
  const filler = pick(FILLERS);
  return randomFloat() > 0.5 ? `${filler} ${text}` : `${text} ${filler}`;
};

const renderTemplate = (template, ctx) =>
  template.replace(/{{(.*?)}}/g, (_m, key) => {
    const value = ctx[key];
    if (!value) return '';
    if (Array.isArray(value)) return pick(value);
    if (typeof value === 'function') return value();
    return value;
  });

const buildContext = (topic, opts) => ({
  greeting: GREETINGS,
  smalltalk: SMALLTALKS,
  filler: FILLERS,
  closer: CLOSERS,
  hook: topic.hooks,
  ask: topic.asks,
  activity: topic.activities,
  plan: topic.plans,
  timeRef: TIME_REFS,
  emoji: () => maybeEmoji(opts.emojiChance)
});

const chooseTemplate = (longBias = 0.4) => {
  const isLong = randomFloat() < longBias;
  const pool = isLong ? TEMPLATES.long : TEMPLATES.short;
  return { template: pick(pool), isLong };
};

const withHumanization = (text, { emojiChance, typoChance }) => {
  let output = text;
  output = injectTypos(output, typoChance);
  output = maybeFiller(output);
  if (randomFloat() < emojiChance * 0.5 && !output.includes('emoji')) {
    output = `${output} ${maybeEmoji(emojiChance)}`.trim();
  }
  return output.replace(/\s+/g, ' ').trim();
};

const chooseDelayMs = (isLong) => {
  const bucket = isLong ? [9000, 25000] : [3500, 14000];
  const slowChance = randomFloat();
  if (slowChance < 0.15) {
    return randomInt(25_000, 55_000); // pausas largas
  }
  return randomInt(bucket[0], bucket[1]);
};

const nextSpeaker = (participants, lastId = null) => {
  if (!participants.length) return null;
  const candidates = lastId ? participants.filter((p) => p.id !== lastId) : participants;
  if (!candidates.length) return pick(participants);
  return pick(candidates);
};

export const generateHumanConversation = ({
  participants,
  turns = 8,
  topicKey = null,
  emojiChance = 0.25,
  typoChance = 0.08,
  longBias = 0.45
}) => {
  const unique = Array.from(
    new Map(
      (participants || []).map((p) => [
        p.id || p.sessionName || p.phone || p,
        { ...(typeof p === 'object' ? p : { id: p }), id: p.id || p.sessionName || p.phone || p }
      ])
    ).values()
  );

  if (unique.length < 2) {
    throw new Error('Se requieren al menos 2 participantes para generar conversacion');
  }

  const topic = topicKey ? TOPICS.find((t) => t.key === topicKey) || pick(TOPICS) : pick(TOPICS);
  const ctx = buildContext(topic, { emojiChance });
  const totalTurns = Math.max(4, Math.min(turns, 14));
  const messages = [];

  let lastSender = null;
  for (let i = 0; i < totalTurns; i += 1) {
    const sender = nextSpeaker(unique, lastSender?.id);
    const receiver = nextSpeaker(unique.filter((p) => p.id !== sender.id), null);
    const { template, isLong } = chooseTemplate(longBias || 0.45);
    const rendered = renderTemplate(template, ctx);
    const text = withHumanization(rendered, { emojiChance, typoChance });
    const delayMs = chooseDelayMs(isLong);

    messages.push({
      from: sender.id,
      to: receiver?.id || null,
      text,
      delayMs,
      meta: { isLong, topic: topic.key }
    });
    lastSender = sender;
  }

  return {
    topic: topic.key,
    turns: messages.length,
    messages
  };
};

export default generateHumanConversation;
