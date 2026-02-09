export type CloudProvider = "aws" | "azure" | "gcp" | "onprem";

export type Status = "healthy" | "warning" | "critical";

export interface ResourceMetric {
  id: string;
  name: string;
  provider: CloudProvider;
  region: string;
  uptimePercent: number;
  cpuUtilization: number;
  memoryUtilization: number;
  networkLatencyMs: number;
  networkThroughputMbps: number;
  errorRate: number;
  securityIncidents: number;
  status: Status;
  lastUpdated: string;
}

export interface ProviderSummary {
  provider: CloudProvider;
  displayName: string;
  totalResources: number;
  healthy: number;
  warning: number;
  critical: number;
  avgCpu: number;
  avgMemory: number;
  avgUptime: number;
  avgLatency: number;
  healthScore: number;
}

export interface OverviewSummary {
  totalProviders: number;
  totalResources: number;
  healthy: number;
  warning: number;
  critical: number;
  overallUptime: number;
  avgCpu: number;
  avgMemory: number;
  avgLatency: number;
  activeAlerts: number;
  globalHealthScore: number;
}

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertType = "availability" | "performance" | "error" | "security";

export interface Alert {
  id: string;
  provider: CloudProvider;
  resourceId: string;
  resourceName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
}

export interface MetricsSnapshot {
  timestamp: string;
  overview: OverviewSummary;
  providers: ProviderSummary[];
  resources: ResourceMetric[];
  alerts: Alert[];
}
