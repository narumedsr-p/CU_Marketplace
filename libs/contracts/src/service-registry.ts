export type ServiceName =
  | 'catalog'
  | 'order'
  | 'chat'
  | 'wishlist'
  | 'review'
  | 'moderation'
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
  wishlist: { http: 3004, grpc: 4004 },
  review: { http: 3005 },
  moderation: { http: 3006 },
  notification: { http: 3007, grpc: 4007 },
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
