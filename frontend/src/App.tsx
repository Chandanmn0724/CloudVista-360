import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import type {
  Alert,
  AlertSeverity,
  CloudProvider,
  MetricsSnapshot,
  ResourceMetric,
  Status,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatMs(value: number): string {
  return `${value.toFixed(0)} ms`;
}

function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
}

function severityColor(severity: AlertSeverity): string {
  if (severity === "critical") return "bg-rose-500/15 text-rose-300 border-rose-500/40";
  if (severity === "high") return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  if (severity === "medium") return "bg-sky-500/15 text-sky-300 border-sky-500/40";
  return "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";
}

function statusPillClasses(status: Status): string {
  if (status === "healthy") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";
  if (status === "warning") return "bg-amber-500/10 text-amber-300 border-amber-500/40";
  return "bg-rose-500/10 text-rose-300 border-rose-500/40";
}

const providerMeta: Record<CloudProvider, { label: string; short: string; color: string }> = {
  aws: { label: "Amazon Web Services", short: "AWS", color: "from-amber-400 to-orange-500" },
  azure: { label: "Microsoft Azure", short: "Azure", color: "from-sky-400 to-blue-500" },
  gcp: { label: "Google Cloud Platform", short: "GCP", color: "from-emerald-400 to-lime-500" },
  onprem: { label: "On-Premise", short: "On-Prem", color: "from-fuchsia-400 to-rose-500" },
};

function filterResources(
  resources: ResourceMetric[],
  providerFilter: CloudProvider | "all",
  statusFilter: Status | "all"
): ResourceMetric[] {
  return resources.filter((r) => {
    if (providerFilter !== "all" && r.provider !== providerFilter) {
      return false;
    }
    if (statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }
    return true;
  });
}

