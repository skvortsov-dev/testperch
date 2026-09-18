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

  return {
    account: {
      user: "alex@example.com",
      orgId: "demo",
      orgUrl: "Example workspace",
      projects,
    },
    scan(project) {
      return {
        catalog: project === "demo-dev" ? structuredClone(catalog) : [],
        failures: [],
      };
    },
    change(id, key) {
      const item = catalog.find((entry) => entry.id === id);
      item.variants = key
        ? item.availableVariants.filter((entry) => entry.key === key)
        : [];
    },
  };
}
