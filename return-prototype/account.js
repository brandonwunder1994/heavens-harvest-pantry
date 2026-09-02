// Written by build.mjs from account.ts. Do not edit by hand.
const DAY = 86400;
function newestFirst(orders) {
  return [...orders].sort((a, b) => b.createdAt - a.createdAt);
}
function basketKey(items) {
  return items.map((i) => `${i.qty}x${i.name.trim().toLowerCase()}:${i.format}`).sort().join("|");
}
function theUsual(orders) {
  const withItems = orders.filter((o) => o.items.length > 0);
  if (withItems.length === 0) return null;
  const groups = /* @__PURE__ */ new Map();
  for (const order of withItems) {
    const key = basketKey(order.items);
    const group = groups.get(key);
    if (group) group.push(order);
    else groups.set(key, [order]);
  }
  let best = null;
  for (const group of groups.values()) {
    if (!best) {
      best = group;
      continue;
    }
    const lastOf = (g) => Math.max(...g.map((o) => o.createdAt));
    if (group.length > best.length || group.length === best.length && lastOf(group) > lastOf(best)) {
      best = group;
    }
  }
  if (!best) return null;
  const latest = newestFirst(best)[0];
  return {
    items: latest.items,
    method: latest.method,
    area: latest.area,
    times: best.length,
    lastAt: latest.createdAt
  };
}
function describeBasket(items) {
  const words = ["", "a", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const say = (n) => n < words.length ? words[n] : String(n);
  const parts = items.map((i) => {
    const unit = i.format === "jar" ? "jar" : "bag";
    const plural = i.qty === 1 ? unit : `${unit}s`;
    return `${say(i.qty)} ${plural} of ${i.name}`;
  });
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
function shelf(orders) {
  const jars = [];
  const oldestFirst = [...orders].sort((a, b) => a.createdAt - b.createdAt);
  for (const order of oldestFirst) {
    for (let i = 0; i < Math.max(0, order.jarsReturned); i++) {
      jars.push({ at: order.createdAt, nth: jars.length + 1 });
    }
  }
  return jars;
}
const jarsKept = (orders) => orders.reduce((n, o) => n + Math.max(0, o.jarsReturned), 0);
function shelfLine(count) {
  if (count === 0) return "Bring a jar back and the first one lands here.";
  if (count === 1) return "One jar kept out of the landfill, and two dollars off.";
  return `${count} jars kept out of the landfill, and $${count * 2} off along the way.`;
}
function verseWall(orders, verseFor) {
  const seen = /* @__PURE__ */ new Set();
  const cards = [];
  for (const order of newestFirst(orders)) {
    const on = new Date(order.createdAt * 1e3);
    const week = mondayKey(on);
    if (seen.has(week)) continue;
    seen.add(week);
    cards.push({ verse: verseFor(on), on, orderId: order.id });
  }
  return cards;
}
function mondayKey(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - (x.getDay() + 6) % 7);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}
function welcome(name, orders, now = /* @__PURE__ */ new Date()) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const usual = theUsual(orders);
  const last = orders.length ? Math.max(...orders.map((o) => o.createdAt)) : null;
  return {
    greeting: first ? `Welcome back, ${first}.` : "Welcome back.",
    usual,
    sinceDays: last === null ? null : Math.max(0, Math.floor(now.getTime() / 1e3 / DAY - last / DAY))
  };
}
function howLong(days) {
  if (days === null) return "";
  if (days === 0) return "earlier today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  const months = Math.round(days / 30);
  return months < 24 ? `${months} months ago` : `over ${Math.floor(months / 12)} years ago`;
}
export {
  basketKey,
  describeBasket,
  howLong,
  jarsKept,
  newestFirst,
  shelf,
  shelfLine,
  theUsual,
  verseWall,
  welcome
};
