const html = await fetch("https://www.kdlolymp.kz/contacts/karaganda", {
  headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

const parts = html.split(/office-id="/).length;
console.log("office-id parts", parts);

const coords = (html.match(/\d{2}\.\d{4,},\s*\d{2,3}\.\d{4,}/g) || []).length;
console.log("coords", coords);

// search medical center names
const med = html.match(/[А-Яа-яЁё][А-Яа-яЁё\s\-]{5,40}(?:мед|лаб|олимп|KDL|ОЛИМП)/gi);
console.log("med", med?.slice(0, 15));

// KDL might use different attribute
const attrs = [...html.matchAll(/data-[a-z-]+="[^"]+"/g)].map(m => m[0].split("=")[0]).slice(0,30);
console.log("data attrs sample", [...new Set(attrs)].slice(0,15));
