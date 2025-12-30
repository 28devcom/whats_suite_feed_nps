import { AppError } from '../shared/errors.js';
import { normalizePhoneNumber } from '../shared/phoneNormalizer.js';
import {
  getContactByPhone,
  upsertContact,
  resolveTenantId,
  findContactsByPhones
} from '../infra/db/contactRepository.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import { emitToRoles } from '../infra/realtime/socketHub.js';
import { ROLES } from '../domain/user/user.js';

const MAX_DISPLAY_NAME = 120;
const MAX_METADATA_BYTES = 4000;
const MAX_AVATAR_REF = 512;

const sanitizeDisplayName = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') throw new AppError('displayName debe ser texto', 400);
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (cleaned.length > MAX_DISPLAY_NAME) throw new AppError('Nombre demasiado largo', 400);
  return cleaned;
};

const sanitizeAvatarRef = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const ref = String(value).trim();
  if (!ref) return null;
  return ref.slice(0, MAX_AVATAR_REF);
};

const sanitizeMetadata = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('metadata debe ser un objeto', 400);
  }
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_METADATA_BYTES) throw new AppError('Metadata demasiado grande', 400);
  return value;
};

const normalizePhoneOrFail = (phone) => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized || normalized.length < 6 || normalized.length > 32) {
    throw new AppError('Teléfono inválido', 400);
  }
  return normalized;
};

const emitContactUpdated = async (contact) => {
  if (!contact) return;
  const payload = {
    phoneNormalized: contact.phoneNormalized,
    displayName: contact.displayName || null,
    avatarRef: contact.avatarRef || null,
    updatedAt: contact.updatedAt || new Date().toISOString()
  };
  // Roles con acceso operativo
  emitToRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENTE], 'contact.updated', payload);
};

export const getContactByPhoneService = async ({ phone }, user) => {
  const phoneNormalized = normalizePhoneOrFail(phone);
  const tenantId = await resolveTenantId(user?.id || null);
  const contact = await getContactByPhone({ phoneNormalized, tenantId });
  return (
    contact || {
      phoneNormalized,
      displayName: null,
      avatarRef: null,
      metadata: null,
      createdAt: null,
      updatedAt: null
    }
  );
};

export const upsertContactService = async ({ phone, displayName, avatarRef, metadata }, user, { ip = null, userAgent = null } = {}) => {
  const phoneNormalized = normalizePhoneOrFail(phone);
  const cleanDisplayName = sanitizeDisplayName(displayName);
  const cleanAvatarRef = sanitizeAvatarRef(avatarRef);
  const cleanMetadata = sanitizeMetadata(metadata);
  const tenantId = await resolveTenantId(user?.id || null);

  const contact = await upsertContact({
    phoneNormalized,
    displayName: cleanDisplayName === undefined ? null : cleanDisplayName,
    avatarRef: cleanAvatarRef,
    metadata: cleanMetadata,
    tenantId
  });

  await recordAuditLog({
    userId: user?.id || null,
    action: 'contact_upsert',
    resource: 'contact',
    resourceId: contact?.id || null,
    ip,
    userAgent,
    metadata: { phoneNormalized, displayName: cleanDisplayName ?? null }
  }).catch(() => {});

  await emitContactUpdated(contact);

  return contact;
};

export const findContactsByPhonesService = async ({ phones = [] }, user) => {
  const tenantId = await resolveTenantId(user?.id || null);
  const normalized = Array.from(new Set((phones || []).map(normalizePhoneNumber).filter((p) => p && p.length >= 6 && p.length <= 32)));
  if (!normalized.length) return [];
  return findContactsByPhones({ phoneNumbers: normalized, tenantId });
};
