export class AppError extends Error {
  constructor(message, status = 500, details = null, code = null) {
    super(message);
    this.status = status;
    this.details = details;
    if (code) {
      this.code = code;
    }
  }
}
