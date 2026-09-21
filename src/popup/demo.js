const variant = (key, name) => ({ key, name });

/** Fictional, in-memory data. Never sent to Amplitude. */
export function createDemo() {
  const projects = [
    { id: "demo-dev", name: "Development" },
    { id: "demo-prod", name: "Production" },
  ];
  const catalog = [
    {
      id: "demo-1",
      name: "New checkout experience",
      key: "checkout-v2",
      type: "experiment",
      deployments: ["web"],
      variants: [variant("one-page", "One-page checkout")],
      availableVariants: [
        variant("off", "Off"),
        variant("classic", "Classic"),
        variant("one-page", "One-page checkout"),
        variant("express", "Express"),
      ],
    },
    {
      id: "demo-2",
      name: "Smart search",
      key: "smart-search",
      type: "release",
      deployments: ["web", "server"],
      variants: [variant("on", "Enabled")],
      availableVariants: [variant("off", "Off"), variant("on", "Enabled")],
    },
    {
      id: "demo-3",
      name: "Workspace navigation",
      key: "workspace-nav",
      type: "experiment",
      deployments: ["web"],
      variants: [],
      availableVariants: [
        variant("off", "Off"),
        variant("sidebar", "Sidebar"),
        variant("compact", "Compact"),
      ],
    },
    {
      id: "demo-4",
      name: "Document summaries",
      key: "document-summaries",
      type: "release",
      deployments: ["server"],
      variants: [],
      availableVariants: [variant("off", "Off"), variant("on", "Enabled")],
    },
  ];

  const assignments = new Map();
  const defaults = {
    "alex@example.com": { "demo-1": "one-page", "demo-2": "on" },
    "alex+checkout@example.com": { "demo-1": "classic", "demo-3": "compact" },
    "demo-device-01": { "demo-4": "on" },
  };
  function forTarget(project, target) {
    const id = JSON.stringify([project, target]);
    if (!assignments.has(id))
      assignments.set(
        id,
        project === "demo-dev" ? { ...(defaults[target] || {}) } : {},
      );
    return assignments.get(id);
  }

  return {
    account: {
      user: "alex@example.com",
      orgId: "demo",
      orgUrl: "Example workspace",
      projects,
    },
    scan(project, targets = ["alex@example.com"]) {
      return {
        catalog: catalog.map((item) => {
          const memberships = targets.map((target) => ({
            target,
            variants: item.availableVariants.filter(
              (v) => v.key === forTarget(project, target)[item.id],
            ),
          }));
          const keys = new Set(
            memberships.flatMap((m) => m.variants.map((v) => v.key)),
          );
          return {
            ...structuredClone(item),
            memberships,
            variants: item.availableVariants.filter((v) => keys.has(v.key)),
          };
        }),
        failures: [],
      };
    },
    change(project, id, key, target) {
      const item = catalog.find((entry) => entry.id === id);
      if (
        !item ||
        (key !== null && !item.availableVariants.some((v) => v.key === key))
      )
        throw Error("Variant is no longer available.");
      const assignments = forTarget(project, target);
      if (key === null) delete assignments[id];
      else assignments[id] = key;
    },
  };
}
