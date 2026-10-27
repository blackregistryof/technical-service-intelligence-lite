import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildSyntheticDataset } from "../../../prisma/synthetic/dataset";
import { FaultCallWorkspace } from "@/components/faultcalls/FaultCallWorkspace";
import { createSyntheticRepository } from "@/lib/data/synthetic-repository";
import { buildFaultCallContext } from "@/lib/domain/context";
import { countByStatus, filterByStatus, parseStatusFilter } from "@/lib/domain/filters";

const repository = createSyntheticRepository();
const dataset = buildSyntheticDataset();
const decode = (s: string) => s.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

/** Renders the workspace exactly like the Rikketeated pages do. */
async function renderWorkspace({ id, q = "", staatus }: { id?: string; q?: string; staatus?: string }) {
  const status = parseStatusFilter(staatus);
  const searchResult = await repository.listActiveFaultCalls(q);
  const selected = id ? await repository.getWorkOrder(id) : null;
  const history = selected ? await repository.getAtmHistory(selected.atm.atmNumber) : null;
  const html = renderToStaticMarkup(
    <FaultCallWorkspace
      items={filterByStatus(searchResult, status)}
      counts={countByStatus(searchResult)}
      query={q}
      status={status}
      selected={selected}
      context={selected && history ? buildFaultCallContext(history, selected.id) : null}
    />,
  );
  return { html, content: text(html) };
}

const listHtml = (html: string) => {
  const start = html.indexOf('<ul class="divide-y');
  return start === -1 ? "" : html.slice(start, html.indexOf("</ul>", start) + 5);
};

describe("workspace without a selection", () => {
  it("shows the list and an informative empty selection state, selecting nothing", async () => {
    const { html, content } = await renderWorkspace({});
    assert.ok(content.includes("Vali rikketeade nimekirjast"));
    assert.ok(content.includes("järjekord ei tähista prioriteeti"));
    assert.ok(!listHtml(html).includes('aria-current="page"'));
    assert.ok(!html.includes(">Valitud<")); // no selected-row label
    assert.ok(!html.includes('id="rikketeade-pealkiri"'));
    assert.match(html, /<h1 id="rikketeated-pealkiri"/);
  });

  it("links every row to its detail URL with the current search and filter", async () => {
    const { html } = await renderWorkspace({ q: "ATM-0101", staatus: "HOLD" });
    const hrefs = [...listHtml(html).matchAll(/href="(\/rikketeated\/[^"]+)"/g)].map((m) => decode(m[1]));
    assert.deepEqual(hrefs, ["/rikketeated/syn-wo-wo-27480?q=ATM-0101&staatus=HOLD"]);
  });
});

describe("workspace with a selected active call", () => {
  it("marks exactly the selected row with aria-current and a visible label", async () => {
    const { html } = await renderWorkspace({ id: "syn-wo-wo-27480" });
    const list = listHtml(html);
    assert.equal((list.match(/aria-current="page"/g) ?? []).length, 1);
    assert.match(list, /aria-current="page"[^>]*>WO-27480</);
    assert.equal((list.match(/>Valitud</g) ?? []).length, 1);
    assert.match(list, /border-l-blue-700/);
  });

  it("keeps the list, search and filter while showing the detail", async () => {
    const { html, content } = await renderWorkspace({ id: "syn-wo-wo-27480", q: "ATM-0101", staatus: "HOLD" });
    assert.match(html, /<form[^>]*action="\/rikketeated\/syn-wo-wo-27480"/);
    assert.match(html, /<input type="hidden" name="staatus" value="HOLD"\/>/);
    assert.ok(decode(html).includes('href="/rikketeated/syn-wo-wo-27480?q=ATM-0101&staatus=OPEN"'));
    assert.ok(decode(html).includes('href="/rikketeated?q=ATM-0101&staatus=HOLD"')); // mobile back link
    assert.ok(content.includes("Kuvatakse 1 ootel rikketeade otsingule „ATM-0101“."));
    assert.ok(content.includes("Rikketeade WO-27480"));
  });

  it("shows the HOLD comment callout with the verbatim comment", async () => {
    const { content } = await renderWorkspace({ id: "syn-wo-wo-27480" });
    assert.ok(content.includes("Ootel – viimane tehniku kommentaar"));
    assert.ok(
      content.includes("Logides on väljastusviga kassetist 1. Vajalik kasseti vahetus, ootame varuosa tarnet."),
    );
  });

  it("distinguishes the missing comment of WO-27520", async () => {
    const { content } = await renderWorkspace({ id: "syn-wo-wo-27520" });
    assert.ok(content.includes("Viimase tehnikukülastuse kommentaar puudub lähteandmetes."));
    assert.ok(content.includes("Viimase külastuse kommentaar – puudub"));
  });

  it("does not show the HOLD callout for open or closed calls", async () => {
    for (const id of ["syn-wo-wo-27602", "syn-wo-wo-27015"]) {
      const { content } = await renderWorkspace({ id });
      assert.ok(!content.includes("Ootel – viimane tehniku kommentaar"), id);
    }
  });
});

