import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildSyntheticDataset } from "../../../prisma/synthetic/dataset";
import { DeviceWorkspace } from "@/components/devices/DeviceWorkspace";
import { ServiceTimeline } from "@/components/devices/ServiceTimeline";
import { ANALYSIS_PERIOD } from "@/lib/domain/analysis";
import { createSyntheticRepository } from "@/lib/data/synthetic-repository";
import { parseWorkTypeFilter } from "@/lib/domain/filters";

const repository = createSyntheticRepository();
const dataset = buildSyntheticDataset();
const decode = (s: string) => s.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

/** Renders the workspace exactly like the Seadmed pages do. */
async function render({ atm, q = "", liik }: { atm?: string; q?: string; liik?: string }) {
  const history = atm ? await repository.getAtmHistory(atm) : null;
  const html = renderToStaticMarkup(
    <DeviceWorkspace
      atms={await repository.searchAtms(q)}
      query={q}
      history={history}
      workType={parseWorkTypeFilter(liik)}
    />,
  );
  return { html, content: text(html) };
}

const between = (html: string, start: string, end: string) => {
  const s = html.indexOf(start);
  return s === -1 ? "" : html.slice(s, html.indexOf(end, s));
};
const sidebar = (html: string) => between(html, 'id="seadmed-nimekiri"', "</section>");
/** Everything from the history heading onwards (the timeline and its entries). */
const timeline = (html: string) => {
  const start = html.indexOf('id="ajalugu-pealkiri"');
  return start === -1 ? "" : html.slice(start);
};
/** Top-level timeline entries: <li id="syn-wo-…"> in order. */
const entryIds = (html: string) => [...timeline(html).matchAll(/<li id="(syn-wo-[^"]+)"/g)].map((m) => m[1]);
const externalId = (id: string) => dataset.workOrders.find((w) => w.id === id)!.externalId;

describe("device list without a selection", () => {
  it("lists all 7 ATMs with exact status badges and 30-day counts", async () => {
    const { html, content } = await render({});
    const side = text(sidebar(html));
    assert.ok(content.includes("Automaate kokku: 7."));
    for (const expected of [
      "ATM-0101 Kassaline K5 1 avatud 1 ootel 3 / 30 p",
      "ATM-0102 Kassaline K5 1 avatud 1 ootel 3 / 30 p",
      "ATM-0103 Kassaline K7 1 ootel 2 / 30 p",
      "ATM-0104 Numera DX-200 1 avatud 2 / 30 p",
      "ATM-0105 Numera DX-200 1 ootel 2 / 30 p",
      "ATM-0106 Kassaline K7 2 avatud 2 / 30 p",
      "ATM-0107 Numera DX-300 Aktiivseid rikketeateid pole 1 / 30 p",
    ]) {
      assert.ok(side.includes(expected), expected);
    }
    assert.ok(content.includes("Vali automaat nimekirjast"));
    assert.ok(!sidebar(html).includes('aria-current="page"'));
  });

  it("filters the sidebar by search", async () => {
    const { html, content } = await render({ q: "0105" });
    assert.ok(content.includes("Otsingule „0105“ vastab 1 automaati."));
    assert.deepEqual([...new Set(text(sidebar(html)).match(/ATM-\d{4}/g))], ["ATM-0105"]);
    assert.ok((await render({ q: "ATM-9999" })).content.includes("Otsingule vastavaid automaate ei leitud."));
  });
});

describe("selected device", () => {
  it("marks exactly the selected ATM and keeps search and filter in links", async () => {
    const { html } = await render({ atm: "ATM-0101", q: "ATM-01", liik: "MAINTENANCE" });
    const side = sidebar(html);
    assert.equal((side.match(/aria-current="page"/g) ?? []).length, 1);
    assert.match(side, /aria-current="page"[^>]*>(?:(?!<\/a>)[\s\S])*ATM-0101/);
    assert.equal((side.match(/>Valitud</g) ?? []).length, 1);
    assert.ok(decode(side).includes('href="/seadmed/ATM-0102?q=ATM-01&liik=MAINTENANCE"'));
    assert.match(html, /<form[^>]*action="\/seadmed\/ATM-0101"/);
    assert.match(html, /<input type="hidden" name="liik" value="MAINTENANCE"\/>/);
  });

  it("shows number, model and active fault-call statuses with links", async () => {
    const { html, content } = await render({ atm: "ATM-0101" });
    assert.ok(content.includes("Automaat ATM-0101 Mudel: Kassaline K5"));
    assert.ok(content.includes("Aktiivsed rikketeated: WO-27602 Staatus: Avatud WO-27480 Staatus: Ootel"));
    assert.match(html, /href="\/rikketeated\/syn-wo-wo-27602"/);
    const none = (await render({ atm: "ATM-0107" })).content;
    assert.ok(none.includes("Aktiivsed rikketeated: puuduvad"));
  });

  it("distinguishes work-order and visit counts", async () => {
    const { content } = await render({ atm: "ATM-0101" });
    assert.ok(content.includes("Tööde ajalugu (6 töökäsku)"));
    assert.ok(content.includes("6 töökäsku · 7 tehnikukülastust."));
  });

  it("explains a selected ATM hidden by the sidebar search", async () => {
    const { content } = await render({ atm: "ATM-0101", q: "0105" });
    assert.ok(content.includes("Valitud automaat ATM-0101 ei vasta otsingule."));
    assert.ok(content.includes("Automaat ATM-0101"));
  });
});

