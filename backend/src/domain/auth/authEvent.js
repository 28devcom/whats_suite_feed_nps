export default class AuthEvent {
  constructor({ userId, eventType, success, ip, userAgent, createdAt = new Date() }) {
    this.userId = userId;
    this.eventType = eventType;
    this.success = success;
    this.ip = ip;
    this.userAgent = userAgent;
    this.createdAt = createdAt;
  }
}
