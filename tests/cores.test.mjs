// Core returns both ways (src/lib/cores.js): refunds we owe a supplier a core for get alerts before
// the deadline, customers' cores hold their deposits. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as Cor from "../src/lib/cores.js";

const T = "2026-10-27";
test("old records are a customer's core; the money is the deposit or the refund", () => {
  assert.equal(Cor.coreDir({ deposit: 500 }), "in");
  assert.equal(Cor.coreValue({ deposit: 500 }), 500);
  assert.equal(Cor.coreValue({ dir: "out", refund: 1800 }), 1800);
  assert.equal(Cor.coreValue({ dir: "out", deposit: 900 }), 900);
});
test("a refund is at risk within 7 days of its deadline until it ships", () => {
  const c = { dir: "out", refund: 1800, dueDate: "2026-11-02", status: "pending" };
  assert.equal(Cor.coreDaysLeft(c, T), 6);
  assert.equal(Cor.coreAtRisk(c, T), true);
  assert.equal(Cor.coreAtRisk({ ...c, dueDate: "2026-11-10" }, T), false);
  assert.equal(Cor.coreAtRisk({ ...c, dueDate: "2026-10-20" }, T), true);   // past: still worth a call
  assert.equal(Cor.coreAtRisk({ ...c, status: "sent" }, T), false);
  assert.equal(Cor.coreAtRisk({ ...c, dueDate: "" }, T), false);
  assert.equal(Cor.coreWhen(c, T), "due in 6 days");
  assert.equal(Cor.coreWhen({ ...c, dueDate: T }, T), "due today");
  assert.equal(Cor.coreWhen({ ...c, dueDate: "2026-10-26" }, T), "1 day past the deadline");
});
test("totals: refunds coming, deposits held, late customers; closed ones drop out", () => {
  const t = Cor.coreTotals([
    { dir: "out", refund: 1800, dueDate: "2026-11-01", status: "pending" },
    { dir: "out", refund: 1200, dueDate: "2026-12-01", status: "sent" },
    { dir: "out", refund: 5000, status: "credited" },
    { deposit: 700, dueDate: "2026-10-01", status: "pending" },
    { deposit: 300, status: "received" },
    { deposit: 999, status: "accepted" },
  ], T);
  assert.deepEqual(t, { refundsDue: 3000, refundsOpen: 2, atRisk: 1, atRiskUsd: 1800, depositsHeld: 1000, depositsOpen: 2, late: 1 });
});
