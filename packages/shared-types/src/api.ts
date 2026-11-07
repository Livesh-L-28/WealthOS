/**
 * Standard API Request & Response Envelope Types
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ResponseMetadata {
  timestamp: string;
  request_id?: string;
  tenant_id?: string;
  pagination?: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  timestamp: string;
  uptime_seconds?: number;
  dependencies: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency_ms?: number;
      message?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      latency_ms?: number;
      message?: string;
    };
    storage: {
      status: 'healthy' | 'unhealthy';
      latency_ms?: number;
      message?: string;
    };
  };
}

