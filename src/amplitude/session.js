// Runs only inside an authorized Amplitude tab via chrome.scripting (MAIN world).
// Only the signed-in account, metadata, and the selected target's assignments leave the tab.
export async function amplitudeSession(action, args = {}) {
  try {
    if (
      !["app.amplitude.com", "app.eu.amplitude.com"].includes(location.hostname)
    )
      throw Error("Open Amplitude Experiment.");
    const org = window.__SHARED_GLOBAL_STORE?.get()?.org;
    if (action === "probe") {
      const signedIn = Boolean(
        org?.isLoggedIn &&
          typeof org.user === "string" &&
          org.user &&
          /^\d+$/.test(String(org.orgId)),
      );
      const ready =
        signedIn &&
        Object.values(
          window.__activeAppStore?.[0]?.getState()?.entities?.apps || {},
        ).some((p) => /^\d+$/.test(String(p.id)));
      return { ok: true, ready, signedIn };
    }
    if (
      !org?.isLoggedIn ||
      typeof org.user !== "string" ||
      !org.user ||
      !/^\d+$/.test(String(org.orgId))
    )
      throw Error("Sign in to Amplitude and wait for the page to load.");
    const user = org.user,
      orgId = String(org.orgId);
    const apps = Object.values(
      window.__activeAppStore?.[0]?.getState()?.entities?.apps || {},
    ).filter((p) => /^\d+$/.test(String(p.id)));
    if (!apps.length)
      throw Error("Open Experiment: the project list has not loaded yet.");
    const context = {
      user,
      orgId,
      orgUrl: org.orgUrl,
      origin: location.origin,
    };
    if (args.user && (args.user !== user || args.orgId !== orgId))
      throw Error("Account or organization changed. Reconnect.");
    async function gql(query, variables) {
      if (
        window.__SHARED_GLOBAL_STORE?.get()?.org?.user !== user ||
        String(window.__SHARED_GLOBAL_STORE?.get()?.org?.orgId) !== orgId
      )
        throw Error("Session changed.");
      const response = await fetch("/fed/graphql/org/" + orgId, {
        method: "POST",
        credentials: "same-origin",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw Error(
          `Amplitude: HTTP ${response.status}. Refresh before trying again.`,
        );
      const result = await response.json();
      if (result.errors?.length)
        throw Error(result.errors.map((e) => e.message).join("; "));
      if (!result.data) throw Error("Unexpected response from Amplitude.");
      return result.data;
    }
    function mapOf(flag) {
      const map = flag?.inclusionsMap;
      // Amplitude returns null for configurations without individual testers.
      if (map === null) return {};
      if (
        !map ||
        Array.isArray(map) ||
        typeof map !== "object" ||
        !Object.values(map).every(
          (ids) =>
            Array.isArray(ids) && ids.every((id) => typeof id === "string"),
        )
      )
        throw Error("Unexpected Testing Assignments format.");
      return map;
    }
    function variantsOf(flag) {
      const variants = (flag.variants || [])
        .filter((v) => typeof v.key === "string" && v.key)
        .map((v) => ({ key: v.key, name: v.name || v.key }));
      // Amplitude exposes OFF in Testing even when it is not a regular variant.
      if (!variants.some((v) => v.key === "off"))
        variants.unshift({ key: "off", name: "Off" });
      return variants;
    }
    if (action === "connect") {
      const projects = [],
        failures = [];
      for (const app of apps) {
        try {
          const { deployments } = await gql(
            "query($projectId: ID!, $appId: Int) { deployments: apiKeysByProject(projectId: $projectId, appId: $appId) { id label } }",
            { projectId: String(app.id), appId: Number(app.id) },
          );
          if (!Array.isArray(deployments))
            throw Error("Unexpected deployments format.");
          if (deployments.length)
            projects.push({ id: String(app.id), name: app.name, deployments });
        } catch (error) {
          failures.push(`${app.name}: ${error.message}`);
        }
      }
      return { ok: true, ...context, projects, failures };
    }
    const project = String(args.project || "");
    if (!apps.some((p) => String(p.id) === project))
      throw Error("Project is not available to this account.");
    // Keep the session actor separate from the explicitly selected testing IDs.
    const requested = args.targets === undefined ? [user] : args.targets;
    if (
      !Array.isArray(requested) ||
      !requested.length ||
      requested.length > 20 ||
      requested.some(
        (id) =>
          typeof id !== "string" ||
          !id.length ||
          id.length > 1024 ||
          /[\s,;\u0000-\u001f\u007f]/u.test(id),
      )
    )
      throw Error(
        "Select 1–20 exact email or user/device IDs, without spaces.",
      );
    const targets = [...new Set(requested)];
    // A mutation always addresses one visible identity, never an implicit bulk edit.
    const target =
      args.target === undefined && targets.length === 1
        ? targets[0]
        : args.target;
    if (
      (action === "assign" || action === "remove") &&
      !targets.includes(target)
    )
      throw Error("Choose one of the selected testing IDs before saving.");
    const fields =
      "id projectId key name type deleted version inclusionsMap variants { key name } apiKeys { id label }";
    if (action === "scan") {
      const { flags } = await gql(
        `query($projectId: ID!, $appId: Int) { flags: flagConfigsInEnv(projectId: $projectId, appId: $appId, withDeleted: false) { ${fields} } }`,
        { projectId: project, appId: Number(project) },
      );
      if (!Array.isArray(flags)) throw Error("Could not load experiments.");
      const assignments = [],
        catalog = [],
        failures = [];
      for (const flag of flags) {
        if (flag.deleted) continue;
        try {
          if (String(flag.projectId) !== project)
            throw Error("Project does not match.");
          const map = mapOf(flag);
          const variants = Object.entries(map)
            .filter(([, ids]) => targets.some((id) => ids.includes(id)))
            .map(([key]) => ({
              key,
              name: flag.variants?.find((v) => v.key === key)?.name || key,
            }));
          const availableVariants = variantsOf(flag);
          const item = {
            id: String(flag.id),
            name: flag.name || flag.key,
            key: flag.key,
            type: flag.type,
            variants,
            availableVariants,
            memberships: targets.map((target) => ({
              target,
              variants: Object.entries(map)
                .filter(([, ids]) => ids.includes(target))
                .map(([key]) => ({
                  key,
                  name: flag.variants?.find((v) => v.key === key)?.name || key,
                })),
            })),
            deployments: (flag.apiKeys || []).map((d) => d.label),
          };
          catalog.push(item);
          if (variants.length) assignments.push(item);
        } catch (error) {
          failures.push(`${flag.name || flag.id}: ${error.message}`);
        }
      }
      return {
        ok: true,
        ...context,
        assignments,
        catalog,
        failures,
        checked: flags.length,
      };
    }
    if (action === "remove" || action === "assign") {
      if (
        !args.user ||
        args.user !== user ||
        args.orgId !== orgId ||
        !/^\d+$/.test(String(args.id))
      )
        throw Error("Account or configuration could not be verified.");
      const read = async () =>
        (
          await gql(`query($id: ID!) { flagConfig(id: $id) { ${fields} } }`, {
            id: String(args.id),
          })
        ).flagConfig;
      const flag = await read();
      if (
        String(flag?.projectId) !== project ||
        flag.deleted ||
        !Number.isInteger(flag.version)
      )
        throw Error(
          "Configuration changed or is unavailable. Refresh the list.",
        );
      const before = mapOf(flag);
      if (
        action === "assign" &&
        (typeof args.variant !== "string" ||
          !variantsOf(flag).some((v) => v.key === args.variant))
      )
        throw Error("Variant is no longer available. Refresh the list.");
      if (
        action === "remove" &&
        !Object.values(before).some((ids) => ids.includes(target))
      )
        return { ok: true, removed: true };
      const after = Object.fromEntries(
        Object.entries(before).map(([key, ids]) => [
          key,
          ids.filter((id) => id !== target),
        ]),
      );
      if (action === "assign")
        Object.defineProperty(after, args.variant, {
          value: [
            ...(Object.hasOwn(after, args.variant) ? after[args.variant] : []),
            target,
          ],
          enumerable: true,
          writable: true,
          configurable: true,
        });
      // Match Amplitude's partial update: only inclusions and the current version.
      await gql(
        "mutation($id: ID!, $flagConfig: FlagConfigInput!) { updateFlagConfig(id: $id, flagConfig: $flagConfig) }",
        {
          id: String(flag.id),
          flagConfig: {
            version: flag.version,
            inclusionsMap: after,
            inclusions: Object.entries(after).map(([variantKey, values]) => ({
              variantKey,
              values,
            })),
          },
        },
      );
      const verified = await read();
      if (String(verified?.projectId) !== project || verified.deleted)
        throw Error(
          "Configuration unavailable after saving. Refresh the list.",
        );
      const memberships = Object.entries(mapOf(verified))
        .filter(([, ids]) => ids.includes(target))
        .map(([key]) => key);
      if (action === "assign") {
        if (memberships.length !== 1 || memberships[0] !== args.variant)
          throw Error("Assignment not confirmed. Refresh before retrying.");
        return { ok: true, assigned: true, variant: args.variant };
      }
      if (memberships.length)
        throw Error("Removal not confirmed. Refresh before retrying.");
      return { ok: true, removed: true };
    }
    throw Error("Unknown action.");
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Request failed. Refresh the list.",
    };
  }
}
