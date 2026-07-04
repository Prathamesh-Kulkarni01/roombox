import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-restricted-syntax": [
        "warn",
        {
          "selector": "NewExpression[callee.name='Date'][arguments.length=0]",
          "message": "Use FrameworkClock.now() instead of new Date() to ensure deterministic time in tests."
        },
        {
          "selector": "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          "message": "Use FrameworkClock.now().getTime() instead of Date.now() to ensure deterministic time in tests."
        }
      ],
      "no-undef": "warn",
      "no-redeclare": "warn",
      "no-empty": "warn",
      "no-dupe-class-members": "warn",
      "no-useless-escape": "warn"
    }
  }
];

export default config;
