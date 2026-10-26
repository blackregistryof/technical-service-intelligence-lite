import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countFaultCalls, formatDate, formatDateTime, formatIsoDay } from "./format";

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

describe("countFaultCalls", () => {
  it("uses the correct Estonian singular and partitive plural", () => {
    assert.equal(countFaultCalls(0), "0 rikketeadet");
    assert.equal(countFaultCalls(1), "1 rikketeade");
    assert.equal(countFaultCalls(3), "3 rikketeadet");
  });
});
