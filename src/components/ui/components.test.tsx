import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBadge, WorkTypeBadge } from "@/components/Badges";
import { CodeChip } from "@/components/ui/CodeChip";
import { CompletenessChips } from "@/components/ui/CompletenessChips";
import { EmptyState } from "@/components/ui/EmptyState";
import { MissingValue } from "@/components/ui/MissingValue";
import { VisitItem } from "@/components/ui/VisitItem";
import { createSyntheticRepository } from "@/lib/data/synthetic-repository";
import { describeCompleteness } from "@/lib/domain/completeness";

const repository = createSyntheticRepository();
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const render = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe("Badges", () => {
  it("render exactly the pre-existing markup by default (no icon)", () => {
    const html = render(<StatusBadge status="HOLD" />);
    assert.equal(
      html,
      '<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap border-amber-200 bg-amber-50 text-amber-900"><span class="sr-only">Staatus: </span>Ootel</span>',
    );
    assert.equal(text(html), "Staatus: Ootel");
    assert.equal(text(render(<WorkTypeBadge workType="MAINTENANCE" />)), "Töö liik: Hooldustöö");
  });

  it("add a decorative, hidden icon only when requested", () => {
    const html = render(<StatusBadge status="OPEN" showIcon />);
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
    assert.equal(text(html), "Staatus: Avatud");
    assert.match(render(<WorkTypeBadge workType="FAULT_CALL" showIcon />), /<svg[^>]*aria-hidden="true"/);
  });
});

describe("MissingValue and EmptyState", () => {
  it("label missing values explicitly", () => {
    assert.equal(text(render(<MissingValue />)), "Puudub");
    assert.equal(text(render(<MissingValue>Kommentaar puudub</MissingValue>)), "Kommentaar puudub");
  });

  it("render an Estonian empty state as a status message", () => {
    const html = render(<EmptyState title="Rikketeateid ei leitud">Muuda otsingut.</EmptyState>);
    assert.match(html, /role="status"/);
    assert.equal(text(html), "Rikketeateid ei leitud Muuda otsingut.");
  });
});

describe("CodeChip", () => {
  it("shows the code and its dictionary description", () => {
    const html = render(<CodeChip code={{ code: "F-DISP-01", description: "Sularaha väljastusmooduli tõrge" }} />);
    assert.match(html, /<code[^>]*>F-DISP-01<\/code>/);
    assert.equal(text(html), "F-DISP-01 Sularaha väljastusmooduli tõrge");
  });

  it("omits an unknown description instead of inventing one", () => {
    assert.equal(text(render(<CodeChip code={{ code: "F-XYZ", description: null }} />)), "F-XYZ");
  });

  it("labels a missing code", () => {
    assert.equal(text(render(<CodeChip code={null} />)), "Kood puudub");
  });
});

describe("VisitItem", () => {
  it("renders the stored comment verbatim and marks the latest visit", async () => {
    const workOrder = (await repository.getWorkOrder("syn-wo-wo-27455"))!;
    const latest = workOrder.visits[1];
    const html = render(<VisitItem visit={latest} position={2} total={2} isLatest />);
    assert.ok(text(html).includes(latest.originalComment!));
    assert.ok(text(html).includes("Tehnikukülastus 2/2"));
    assert.ok(text(html).includes("22.10.2026 12:10")); // 09:10 UTC in Estonian summer time
    assert.ok(text(html).includes("Viimane külastus"));
    assert.ok(text(html).includes("Ootel – varuosa"));
    assert.match(html, new RegExp(`id="${latest.id}"`));
  });

  it("labels the missing comment of WO-27520 and invents nothing", async () => {
    const workOrder = (await repository.getWorkOrder("syn-wo-wo-27520"))!;
    const html = render(<VisitItem visit={workOrder.visits[0]} position={1} total={1} />);
    const content = text(html);
    assert.ok(content.includes("Kommentaar puudub"));
    assert.ok(content.includes("Vahetatud võrgukaabel, kontrollitud ruuterit."));
    assert.ok(!content.includes("Viimane külastus"));
    // No technician identities or priorities exist in the data model.
    assert.ok(!/T-\d{3}|Tehnik |Prioriteet/i.test(content));
  });

  it("shows the resolution code of a closing visit", async () => {
    const workOrder = (await repository.getWorkOrder("syn-wo-wo-27015"))!;
    const content = text(render(<VisitItem visit={workOrder.visits[2]} position={3} total={3} />));
    assert.ok(content.includes("R-PART Varuosa vahetus"));
    assert.ok(content.includes("Lahendatud"));
  });

  it("renders every visit in the dataset with its exact stored text", async () => {
    for (const call of await repository.listActiveFaultCalls()) {
      const workOrder = (await repository.getWorkOrder(call.id))!;
      workOrder.visits.forEach((visit, index) => {
        const content = text(render(<VisitItem visit={visit} position={index + 1} total={workOrder.visits.length} />));
        assert.ok(content.includes(visit.actions), visit.id);
        if (visit.originalComment) assert.ok(content.includes(visit.originalComment), visit.id);
      });
    }
  });
});

describe("CompletenessChips", () => {
  it("describes WO-27520 in Estonian text, not colour alone", async () => {
    const workOrder = (await repository.getWorkOrder("syn-wo-wo-27520"))!;
    const content = text(render(<CompletenessChips items={describeCompleteness(workOrder)} />));
    assert.equal(
      content,
      "Rikkekood : olemas Algne kirjeldus : olemas Tehnikukülastus : olemas Viimase külastuse kommentaar – puudub",
    );
  });

  it("marks not-applicable items for an open call without visits", async () => {
    const workOrder = (await repository.getWorkOrder("syn-wo-wo-27602"))!;
    const content = text(render(<CompletenessChips items={describeCompleteness(workOrder)} />));
    assert.ok(content.includes("Tehnikukülastus – puudub"));
    assert.ok(content.includes("Viimase külastuse kommentaar – ei kohaldu"));
  });
});
