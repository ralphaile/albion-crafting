export default {
  forbidden: [
    {
      name: "core-stays-pure",
      severity: "error",
      from: { path: "^packages/core/src/", pathNot: "\\.test\\.tsx?$" },
      to: { pathNot: "^packages/core/src/" },
    },
    {
      name: "no-app-to-app",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: { path: "^apps/", pathNot: "^apps/$1/" },
    },
    {
      name: "no-deep-imports",
      severity: "error",
      from: {},
      to: { path: "^@aoc/[^/]+/.+", couldNotResolve: true },
    },
    {
      name: "no-relative-imports-across-workspaces",
      severity: "error",
      from: { path: "^(apps|packages)/([^/]+)/" },
      to: {
        path: "^(apps|packages)/",
        pathNot: "^$1/$2/",
        dependencyTypes: ["local"],
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, pathNot: "^@aoc/[^/]+/.+" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "/(dist|coverage)/" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["@aoc/source", "import", "require", "node", "default"],
    },
  },
};
