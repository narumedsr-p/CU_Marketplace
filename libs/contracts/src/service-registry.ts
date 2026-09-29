export type ServiceName =
  | 'catalog'
  | 'order'
  | 'chat'
  | 'wishlist'
  | 'review'
  | 'profile'
  | 'notification';

interface ServicePorts {
  http: number;
  grpc?: number;
}

// Single source of truth for the local-dev port convention (HTTP port + 1000 = gRPC
// port). Every client used to duplicate these numbers as a `process.env.X_SERVICE_URL
// || 'http://localhost:PORT'` fallback — this registry replaces that repetition.
// For real deployments where services live on separate hosts, set `<SERVICE>_SERVICE_HOST`
// (e.g. `CATALOG_SERVICE_HOST=catalog-service.internal`) to override just the hostname;
// the port convention below still applies.
export const SERVICE_PORTS: Record<ServiceName, ServicePorts> = {
  catalog: { http: 3001, grpc: 4001 },
  order: { http: 3002, grpc: 4002 },
  chat: { http: 3003, grpc: 4003 },
  review: { http: 3005 },
  profile: { http: 3006, grpc: 4006 },
  wishlist: { http: 3004 },
  notification: { http: 3007 },
};

function hostFor(service: ServiceName): string {
  return process.env[`${service.toUpperCase()}_SERVICE_HOST`] ?? 'localhost';
}

export function getServiceHttpUrl(service: ServiceName): string {
  return `http://${hostFor(service)}:${SERVICE_PORTS[service].http}`;
}

export function getServiceGrpcUrl(service: ServiceName): string {
  const port = SERVICE_PORTS[service].grpc;
  if (!port) {
    throw new Error(`Service "${service}" has no gRPC port configured`);
  }
  return `${hostFor(service)}:${port}`;
}

export function getRabbitMqUrl(): string {
  return process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
}

export const QUEUES = {
  notification: 'notification_queue',
  catalogItemStatus: 'catalog_item_status_queue',
  catalogItemStatusRetry: 'catalog_item_status_retry_queue',
  catalogItemStatusDlq: 'catalog_item_status_dlq',
  wishlistEvaluate: 'wishlist_evaluate_queue',
  wishlistEvaluateRetry: 'wishlist_evaluate_retry_queue',
  wishlistEvaluateDlq: 'wishlist_evaluate_dlq',
} as const;

// Shared shape for any main queue backed by a retry-queue-plus-DLQ topology (TTL+DLX
// delay pattern — see catalog-item-status.rmq.controller.ts for the full writeup).
// Producer and consumer of a given main queue must both use this with the same
// `retryQueue`, or RabbitMQ throws a channel-level PRECONDITION_FAILED error when their
// assertQueue calls disagree on arguments.
export function getRetryableQueueOptions(retryQueue: string) {
  return {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': retryQueue,
    },
  };
}
