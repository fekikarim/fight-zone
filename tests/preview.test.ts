/* Headless tests for preview-mode allowlist (pure logic).
 * Run: npx tsx tests/preview.test.ts
 */
import { parsePreviewReturnTo } from "../lib/preview";

let pass = 0, fail = 0;
const check = (n: string, c: boolean) => {
  if (c) { pass++; console.log(`PASS  ${n}`); }
  else { fail++; console.log(`FAIL  ${n}`); }
};

check("events allowed", parsePreviewReturnTo("/events") === "/events");
check("news allowed", parsePreviewReturnTo("/news") === "/news");
check("subpath rejected", parsePreviewReturnTo("/events/abc") === "/events");
check("external rejected", parsePreviewReturnTo("https://evil.test") === "/events");
check("protocol-relative rejected", parsePreviewReturnTo("//evil.test") === "/events");
check("empty rejected", parsePreviewReturnTo("") === "/events");
check("null rejected", parsePreviewReturnTo(null) === "/events");
check("non-string rejected", parsePreviewReturnTo(42) === "/events");
check("admin area rejected", parsePreviewReturnTo("/admin") === "/events");
check("member area rejected", parsePreviewReturnTo("/member") === "/events");

console.log(`\nRESULT pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