describe("ATM context", () => {
  it("shows the accurate context for WO-27480 with working links", async () => {
    const { html, content } = await renderWorkspace({ id: "syn-wo-wo-27480", staatus: "HOLD" });
    const aside = html.slice(html.indexOf("<aside"), html.indexOf("</aside>"));
    const asideText = text(aside);
    assert.ok(asideText.includes("ATM-0101 Kassaline K5"));
    assert.ok(asideText.includes("Võrdluskuupäev 25.10.2026 · sünteetilised demoandmed"));
    assert.ok(asideText.includes("Rikketeated 26.09.2026–25.10.2026 (30 päeva) 3 rikketeadet"));
    const hrefs = [...aside.matchAll(/href="([^"]+)"/g)].map((m) => decode(m[1]));
    // Counted calls (keep the filter), other active call, recent work, full history.
    for (const expected of [
      "/rikketeated/syn-wo-wo-27602?staatus=HOLD",
      "/rikketeated/syn-wo-wo-27480?staatus=HOLD",
      "/rikketeated/syn-wo-wo-27015?staatus=HOLD",
      "/rikketeated/syn-wo-wo-26102?staatus=HOLD",
      "/seadmed/ATM-0101#syn-wo-wo-25390",
      "/seadmed/ATM-0101",
    ]) {
      assert.ok(hrefs.includes(expected), expected);
    }
    assert.ok(asideText.includes("Teised aktiivsed rikketeated sellel automaadil WO-27602"));
    assert.ok(asideText.includes("Automaadi ATM-0101 kogu ajalugu (6 töökäsku)"));
    assert.ok(content.includes("ATM-0101 teenindusajalugu"));
    // Every linked work order exists in the dataset.
    for (const href of hrefs) {
      const id = href.match(/syn-wo-[^?#]+/)?.[0];
      if (id) assert.ok(dataset.workOrders.some((w) => w.id === id), id);
    }
  });

  it("states when there are no other active calls (ATM-0107)", async () => {
    const { content } = await renderWorkspace({ id: "syn-wo-wo-27050" });
    assert.ok(content.includes("Teisi avatud või ootel rikketeateid ei ole."));
    assert.ok(content.includes("1 rikketeade"));
  });
});

describe("selections outside the visible list", () => {
  it("explains a selection hidden by the status filter, keeping the detail", async () => {
    const { html, content } = await renderWorkspace({ id: "syn-wo-wo-27480", staatus: "OPEN" });
    assert.ok(content.includes("Valitud rikketeade WO-27480 ei vasta praegusele otsingule või filtrile."));
    assert.ok(html.includes('href="/rikketeated/syn-wo-wo-27480">Näita kõiki aktiivseid'));
    assert.ok(!listHtml(html).includes('aria-current="page"'));
    assert.ok(content.includes("Rikketeade WO-27480"));
  });

  it("keeps closed calls from device history accessible with a clear note", async () => {
    const { html, content } = await renderWorkspace({ id: "syn-wo-wo-27015" });
    assert.ok(content.includes("Valitud rikketeade WO-27015 on suletud ega kuulu aktiivsesse nimekirja."));
    assert.ok(content.includes("See rikketeade on suletud ega kuulu aktiivsete rikketeadete nimekirja."));
    assert.ok(content.includes("Tehnikukülastused (3)"));
    assert.ok(!listHtml(html).includes("WO-27015"));
  });
});

describe("detail content is complete and verbatim for every fault call", () => {
  const faultCalls = dataset.workOrders.filter((w) => w.workType === "FAULT_CALL");

  it("covers all 26 fault calls", () => {
    assert.equal(faultCalls.length, 26);
  });

  for (const workOrder of faultCalls) {
    it(`${workOrder.externalId}: description, every visit and comment`, async () => {
      const { content } = await renderWorkspace({ id: workOrder.id });
      const detail = content.slice(content.indexOf(`Rikketeade ${workOrder.externalId}`));
      assert.ok(detail.includes(workOrder.originalDescription), "description");
      const visits = dataset.technicianVisits.filter((v) => v.workOrderId === workOrder.id);
      assert.ok(detail.includes(`Tehnikukülastused (${visits.length})`), "visit count");
      for (const visit of visits) {
        assert.ok(detail.includes(visit.actions), visit.id);
        if (visit.originalComment) assert.ok(detail.includes(visit.originalComment), visit.id);
        else assert.ok(detail.includes("Kommentaar puudub"), visit.id);
      }
      assert.ok(!/prioriteet|kriitiline|kiireloomuline|raskusaste|T-\d{3}/i.test(content));
    });
  }
});
