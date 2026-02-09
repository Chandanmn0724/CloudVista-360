import { Alert, AlertSeverity, AlertType, CloudProvider, ResourceMetric, Status } from "../types";

const PROVIDERS: { id: CloudProvider; name: string; regions: string[]; prefix: string }[] = [
  {
    id: "aws",
    name: "Amazon Web Services",
    regions: ["us-east-1", "eu-west-1", "ap-south-1"],
    prefix: "AWS",
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    regions: ["eastus", "westeurope", "centralindia"],
    prefix: "AZ",
  },
  {
    id: "gcp",
    name: "Google Cloud Platform",
    regions: ["us-central1", "europe-west1", "asia-south1"],
    prefix: "GCP",
  },
  {
    id: "onprem",
    name: "On-Premise",
    regions: ["dc-1", "dc-2"],
    prefix: "DC",
  },
];

const RESOURCE_TEMPLATES: Record<CloudProvider, string[]> = {
  aws: ["App Server", "DB Cluster", "Cache Node", "API Gateway"],
  azure: ["Web App", "SQL Database", "Function App", "Redis Cache"],
  gcp: ["GKE Cluster", "Cloud SQL", "Memorystore", "Load Balancer"],
  onprem: ["VM Host", "Storage Array", "Firewall", "Legacy App"],
};

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeStatus(
  cpu: number,
  memory: number,
  latency: number,
  uptime: number,
  errorRate: number,
  securityIncidents: number
): Status {
  if (securityIncidents > 0 || uptime < 97 || cpu > 90 || memory > 90 || latency > 250 || errorRate > 3) {
    return "critical";
  }
  if (uptime < 99 || cpu > 75 || memory > 80 || latency > 180 || errorRate > 1.5) {
    return "warning";
  }
  return "healthy";
}

let alertCounter = 0;

function buildAlert(metric: ResourceMetric, type: AlertType, severity: AlertSeverity, message: string): Alert {
  alertCounter += 1;
  return {
    id: `alert-${alertCounter}`,
    provider: metric.provider,
    resourceId: metric.id,
    resourceName: metric.name,
    type,
    severity,
    message,
    timestamp: new Date().toISOString(),
  };
}

function evaluateAlerts(metric: ResourceMetric): Alert[] {
  const alerts: Alert[] = [];

  if (metric.uptimePercent < 99) {
    alerts.push(
      buildAlert(
        metric,
        "availability",
        metric.uptimePercent < 97 ? "critical" : "medium",
        `Uptime dropped to ${metric.uptimePercent.toFixed(2)}%`
      )
    );
  }

  if (metric.cpuUtilization > 80 || metric.memoryUtilization > 85) {
    alerts.push(
      buildAlert(
        metric,
        "performance",
        metric.cpuUtilization > 92 || metric.memoryUtilization > 92 ? "high" : "medium",
        `High utilization: CPU ${metric.cpuUtilization.toFixed(0)}%, Memory ${metric.memoryUtilization.toFixed(0)}%`
      )
    );
  }

  if (metric.networkLatencyMs > 200 || metric.errorRate > 2) {
    alerts.push(
      buildAlert(
        metric,
        "error",
        metric.networkLatencyMs > 260 || metric.errorRate > 4 ? "high" : "medium",
        `Degraded network or errors: latency ${metric.networkLatencyMs.toFixed(0)} ms, errors ${metric.errorRate.toFixed(2)}%`
      )
    );
  }

  if (metric.securityIncidents > 0) {
    alerts.push(
      buildAlert(
        metric,
        "security",
        metric.securityIncidents > 2 ? "critical" : "high",
        `${metric.securityIncidents} potential security incidents detected`
      )
    );
  }

  return alerts;
}

export function generateInitialResources(): ResourceMetric[] {
  const resources: ResourceMetric[] = [];
  const now = new Date().toISOString();

  for (const provider of PROVIDERS) {
    const templates = RESOURCE_TEMPLATES[provider.id];
    let index = 1;

    for (const template of templates) {
      const count = provider.id === "onprem" ? 3 : 5;
      for (let i = 0; i < count; i += 1) {
        const cpu = randomInRange(20, 60);
        const memory = randomInRange(25, 65);
        const latency = randomInRange(40, 140);
        const uptime = randomInRange(99, 100);
        const errorRate = randomInRange(0, 1.2);
        const securityIncidents = 0;
        const status = computeStatus(cpu, memory, latency, uptime, errorRate, securityIncidents);

        const metric: ResourceMetric = {
          id: `${provider.id}-${index}`,
          name: `${provider.prefix} ${template} ${index}`,
          provider: provider.id,
          region: provider.regions[Math.floor(Math.random() * provider.regions.length)],
          uptimePercent: uptime,
          cpuUtilization: cpu,
          memoryUtilization: memory,
          networkLatencyMs: latency,
          networkThroughputMbps: randomInRange(80, 500),
          errorRate,
          securityIncidents,
          status,
          lastUpdated: now,
        };

        resources.push(metric);
        index += 1;
      }
    }
  }

  return resources;
}

export function updateResources(previous: ResourceMetric[]): { resources: ResourceMetric[]; newAlerts: Alert[] } {
  const now = new Date().toISOString();
  const newAlerts: Alert[] = [];

  const resources = previous.map((r) => {
    const cpu = clamp(r.cpuUtilization + randomInRange(-12, 12), 5, 99);
    const memory = clamp(r.memoryUtilization + randomInRange(-10, 10), 8, 99);
    const latency = clamp(r.networkLatencyMs + randomInRange(-40, 40), 20, 400);
    const throughput = clamp(r.networkThroughputMbps + randomInRange(-60, 60), 20, 800);
    const errorRate = clamp(r.errorRate + randomInRange(-0.8, 1.5), 0, 6);
    const uptime = clamp(r.uptimePercent + randomInRange(-0.25, 0.05), 95, 100);
    const securityIncidents = Math.random() < 0.015 ? r.securityIncidents + 1 : r.securityIncidents;

    const status = computeStatus(cpu, memory, latency, uptime, errorRate, securityIncidents);

    const updated: ResourceMetric = {
      ...r,
      cpuUtilization: cpu,
      memoryUtilization: memory,
      networkLatencyMs: latency,
      networkThroughputMbps: throughput,
      errorRate,
      uptimePercent: uptime,
      securityIncidents,
      status,
      lastUpdated: now,
    };

    const alertsForResource = evaluateAlerts(updated);
    if (alertsForResource.length > 0) {
      newAlerts.push(...alertsForResource);
    }

    return updated;
  });

  return { resources, newAlerts };
}
