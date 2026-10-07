// Money: sales tax by province, due dates and overdue, expense frequency, the profit and loss and
// break-even. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/lib/money.js";

const TODAY = "2026-10-07";
const at = (iso) => Date.parse(iso + "T18:00:00Z"); // noon in Medicine Hat

test("tax follows the province the engine goes to; everything else is 5% GST", () => {
  assert.deepEqual(["Ontario", "ON", "Ont.", "Nova Scotia", "N.S.", "PEI", "Prince Edward Island", "Newfoundland and Labrador", "nb", "Alberta", "AB", "", "Texas"].map(M.provCode),
    ["ON", "ON", "ON", "NS", "NS", "PE", "PE", "NL", "NB", "AB", "AB", "", ""]);
  assert.deepEqual(["Ontario", "Nova Scotia", "New Brunswick", "Alberta", "British Columbia", ""].map(M.taxForProv), [0.13, 0.14, 0.15, 0.05, 0.05, 0.05]);
  // A $20,000 engine to Ontario is $2,600 of HST, not $1,000 of GST.
  const on = { items: [{ d: "Engine", q: 1, r: 20000 }], taxRate: 0.13 };
  assert.deepEqual([M.docSub(on), M.docTax(on), M.docTotal(on), M.taxName(on)], [20000, 2600, 22600, "HST 13%"]);
  // Invoices made before the rate was stored are 5% GST.
  assert.deepEqual([M.docTax({ items: [{ d: "x", q: 2, r: 50 }] }), M.taxName({})], [5, "GST 5%"]);
});

test("the tax is rounded once, so subtotal + tax always equals the total", () => {
  for (let c = 1; c < 3000; c += 7) {
    const doc = { items: [{ d: "a", q: 1, r: c / 100 }, { d: "b", q: 3, r: 0.07 }], taxRate: 0.05 };
    assert.equal(M.r2(M.docSub(doc) + M.docTax(doc)), M.docTotal(doc));
  }
  assert.deepEqual([M.docSub({ items: [{ d: "x", q: 1, r: 22.9 }] }), M.docTax({ items: [{ d: "x", q: 1, r: 22.9 }] })], [22.9, 1.15]);
});

test("a line with an amount but no description is caught before saving", () => {
  const lines = [{ d: "Engine", q: 1, r: 18000 }, { d: "", q: 1, r: 1200 }, { d: " ", q: 1, r: 0 }];
  assert.deepEqual(M.blankLines(lines), [2]);
  assert.deepEqual(M.usedLines(lines).map((l) => l.d), ["Engine"]);
});

test("due dates come from the terms; an invoice goes overdue by itself", () => {
  assert.deepEqual(["Net 30", "Net 15", "net 45 days", "Due on receipt", "COD", ""].map(M.termsDays), [30, 15, 45, 0, 0, 30]);
  const june = { id: 1, date: "2026-06-01", due: "Net 30", status: "pending", items: [{ d: "x", q: 1, r: 100 }] };
  assert.equal(M.dueDateOf(june), "2026-07-01");
  assert.equal(M.isOverdue(june, TODAY), true);
  assert.equal(M.daysLate(june, TODAY), 98);
  assert.equal(M.agingBucket(june, TODAY), "90+");
  const fresh = { ...june, date: "2026-10-01" };
  assert.deepEqual([M.isOverdue(fresh, TODAY), M.agingBucket(fresh, TODAY), M.invStatus(fresh, TODAY)], [false, "current", "pending"]);
  assert.equal(M.isOverdue({ ...june, status: "paid" }, TODAY), false);
  assert.equal(M.isOverdue({ ...fresh, status: "overdue" }, TODAY), true);
  assert.equal(M.dueDateOf({ ...june, dueDate: "2026-12-24" }), "2026-12-24");
  // "Oct 6" from an old quote conversion: the id says when it was made.
  assert.equal(M.docDate({ id: at("2025-10-06"), date: "Oct 6" }), "2025-10-06");
  const a = M.aging([june, fresh, { ...june, date: "2026-08-20" }, { ...june, status: "paid" }], TODAY);
  assert.deepEqual([a.current.n, a["1-30"].n, a["90+"].n, a["90+"].v], [1, 1, 1, 105]);
});

test("expenses count by how often they're paid", () => {
  assert.deepEqual(["Monthly", "", "weekly", "Every 2 weeks", "quarterly", "Annual", "one-time"].map(M.freqKey), ["monthly", "monthly", "weekly", "biweekly", "quarterly", "yearly", "once"]);
  const ex = [{ amount: 3000, freq: "Monthly" }, { amount: 6000, freq: "Yearly" }, { amount: 100, freq: "weekly" }, { amount: 900, freq: "once" }];
  assert.deepEqual(ex.map((e) => M.r2(M.expMonthly(e))), [3000, 500, 433.33, 0]);
  assert.equal(M.payrollMonthly([{ rate: 30, hrs: 40, status: "active" }, { rate: 25, hrs: 40, status: "on-leave" }]), 5200);
});

