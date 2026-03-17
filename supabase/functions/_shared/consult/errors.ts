export class BaseConsultError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status: number = 400,
    public context?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toResponse() {
    return new Response(
      JSON.stringify({
        error: {
          code: this.code,
          message: this.message,
          // Context is filtered in production to prevent leakage
        },
      }),
      {
        status: this.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      }
    );
  }
}

export class AuthRequiredError extends BaseConsultError {
  constructor() {
    super('AUTH_REQUIRED', 'Authentication is required to access this resource.', 401);
  }
}

export class TenantResolutionError extends BaseConsultError {
  constructor(context?: any) {
    super('TENANT_RESOLUTION_FAILED', 'Could not resolve tenant from request context.', 403, context);
  }
}

export class InvalidRequestError extends BaseConsultError {
  constructor(message: string, context?: any) {
    super('INVALID_REQUEST', message, 400, context);
  }
}

export class ToolNotAllowedError extends BaseConsultError {
  constructor(toolName: string) {
    super('TOOL_NOT_ALLOWED', `Tool '${toolName}' is not in the allow-list for this mode.`, 403);
  }
}

export class ToolExecutionError extends BaseConsultError {
  constructor(toolName: string, message: string, context?: any) {
    super('TOOL_EXECUTION_FAILED', `Error executing tool '${toolName}': ${message}`, 500, context);
  }
}

export class InsufficientEvidenceError extends BaseConsultError {
  constructor(message: string = 'Insufficient evidence gathered to provide a high-confidence answer.') {
    super('INSUFFICIENT_EVIDENCE', message, 422);
  }
}

export class ResponseSchemaInvalidError extends BaseConsultError {
  constructor(message: string, context?: any) {
    super('RESPONSE_SCHEMA_INVALID', `Provider returned an invalid response schema: ${message}`, 422, context);
  }
}

export class ProviderMockError extends BaseConsultError {
  constructor(message: string) {
    super('PROVIDER_MOCK_ERROR', `Internal mock provider error: ${message}`, 500);
  }
}

export class EvidenceStaleError extends BaseConsultError {
  constructor(bundleId: string) {
    super('EVIDENCE_STALE', `Evidence bundle '${bundleId}' is stale and cannot be used.`, 409);
  }
}

export class ProviderRateLimitError extends BaseConsultError {
  constructor(message: string = 'Provider rate limit exceeded. Please try again in a moment.', context?: any) {
    super('PROVIDER_RATE_LIMIT', message, 429, context);
  }
}

export class ProviderBudgetExceededError extends BaseConsultError {
  constructor(message: string = 'AI budget exceeded for this tenant. Please contact support.', context?: any) {
    super('BUDGET_EXCEEDED', message, 402, context);
  }
}

export class FeatureDisabledError extends BaseConsultError {
  constructor(message: string = 'AI features are not enabled for this tenant.', context?: any) {
    super('FEATURE_DISABLED', message, 403, context);
  }
}

export class ProviderModeDisabledError extends BaseConsultError {
  constructor(message: string = 'AI provider is set to disabled for this tenant.', context?: any) {
    super('PROVIDER_MODE_DISABLED', message, 403, context);
  }
}

export class PayloadTooLargeError extends BaseConsultError {
  constructor(message: string = 'AI request payload exceeds safety limit (100,000 bytes).') {
    super('PAYLOAD_TOO_LARGE', message, 413);
  }
}

export class ProviderOverloadError extends BaseConsultError {
  constructor(message: string = 'AI provider is currently overloaded. Please try again later.', context?: any) {
    super('PROVIDER_OVERLOAD', message, 503, context);
  }
}

export class ProviderTimeoutError extends BaseConsultError {
  constructor(message: string = 'The request to the AI provider timed out.', context?: any) {
    super('PROVIDER_TIMEOUT', message, 504, context);
  }
}

export class ProviderInternalError extends BaseConsultError {
  constructor(message: string = 'An internal error occurred while communicating with the AI provider.', context?: any) {
    super('PROVIDER_INTERNAL_ERROR', message, 500, context);
  }
}
