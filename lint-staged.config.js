const workspaceCode = "{apps,packages}/**/*.{js,mjs,cjs,ts,tsx}";

export default {
  [workspaceCode]: [
    "eslint --fix --max-warnings 0 --no-warn-ignored",
    "prettier --write",
  ],
  [`!(${workspaceCode})`]: "prettier --write --ignore-unknown",
};
