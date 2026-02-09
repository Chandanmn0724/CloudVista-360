import { Alert, CloudProvider, MetricsSnapshot, OverviewSummary, ProviderSummary, ResourceMetric } from "../types";
import { generateInitialResources, updateResources } from "../data/mockProviders";

const ALL_PROVIDERS: CloudProvider[] = ["aws", "azure", "gcp", "onprem"];

let resources: ResourceMetric[] = generateInitialResources();
let alerts: Alert[] = [];
let lastSnapshot: MetricsSnapshot | null = null;

function safeAverage(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

function computeProviderSummary(provider: CloudProvider, allResources: ResourceMetric[]): ProviderSummary {
  const subset = allResources.filter((r) => r.provider === provider);
  const totalResources = subset.length;

  const healthy = subset.filter((r) => r.status === "healthy").length;
  const warning = subset.filter((r) => r.status === "warning").length;
  const critical = subset.filter((r) => r.status === "critical").length;

  const avgCpu = safeAverage(subset.map((r) => r.cpuUtilization));
  const avgMemory = safeAverage(subset.map((r) => r.memoryUtilization));
  const avgUptime = safeAverage(subset.map((r) => r.uptimePercent));
  const avgLatency = safeAverage(subset.map((r) => r.networkLatencyMs));

  const healthScoreBase = avgUptime * 0.5 + (100 - avgCpu) * 0.15 + (100 - avgMemory) * 0.15 + (200 - Math.min(avgLatency, 200)) * 0.2;
  const incidentPenalty = critical * 2 + warning;
  const healthScore = Math.max(0, Math.min(100, healthScoreBase - incidentPenalty));

  const displayNameMap: Record<CloudProvider, string> = {
    aws: "Amazon Web Services",
    azure: "Microsoft Azure",
    gcp: "Google Cloud Platform",
    onprem: "On-Premise",
  };

  return {
    provider,
    displayName: displayNameMap[provider],
    totalResources,
    healthy,
    warning,
    critical,
    avgCpu,
    avgMemory,
    avgUptime,
    avgLatency,
    healthScore,
  };
}

function computeOverview(allResources: ResourceMetric[], providerSummaries: ProviderSummary[]): OverviewSummary {
  const totalProviders = providerSummaries.length;
  const totalResources = allResources.length;

  const healthy = allResources.filter((r) => r.status === "healthy").length;
  const warning = allResources.filter((r) => r.status === "warning").length;
  const critical = allResources.filter((r) => r.status === "critical").length;

  const overallUptime = safeAverage(allResources.map((r) => r.uptimePercent));
  const avgCpu = safeAverage(allResources.map((r) => r.cpuUtilization));
  const avgMemory = safeAverage(allResources.map((r) => r.memoryUtilization));
  const avgLatency = safeAverage(allResources.map((r) => r.networkLatencyMs));

  const avgProviderScore = safeAverage(providerSummaries.map((p) => p.healthScore));
  const globalHealthScore = Math.max(0, Math.min(100, avgProviderScore));

  const activeAlerts = alerts.length;

  return {
    totalProviders,
    totalResources,
    healthy,
    warning,
    critical,
    overallUptime,
    avgCpu,
    avgMemory,
    avgLatency,
    activeAlerts,
    globalHealthScore,
  };
}

function computeSnapshot(): MetricsSnapshot {
  const providerSummaries = ALL_PROVIDERS.map((p) => computeProviderSummary(p, resources));
  const overview = computeOverview(resources, providerSummaries);

  return {
    timestamp: new Date().toISOString(),
    overview,
    providers: providerSummaries,
    resources,
    alerts,
  };
}

export function getCurrentSnapshot(): MetricsSnapshot {
  if (!lastSnapshot) {
    lastSnapshot = computeSnapshot();
  }
  return lastSnapshot;
}

export function advanceAndGetSnapshot(): MetricsSnapshot {
  const { resources: nextResources, newAlerts } = updateResources(resources);
  resources = nextResources;
  alerts = [...newAlerts, ...alerts].slice(0, 100);
  lastSnapshot = computeSnapshot();
  return lastSnapshot;
}

export function getAlerts(): Alert[] {
  return alerts;
}
