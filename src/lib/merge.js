// ─────────────────────────────────────────────────────────────
// Merged saves: several people can work at once without overwriting each other.
//
// A device saves a list as what changed since it last saved it, and the database
// applies that to what's stored (public.merge_list for the app_state lists,
// public.merge_inventory for the inventory table; migration 0014), so a customer
// added on the office computer and one added on the owner's phone both stay, and
// the owner's new price survives a stale tab logging labour on the same engine.
//
// A list's changes:  { put: [{ id, item, after, before, set?, unset? }], del: [id, …] }
//   put   a record that's new (no `set`), or changed: `set` [[path, value], …]
//         and `unset` [path, …], down to the field inside nested objects (arrays
//         are replaced whole). `item` is the whole record, used when the server
//         doesn't have it. Where a record the server doesn't have goes: last
//         when nothing this device already had comes after it (`before` null);
//         otherwise before `before` (the next record the device already had),
//         else after `after` (the record before it on the device), else first
//         when it was first on the device, else last. So two people adding to
//         the end both land at the end, in the order they saved, and a
//         newest-first list (the Shop Log, sales) keeps new entries on top.
//   del   ids this device removed.
// Ids are compared as text (like sameId in the dashboard). Two people changing
// the same field: the later save wins.
//
// applyList is the same merge in JavaScript; tests/merge.test.mjs holds the SQL
// to it.
// ─────────────────────────────────────────────────────────────

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const key = (v) => String(v);
const hasId = (e) => isObj(e) && e.id != null;

// Every record is an object with an id, so the list can be merged record by record.
export const mergeable = (list) => Array.isArray(list) && list.every(hasId);

// What changed inside one record: the fields set (with their path) and removed.
export function diffItem(a, b, path = [], out = { set: [], unset: [] }) {
  for (const k of Object.keys(b)) {
    const av = a[k], bv = b[k];
    if (bv === undefined) { if (av !== undefined) out.unset.push([...path, k]); continue; }
    if (isObj(av) && isObj(bv)) diffItem(av, bv, [...path, k], out);
    else if (!same(av, bv)) out.set.push([[...path, k], bv]);
  }
  for (const k of Object.keys(a)) if (!(k in b) && a[k] !== undefined) out.unset.push([...path, k]);
  return out;
}

// A list's changes from `prev` (what this device last saved; null or [] when it
// has no copy: then every record goes up whole and nothing is removed) to `cur`.
// null when nothing changed.
export function diffList(prev, cur) {
  const old = new Map();
  for (const it of prev || []) if (hasId(it) && !old.has(key(it.id))) old.set(key(it.id), it);
  const list = [], seen = new Set();
  for (const it of cur || []) if (hasId(it) && !seen.has(key(it.id))) { seen.add(key(it.id)); list.push(it); }
  // the next record after each one that this device already had
  const next = [];
  for (let i = list.length - 1, nx = null; i >= 0; i--) { next[i] = nx; if (old.has(key(list[i].id))) nx = list[i].id; }
  const put = [];
  list.forEach((it, i) => {
    const at = { after: i ? list[i - 1].id : null, before: next[i] };
    const p = old.get(key(it.id));
    if (!p) put.push({ id: it.id, item: it, ...at });
    else if (!same(p, it)) {
      const { set, unset } = diffItem(p, it);
      if (set.length || unset.length) put.push({ id: it.id, item: it, set, unset, ...at });
    }
  });
  const del = [...old.entries()].filter(([k]) => !seen.has(k)).map(([, it]) => it.id);
  return put.length || del.length ? { put, del } : null;
}

const setPath = (t, p, v) => {
  if (!p.length) return v;
  const o = isObj(t) ? t : {};
  return { ...o, [p[0]]: setPath(o[p[0]], p.slice(1), v) };
};
const unsetPath = (t, p) => {
  if (!isObj(t) || !p.length || !(p[0] in t)) return t;
  if (p.length === 1) { const { [p[0]]: _gone, ...rest } = t; return rest; }
  return { ...t, [p[0]]: unsetPath(t[p[0]], p.slice(1)) };
};
export const applyItem = (item, set = [], unset = []) => {
  let out = isObj(item) ? item : {};
  for (const [p, v] of set) out = setPath(out, p, v);
  for (const p of unset) out = unsetPath(out, p);
  return out;
};

// What the database does with a save: `stored` is the list on the server (null
// when it was never saved). `full`, sent by a device whose list was never stored
// (a seeded list on its first save), is written as it is when nothing (or an
// empty list) is stored; otherwise the changes apply to what's there.
export function applyList(stored, ch, full = null) {
  if (full && (!Array.isArray(stored) || !stored.length)) return full.slice();
  let arr = Array.isArray(stored) ? stored.slice() : [];
  if (!ch) return arr;
  const dels = new Set((ch.del || []).map(key));
  if (dels.size) arr = arr.filter((e) => !(hasId(e) && dels.has(key(e.id))));
  const at = (id) => arr.findIndex((e) => hasId(e) && key(e.id) === key(id));
  for (const p of ch.put || []) {
    const ix = at(p.id);
    if (ix >= 0) {
      const it = p.set || p.unset ? applyItem(arr[ix], p.set, p.unset) : p.item;
      if (it != null) arr[ix] = it;
    } else if (p.item == null) continue;
    else {
      const bx = p.before != null ? at(p.before) : -1, ax = bx < 0 && p.before != null && p.after != null ? at(p.after) : -1;
      if (bx >= 0) arr.splice(bx, 0, p.item);
      else if (ax >= 0) arr.splice(ax + 1, 0, p.item);
      else if (p.before != null && p.after == null) arr.unshift(p.item);
      else arr.push(p.item);
    }
  }
  return arr;
}
