import { Agent, fetch } from "undici";

const d = new Agent({ connect: { rejectUnauthorized: false } });
const paths = ["/almaty", "/almaty/catalog", "/astana", "/catalog"];

for (const path of paths) {
    const res = await fetch("https://helix.ru" + path, {
        dispatcher: d,
        headers: { "User-Agent": "Mozilla/5.0" },
        redirect: "follow"
    });
    const html = await res.text();
    const hxid = (html.match(/"hxid"/g) ?? []).length;
    console.log(path, res.status, html.length, "hxid", hxid);
}
