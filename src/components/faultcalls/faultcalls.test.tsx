import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FaultCallList } from "@/components/faultcalls/FaultCallList";
import { LatestCommentPreview } from "@/components/faultcalls/LatestCommentPreview";
import { StatusFilter } from "@/components/faultcalls/StatusFilter";
import { createSyntheticRepository } from "@/lib/data/synthetic-repository";
import { countByStatus, filterByStatus, parseStatusFilter } from "@/lib/domain/filters";

const repository = createSyntheticRepository();
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const render = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);
const ids = (html: string) => [...new Set(html.match(/WO-\d{5}/g) ?? [])];

/** Same steps as the Rikketeated page: search, count, then filter. */
async function listFor(query: string, staatus?: string) {
  const searchResult = await repository.listActiveFaultCalls(query);
  return {
    counts: countByStatus(searchResult),
    items: filterByStatus(searchResult, parseStatusFilter(staatus)),
  };
}

describe("LatestCommentPreview", () => {
  it("shows the existing comment of a HOLD call with its visit time", async () => {
    const call = (await repository.listActiveFaultCalls("WO-27480"))[0];
    const content = text(render(<LatestCommentPreview {...call} />));
    assert.ok(content.startsWith("Logides on väljastusviga kassetist 1."));
    assert.ok(content.includes("21.10.2026 16:15"));
  });

  it("labels the missing comment of HOLD call WO-27520", async () => {
    const call = (await repository.listActiveFaultCalls("WO-27520"))[0];
    const content = text(render(<LatestCommentPreview {...call} />));
    assert.equal(content, "Viimase külastuse kommentaar puudub 22.10.2026 18:30");
  });

  it("labels a HOLD call without recorded visits", () => {
    const content = text(
      render(<LatestCommentPreview status="HOLD" latestComment={{ kind: "no-visits" }} visitCount={0} />),
    );
    assert.equal(content, "Tehnikukülastusi pole registreeritud");
  });

  it("shows only the factual visit count for OPEN calls, not their comments", async () => {
    const wo27410 = (await repository.listActiveFaultCalls("WO-27410"))[0];
    assert.equal(text(render(<LatestCommentPreview {...wo27410} />)), "1 tehnikukülastus");
    const wo27602 = (await repository.listActiveFaultCalls("WO-27602"))[0];
    assert.equal(text(render(<LatestCommentPreview {...wo27602} />)), "Tehnikukülastusi pole registreeritud");
  });
});

describe("FaultCallList", () => {
  it("renders the 9 active calls newest first", async () => {
    const { items } = await listFor("");
    assert.deepEqual(ids(render(<FaultCallList items={items} />)), [
      "WO-27602",
      "WO-27590",
      "WO-27570",
      "WO-27540",
      "WO-27520",
      "WO-27480",
      "WO-27495",
      "WO-27455",
      "WO-27410",
    ]);
  });

  it("shows ID, status text, time, ATM, model, code, description and links", async () => {
    const { items } = await listFor("WO-27455");
    const html = render(<FaultCallList items={items} />);
    const content = text(html);
    for (const expected of [
      "WO-27455",
      "Staatus: Ootel",
      "19.10.2026 17:30",
      "ATM-0102",
      "Kassaline K5",
      "F-CARD-02",
      "Kaardilugeja tõrge",
      "Kaardilugeja jätab kaardi automaati kinni.",
      "Püsivara uuendus ei aidanud.",
    ]) {
      assert.ok(content.includes(expected), expected);
    }
    assert.match(html, /href="\/rikketeated\/syn-wo-wo-27455"/);
    assert.match(html, /href="\/seadmed\/ATM-0102"/);
  });

  it("keeps the exact original description text of every call", async () => {
    const { items } = await listFor("");
    const content = text(render(<FaultCallList items={items} />));
    for (const call of items) assert.ok(content.includes(call.originalDescription), call.externalId);
  });

  it("never renders maintenance orders or closed calls", async () => {
    const content = text(render(<FaultCallList items={(await listFor("")).items} />));
    for (const excluded of ["WO-27610", "WO-27015", "WO-25390", "Hooldustöö", "Suletud"]) {
      assert.ok(!content.includes(excluded), excluded);
    }
  });

  it("does not show invented priority, severity or technician identifiers", async () => {
    const content = text(render(<FaultCallList items={(await listFor("")).items} />));
    assert.ok(!/prioriteet|kriitiline|kiireloomuline|raskusaste|T-\d{3}/i.test(content));
  });
});

describe("search and status filter together", () => {
  it("counts the full active list (9 = 5 + 4)", async () => {
    const { counts } = await listFor("");
    assert.deepEqual([counts.total, counts.OPEN, counts.HOLD], [9, 5, 4]);
  });

  it("filters to the 4 HOLD calls, newest first", async () => {
    const { items } = await listFor("", "HOLD");
    assert.deepEqual(items.map((c) => c.externalId), ["WO-27520", "WO-27480", "WO-27495", "WO-27455"]);
  });

  it("combines ATM search with the status filter and counts the search result", async () => {
    const atm0102 = await listFor("ATM-0102", "OPEN");
    assert.deepEqual([atm0102.counts.total, atm0102.counts.OPEN, atm0102.counts.HOLD], [2, 1, 1]);
    assert.deepEqual(atm0102.items.map((c) => c.externalId), ["WO-27590"]);

    const atm0106Hold = await listFor("ATM-0106", "HOLD");
    assert.deepEqual(atm0106Hold.items, []);
    assert.deepEqual([atm0106Hold.counts.OPEN, atm0106Hold.counts.HOLD], [2, 0]);
  });

  it("combines work-order search with the status filter", async () => {
    assert.deepEqual((await listFor("274", "HOLD")).items.map((c) => c.externalId), [
      "WO-27480",
      "WO-27495",
      "WO-27455",
    ]);
    assert.deepEqual((await listFor("274", "OPEN")).items.map((c) => c.externalId), ["WO-27410"]);
  });

  it("ignores an invalid status value", async () => {
    assert.equal((await listFor("", "CLOSED")).items.length, 9);
    assert.equal((await listFor("", "x")).items.length, 9);
  });
});

describe("StatusFilter", () => {
  it("renders counts, marks the selected option and keeps the search in links", async () => {
    const { counts } = await listFor("ATM-0101");
    const html = render(<StatusFilter counts={counts} selected="HOLD" query="ATM-0101" />);
    assert.equal(text(html), "Kõik : 2 Avatud : 1 Ootel : 1");
    assert.match(html, /href="\/rikketeated\?q=ATM-0101"/);
    assert.match(html, /href="\/rikketeated\?q=ATM-0101&amp;staatus=OPEN"/);
    assert.match(html, /aria-current="page"[^>]*>(?:(?!<\/a>).)*Ootel/);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  });
});
