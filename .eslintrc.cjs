module.exports = {
  root: true,
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { "import/resolver": { node: { extensions: [".js", ".ts", ".tsx"] } } },
  rules: { "import/order": ["warn", { "newlines-between": "always" }] }
};
