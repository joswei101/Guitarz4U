/** An error whose message is safe to show to the user. Anything else is reported generically. */
export class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "UserError";
  }
}

export class AuthError extends UserError {
  constructor(message = "Please sign in to continue.") {
    super(message, 401);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends UserError {
  constructor(message = "You do not have permission to do that.") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