function App() {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<CloudProvider | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/snapshot`)
      .then((res) => res.json())
      .then((data: MetricsSnapshot) => {
        if (isMounted) {
          setSnapshot(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Unable to reach CloudPulse backend. Is it running on port 4000?");
          setLoading(false);
        }
      });

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("metrics_update", (data: MetricsSnapshot) => {
      if (isMounted) {
        setSnapshot(data);
      }
    });

    socket.on("connect_error", () => {
      if (isMounted) {
        setError("Live updates unavailable. Falling back to last known snapshot.");
      }
    });

    return () => {
      isMounted = false;
      socket.close();
    };
  }, []);

  const overview = snapshot?.overview;
  const providers = snapshot?.providers ?? [];
  const alerts = snapshot?.alerts ?? [];
  const resources = snapshot?.resources ?? [];

  const filteredResources = useMemo(
    () => filterResources(resources, providerFilter, statusFilter),
    [resources, providerFilter, statusFilter]
  );

  const criticalAlerts = alerts.filter((a) => a.severity === "critical" || a.severity === "high");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-emerald-400 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/40">
              CP
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">CloudPulse Monitor</div>
              <div className="text-xs text-slate-400">Unified real-time health across AWS, Azure, GCP, and on-prem</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live feed
            </span>
            {snapshot && (
              <span>
                Last update: <span className="text-slate-200">{new Date(snapshot.timestamp).toLocaleTimeString()}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {error && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-lg shadow-sky-500/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Global health</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <div className="text-3xl font-semibold text-slate-50">
                    {overview ? overview.globalHealthScore.toFixed(0) : "-"}
                  </div>
                  <div className="text-xs text-slate-400">/ 100</div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>{overview ? `${overview.totalResources} resources` : ""}</div>
                <div>{overview ? `${overview.totalProviders} providers` : ""}</div>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-400"
                style={{ width: `${overview ? overview.globalHealthScore : 0}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-300">
              <div>
                <div className="text-slate-400">Overall uptime</div>
                <div className="mt-1 text-sm font-medium">{overview ? formatPercent(overview.overallUptime) : "-"}</div>
              </div>
              <div>
                <div className="text-slate-400">Avg CPU</div>
                <div className="mt-1 text-sm font-medium">{overview ? formatPercent(overview.avgCpu) : "-"}</div>
              </div>
              <div>
                <div className="text-slate-400">Avg latency</div>
                <div className="mt-1 text-sm font-medium">{overview ? formatMs(overview.avgLatency) : "-"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Resource health</div>
            <div className="mt-3 flex items-end justify-between">
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">Healthy</span>
                  <span className="text-emerald-300">
                    {overview ? formatNumber(overview.healthy) : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">Warning</span>
                  <span className="text-amber-300">
                    {overview ? formatNumber(overview.warning) : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">Critical</span>
                  <span className="text-rose-300">
                    {overview ? formatNumber(overview.critical) : "-"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-900 text-[0]">
              {overview && overview.totalResources > 0 && (
                <>
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${(overview.healthy / overview.totalResources) * 100}%` }}
                  />
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${(overview.warning / overview.totalResources) * 100}%` }}
                  />
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${(overview.critical / overview.totalResources) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Active alerts</div>
                <div className="mt-2 text-2xl font-semibold text-slate-50">
                  {overview ? overview.activeAlerts : "-"}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <div>Critical and high alerts appear in the right-hand feed.</div>
              <div className="text-slate-500">Use this to drive incident response and triage.</div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-200">Provider health</h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Healthy</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-600/70 bg-slate-900/60 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Warning</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-rose-600/70 bg-slate-900/60 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>Critical</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {providers.map((p) => {
                const meta = providerMeta[p.provider];
                return (
                  <button
                    key={p.provider}
                    type="button"
                    onClick={() =>
                      setProviderFilter((current) => (current === p.provider ? "all" : p.provider))
                    }
                    className={`group rounded-2xl border bg-slate-950/70 p-3 text-left text-xs transition hover:border-sky-500/60 hover:bg-slate-900/80 ${
                      providerFilter === p.provider ? "border-sky-500/70" : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr ${meta.color} text-[10px] font-semibold text-slate-950`}
                        >
                          {meta.short}
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-slate-200">{meta.label}</div>
                          <div className="text-[11px] text-slate-500">
                            {p.totalResources} resources
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">Health score</div>
                        <div className="text-sm font-semibold text-slate-50">
                          {p.healthScore.toFixed(0)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${(p.healthy / p.totalResources || 0) * 100}%` }}
                      />
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${(p.warning / p.totalResources || 0) * 100}%` }}
                      />
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${(p.critical / p.totalResources || 0) * 100}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-wide text-slate-200">Resources</h2>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Provider:</span>
                    <select
                      value={providerFilter}
                      onChange={(e) => setProviderFilter(e.target.value as CloudProvider | "all")}
                      className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                    >
                      <option value="all">All</option>
                      <option value="aws">AWS</option>
                      <option value="azure">Azure</option>
                      <option value="gcp">GCP</option>
                      <option value="onprem">On-Premise</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
                      className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                    >
                      <option value="all">All</option>
                      <option value="healthy">Healthy</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
                <div className="max-h-80 overflow-auto text-xs">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Resource</th>
                        <th className="px-3 py-2 text-left">Provider</th>
                        <th className="px-3 py-2 text-right">CPU</th>
                        <th className="px-3 py-2 text-right">Memory</th>
                        <th className="px-3 py-2 text-right">Uptime</th>
                        <th className="px-3 py-2 text-right">Latency</th>
                        <th className="px-3 py-2 text-right">Errors</th>
                        <th className="px-3 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/80">
                      {loading && (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                            Loading resource metrics a0 b7 a0please wait...
                          </td>
                        </tr>
                      )}
                      {!loading && filteredResources.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                            No resources match the selected filters.
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        filteredResources.slice(0, 80).map((r) => {
                          const meta = providerMeta[r.provider];
                          return (
                            <tr key={r.id} className="hover:bg-slate-900/70">
                              <td className="whitespace-nowrap px-3 py-2">
                                <div className="font-medium text-slate-100">{r.name}</div>
                                <div className="text-[11px] text-slate-500">Region: {r.region}</div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] text-slate-300">
                                  {meta.short}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-slate-100">
                                {formatPercent(r.cpuUtilization)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-slate-100">
                                {formatPercent(r.memoryUtilization)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-slate-100">
                                {formatPercent(r.uptimePercent)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-slate-100">
                                {formatMs(r.networkLatencyMs)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-slate-100">
                                {r.errorRate.toFixed(2)}%
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${statusPillClasses(
                                    r.status
                                  )}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="capitalize">{r.status}</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <h2 className="text-sm font-semibold tracking-wide text-slate-200">Critical alerts</h2>
              <p className="mt-1 text-xs text-slate-400">
                High and critical incidents across all providers, updated in real time.
              </p>

              <div className="mt-4 space-y-2 max-h-80 overflow-auto pr-1 text-xs">
                {criticalAlerts.length === 0 && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                    No critical alerts at the moment. All platforms look healthy.
                  </div>
                )}
                {criticalAlerts.map((alert) => {
                  const meta = providerMeta[alert.provider];
                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl border px-3 py-2 ${severityColor(alert.severity)}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold">
                            {meta.short}
                          </span>
                          <span className="text-[11px] font-medium text-slate-50">
                            {alert.resourceName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-300">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-100">{alert.message}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
              <h3 className="text-sm font-semibold text-slate-200">How to read this dashboard</h3>
              <ul className="mt-3 space-y-1 list-disc pl-4 text-[11px] text-slate-400">
                <li>Use the global health score to track overall multi-cloud posture.</li>
                <li>Provider cards show per-cloud health and the mix of healthy vs. at-risk resources.</li>
                <li>Filter the resources table by provider and status when triaging incidents.</li>
                <li>Critical alerts guide you to the most urgent failures and security issues.</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default App;