describe("chronological timeline", () => {
  it("lists ATM-0101 newest first, grouped by Estonian month", async () => {
    const { html } = await render({ atm: "ATM-0101" });
    assert.deepEqual(entryIds(html).map(externalId), [
      "WO-27602",
      "WO-27480",
      "WO-27015",
      "WO-26102",
      "WO-25390",
      "WO-24811",
    ]);
    const months = [...timeline(html).matchAll(/<h3 id="kuu-([\d-]+)"[^>]*>([^<]+)</g)].map((m) => [m[1], m[2]]);
    assert.deepEqual(months, [
      ["2026-10", "Oktoober 2026"],
      ["2026-09", "September 2026"],
      ["2026-07", "Juuli 2026"],
      ["2026-05", "Mai 2026"],
      ["2026-03", "Märts 2026"],
    ]);
  });

  it("places the analysis-period marker between WO-27015 and WO-26102", async () => {
    const { html } = await render({ atm: "ATM-0101" });
    const t = timeline(html);
    const marker = t.indexOf("Analüüsiperioodi algus 26.09.2026");
    assert.ok(marker > t.indexOf('id="syn-wo-wo-27015"'));
    assert.ok(marker < t.indexOf('id="syn-wo-wo-26102"'));
    assert.equal((t.match(/Analüüsiperioodi algus/g) ?? []).length, 1);
    // The period starts with a new month (July), so the marker sits between the months.
    assert.ok(marker < t.indexOf('id="kuu-2026-07"'));
    assert.ok(marker > t.indexOf('id="kuu-2026-09"'));
  });

  it("places the marker inside a month when the boundary falls mid-month", async () => {
    // In the dataset every boundary coincides with a month change, so combine two real
    // September records: WO-27050 (28.09, inside the period) and WO-26810 (02.09, before it).
    const inPeriod = (await repository.getWorkOrder("syn-wo-wo-27050"))!;
    const older = (await repository.getWorkOrder("syn-wo-wo-26810"))!;
    const html = renderToStaticMarkup(
      <ServiceTimeline workOrders={[inPeriod, older]} period={ANALYSIS_PERIOD} />,
    );
    assert.equal((html.match(/<h3 id="kuu-/g) ?? []).length, 1); // one September group
    const marker = html.indexOf("Analüüsiperioodi algus");
    assert.ok(marker > html.indexOf('id="kuu-2026-09"'), "after the month heading");
    assert.ok(marker > html.indexOf('id="syn-wo-wo-27050"'), "after the in-period work order");
    assert.ok(marker < html.indexOf('id="syn-wo-wo-26810"'), "before the older work order");
  });

  it("states when all shown work is inside the period (ATM-0107 fault calls only)", async () => {
    const { content } = await render({ atm: "ATM-0107", liik: "FAULT_CALL" });
    assert.ok(content.includes("Kõik kuvatud tööd on registreeritud analüüsiperioodil (alates 26.09.2026)"));
  });

  it("shows visits only under their parent work order, never as timeline entries", async () => {
    const { html } = await render({ atm: "ATM-0101" });
    const ids = entryIds(html);
    assert.equal(ids.length, 6);
    assert.ok(ids.every((id) => !/-v\d+$/.test(id)));
    const t = timeline(html);
    const wo27015 = t.slice(t.indexOf('id="syn-wo-wo-27015"'), t.indexOf('id="syn-wo-wo-26102"'));
    for (const v of ["v1", "v2", "v3"]) assert.ok(wo27015.includes(`id="syn-wo-wo-27015-${v}"`), v);
    assert.ok(text(wo27015).includes("Tehnikukülastused (3)"));
  });

  it("marks work type with text and icon for fault calls and maintenance", async () => {
    const { html } = await render({ atm: "ATM-0101" });
    const t = timeline(html);
    assert.ok(t.includes('aria-label="Hooldustöö WO-25390"'));
    assert.ok(t.includes('aria-label="Rikketeade WO-27015"'));
    assert.ok(text(t).includes("Töö liik: Hooldustöö"));
    assert.match(t, /href="\/rikketeated\/syn-wo-wo-27015"/);
    assert.ok(!t.includes('href="/rikketeated/syn-wo-wo-25390"'));
  });
});

describe("work-type filter", () => {
  it("shows counts and keeps the selected ATM and search", async () => {
    const { html, content } = await render({ atm: "ATM-0101", q: "01" });
    assert.ok(content.includes("Kõik : 6 Rikketeated : 5 Hooldustööd : 1"));
    assert.ok(decode(html).includes('href="/seadmed/ATM-0101?q=01&liik=FAULT_CALL"'));
    assert.ok(decode(html).includes('href="/seadmed/ATM-0101?q=01&liik=MAINTENANCE"'));
  });

  it("filters to fault calls or maintenance without reordering", async () => {
    const faults = await render({ atm: "ATM-0101", liik: "FAULT_CALL" });
    assert.deepEqual(entryIds(faults.html).map(externalId), ["WO-27602", "WO-27480", "WO-27015", "WO-26102", "WO-24811"]);
    assert.ok(faults.content.includes("Kuvatakse 5 töökäsku (rikketeated) ja 6 tehnikukülastust."));
    const maintenance = await render({ atm: "ATM-0101", liik: "maintenance" });
    assert.deepEqual(entryIds(maintenance.html).map(externalId), ["WO-25390"]);
    assert.ok(maintenance.content.includes("Analüüsiperioodi algus"));
  });

  it("ignores an invalid filter value", async () => {
    assert.equal(entryIds((await render({ atm: "ATM-0101", liik: "VISIT" })).html).length, 6);
  });
});

describe("factual summary in the workspace", () => {
  it("keeps the counts and links counted calls to their records", async () => {
    const { html } = await render({ atm: "ATM-0101" });
    const s = between(html, 'id="kokkuvote-pealkiri"', 'id="ajalugu-pealkiri"');
    assert.ok(text(s).includes("Registreeritud rikketeated perioodil 3 rikketeadet"));
    assert.ok(text(s).includes("Sünteetilised demoandmed."));
    for (const id of ["27602", "27480", "27015"]) assert.match(s, new RegExp(`href="/rikketeated/syn-wo-wo-${id}"`));
  });

  it("links a maintenance latest work to the unfiltered history entry", async () => {
    const { html } = await render({ atm: "ATM-0105", liik: "FAULT_CALL" });
    const s = between(html, 'id="kokkuvote-pealkiri"', 'id="ajalugu-pealkiri"');
    assert.match(s, /href="\/seadmed\/ATM-0105#syn-wo-wo-27610"/);
  });
});

describe("every work order and visit is shown verbatim", () => {
  for (const atm of dataset.atms) {
    it(`${atm.atmNumber}: all work orders, descriptions, actions, comments and outcomes`, async () => {
      const { html, content } = await render({ atm: atm.atmNumber });
      const workOrders = dataset.workOrders.filter((w) => w.atmId === atm.id);
      assert.equal(entryIds(html).length, workOrders.length);
      for (const w of workOrders) {
        assert.ok(html.includes(`id="${w.id}"`), w.id);
        assert.ok(content.includes(w.originalDescription), `${w.externalId} description`);
        for (const v of dataset.technicianVisits.filter((x) => x.workOrderId === w.id)) {
          assert.ok(html.includes(`id="${v.id}"`), v.id);
          assert.ok(content.includes(v.actions), `${v.id} actions`);
          if (v.originalComment) assert.ok(content.includes(v.originalComment), `${v.id} comment`);
          if (v.outcome) assert.ok(content.includes(v.outcome), `${v.id} outcome`);
        }
      }
      assert.ok(!/prioriteet|kriitiline|kiireloomuline|raskusaste|soovitatav tegevus|T-\d{3}/i.test(content));
    });
  }

  it("labels the missing comment of WO-27520 instead of inferring it", async () => {
    const { html } = await render({ atm: "ATM-0103" });
    const t = timeline(html);
    const entry = t.slice(t.indexOf('id="syn-wo-wo-27520"'), t.indexOf('id="syn-wo-wo-27350"'));
    assert.ok(text(entry).includes("Kommentaar puudub"));
  });
});
