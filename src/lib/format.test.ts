import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPLETENESS_LABELS,
  COMPLETENESS_STATE_LABELS,
  countFaultCalls,
  formatDate,
  formatDateTime,
  formatIsoDay,
  formatMonthKey,
} from "./format";

describe("Estonian date formatting (Europe/Tallinn)", () => {
  it("converts UTC to Estonian summer and winter time", () => {
    assert.equal(formatDateTime(new Date("2026-10-25T07:35:00Z")), "25.10.2026 09:35"); // EET
    assert.equal(formatDateTime(new Date("2026-09-30T11:05:00Z")), "30.09.2026 14:05"); // EEST
  });

  it("shows the local calendar day around midnight and the DST change", () => {
    assert.equal(formatDateTime(new Date("2026-09-25T21:00:00Z")), "26.09.2026 00:00");
    assert.equal(formatDateTime(new Date("2026-10-25T21:59:00Z")), "25.10.2026 23:59");
    assert.equal(formatDateTime(new Date("2026-10-25T22:00:00Z")), "26.10.2026 00:00");
    assert.equal(formatDate(new Date("2026-10-24T21:30:00Z")), "25.10.2026");
  });

  it("formats ISO days without time-zone conversion", () => {
    assert.equal(formatIsoDay("2026-10-25"), "25.10.2026");
    assert.equal(formatIsoDay("2026-09-26"), "26.09.2026");
  });
});

describe("formatMonthKey", () => {
  it("formats calendar months in Estonian with a capital letter", () => {
    assert.equal(formatMonthKey("2026-10"), "Oktoober 2026");
    assert.equal(formatMonthKey("2026-09"), "September 2026");
    assert.equal(formatMonthKey("2026-03"), "Märts 2026");
    assert.equal(formatMonthKey("2027-01"), "Jaanuar 2027");
  });
});

describe("completeness labels", () => {
  it("has an Estonian label for every check and state", () => {
    assert.deepEqual(Object.keys(COMPLETENESS_LABELS), [
      "faultCode",
      "description",
      "visit",
      "visitComment",
    ]);
    assert.deepEqual(COMPLETENESS_STATE_LABELS, {
      present: "olemas",
      missing: "puudub",
      notApplicable: "ei kohaldu",
    });
  });
});

describe("countFaultCalls", () => {
  it("uses the correct Estonian singular and partitive plural", () => {
    assert.equal(countFaultCalls(0), "0 rikketeadet");
    assert.equal(countFaultCalls(1), "1 rikketeade");
    assert.equal(countFaultCalls(3), "3 rikketeadet");
  });
});