test("profit and loss: an invoiced engine sale costs its cost basis, and costs match the period", () => {
  // The review's month: a DD13 sold through Sell Engine for $20,000 (cost basis $14,000), rent $3,000 a
  // month, insurance $6,000 a year. The old P&L said +$12,000; the month really made $2,500.
  const s = {
    inventory: [{ id: 7, sku: "DD13-1", cat: "Complete Engine", status: "sold" }],
    invoices: [{ id: 11, engineId: 7, custId: 1, date: "2026-10-03", due: "Net 30", status: "paid", taxRate: 0.05, items: [{ d: "DD13", q: 1, r: 20000, kind: "engine" }] }],
    wins: [{ id: 1, kind: "sale", engineId: 7, sku: "DD13-1", price: 20000, cost: 14000, ts: "2026-10-03T17:00:00Z" }],
    expenses: [{ id: at("2026-01-02"), amount: 3000, freq: "Monthly" }, { id: at("2026-01-02"), amount: 6000, freq: "Yearly" }],
    employees: [],
  };
  const oct = M.pnl(s, M.periodFor("month", TODAY));
  assert.deepEqual([oct.revenue, oct.taxCollected, oct.cogs, oct.overhead, oct.net], [20000, 1000, 14000, 3500, 2500]);
  // A later month has no sale and the same fixed costs, so it loses money instead of showing the sale again.
  const nov = M.pnl(s, { from: "2026-11", to: "2026-11" });
  assert.deepEqual([nov.revenue, nov.cogs, nov.net], [0, 0, -3500]);
  // A year to date counts ten months of overhead.
  assert.equal(M.pnl(s, M.periodFor("year", TODAY)).overhead, 35000);
});

test("profit and loss: sales without an invoice, shop labour, payroll and what's still owed", () => {
  const s = {
    inventory: [{ id: 8, sku: "ISX-1", cat: "Complete Engine" }],
    invoices: [{ id: 12, custId: 2, date: "2026-10-05", status: "pending", taxRate: 0.13, items: [{ d: "Head gasket", q: 1, r: 2000 }] }],
    // Sold without an invoice (marked sold on the board) and an older sale with no engineId.
    wins: [{ kind: "sale", engineId: 8, price: 11000, cost: 8000, labor: 1500, ts: "2026-10-04T16:00:00Z" }, { kind: "sale", sku: "GONE", price: 5000, cost: 4000, ts: "2026-10-06T16:00:00Z" }],
    employees: [{ rate: 30, hrs: 40, status: "active" }],
    shipments: [{ freightCost: 450, shipDate: "2026-10-05" }],
  };
  const p = M.pnl(s, { from: "2026-10", to: "2026-10" });
  // Revenue: $2,000 invoiced before tax + $16,000 of engines sold without an invoice.
  assert.deepEqual([p.invoiced, p.directSales, p.revenue, p.unpaid], [2000, 16000, 18000, 2260]);
  // Cost: $8,000 − $1,500 of shop labour (already in payroll) + $4,000.
  assert.deepEqual([p.cogs, p.freight, p.payroll, p.net], [10500, 450, 5200, 1850]);
});

test("break-even: the month's margin against fixed costs, not its sales", () => {
  // $30,000 of engines that cost $25,000, against $10,000 a month of fixed costs: not cleared.
  const s = {
    inventory: [], invoices: [],
    wins: [{ kind: "sale", engineId: 1, price: 15000, cost: 12500, ts: "2026-10-02T16:00:00Z" }, { kind: "sale", engineId: 2, price: 15000, cost: 12500, ts: "2026-10-03T16:00:00Z" }],
    expenses: [{ amount: 10000, freq: "monthly" }], employees: [],
  };
  const b = M.breakEven(s, "2026-10");
  assert.deepEqual([b.fixed, b.earned, b.cleared, b.perEngine, b.engines], [10000, 5000, false, 2500, 4]);
  assert.equal(b.salesNeeded, 60000);
});

test("what a customer paid comes from their paid invoices", () => {
  const s = { invoices: [{ id: 1, custId: 5, status: "paid", items: [{ d: "a", q: 1, r: 100 }] }, { id: 2, custId: "5", status: "paid", taxRate: 0.13, items: [{ d: "b", q: 1, r: 100 }] }, { id: 3, custId: 5, status: "pending", items: [{ d: "c", q: 1, r: 50 }] }] };
  assert.deepEqual([M.custPaid(s, 5), M.custOwes(s, 5)], [218, 52.5]);
});
