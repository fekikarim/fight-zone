/* Headless tests for content-freshness seen-tracking (pure logic).
 * Run: npx tsx tests/content-freshness.test.ts
 */
import {
  getSeenSnapshot,
  hasUnseen,
  isNewer,
  markSeen,
  notifySeenChange,
  seenKey,
  subscribeSeenChange,
} from "../lib/content-freshness";

// Minimal localStorage stub (node has no window).
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
};

let pass = 0, fail = 0;
const check = (n: string, c: boolean) => {
  if (c) { pass++; console.log(`PASS  ${n}`); }
  else { fail++; console.log(`FAIL  ${n}`); }
};

check("seenKey per user+kind", seenKey("u1", "news") === "fz_seen:u1:news");
check("seenKey anon", seenKey(null, "events") === "fz_seen:anon:events");
check("seenKey isolates users", seenKey("u1", "news") !== seenKey("u2", "news"));

check("no candidate -> false", !isNewer(null, { id: "a", at: "2026-01-02" }));
check("nothing seen -> true", isNewer({ id: "a", at: "2026-01-02" }, null));
check("newer time -> true", isNewer({ id: "a", at: "2026-01-03" }, { id: "a", at: "2026-01-02" }));
check("older time -> false", !isNewer({ id: "a", at: "2026-01-01" }, { id: "a", at: "2026-01-02" }));
check("same time new id -> true", isNewer({ id: "b", at: "2026-01-02" }, { id: "a", at: "2026-01-02" }));
check("same marker -> false (no dupes)", !isNewer({ id: "a", at: "2026-01-02" }, { id: "a", at: "2026-01-02" }));

const L1 = { id: "n1", at: "2026-09-20T10:00:00Z" };
const L2 = { id: "n2", at: "2026-09-21T10:00:00Z" };
check("unseen before visit", hasUnseen("u1", "news", L1));
markSeen("u1", "news", L1);
check("seen after visit", !hasUnseen("u1", "news", L1));
check("reappears on new publish", hasUnseen("u1", "news", L2));
check("other feed unaffected", hasUnseen("u1", "events", L1));
check("other user unaffected", hasUnseen("u2", "news", L1));
markSeen("u1", "news", null);
check("markSeen null safe", !hasUnseen("u1", "news", L1));
markSeen("u1", "news", L1); // older than current seen? current is L1 already
check("re-mark same stays seen", !hasUnseen("u1", "news", L1));

// Corrupt storage entry degrades gracefully.
store.set(seenKey("u9", "news"), "not-json{{{");
check("corrupt entry -> unseen (safe)", hasUnseen("u9", "news", L1));

// External store: subscribe/notify/snapshot round-trip.
let notified = 0;
const unsub = subscribeSeenChange(() => {
  notified += 1;
});
markSeen("u7", "events", L2);
check("notify on markSeen", notified === 1);
check(
  "snapshot reflects write",
  getSeenSnapshot("u7", "events") === JSON.stringify(L2),
);
unsub();
markSeen("u7", "events", { id: "n3", at: "2026-09-22T10:00:00Z" });
check("unsub stops notifications", notified === 1);
check("empty snapshot when unseen", getSeenSnapshot("nobody", "news") === "");

// Direct notify (cross-tab path) reaches active listeners.
let direct = 0;
const unsub2 = subscribeSeenChange(() => {
  direct += 1;
});
notifySeenChange();
check("direct notify works", direct === 1);
unsub2();

console.log(`\nRESULT pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
