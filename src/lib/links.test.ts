import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deviceHref, faultCallDetailHref, faultCallListHref, withListParams } from "./links";

describe("faultCallListHref", () => {
  it("returns the plain list URL without parameters", () => {
    assert.equal(faultCallListHref(), "/rikketeated");
    assert.equal(faultCallListHref({ query: "  ", status: null }), "/rikketeated");
  });

  it("keeps search and status together in a fixed order", () => {
    assert.equal(faultCallListHref({ status: "HOLD" }), "/rikketeated?staatus=HOLD");
    assert.equal(faultCallListHref({ query: "ATM-0101" }), "/rikketeated?q=ATM-0101");
    assert.equal(
      faultCallListHref({ query: " ATM-0101 ", status: "OPEN" }),
      "/rikketeated?q=ATM-0101&staatus=OPEN",
    );
  });

  it("encodes user input", () => {
    assert.equal(faultCallListHref({ query: "a&b c" }), "/rikketeated?q=a%26b+c");
  });
});

describe("faultCallDetailHref", () => {
  it("keeps the list state on the detail URL", () => {
    assert.equal(faultCallDetailHref("syn-wo-wo-27480"), "/rikketeated/syn-wo-wo-27480");
    assert.equal(
      faultCallDetailHref("syn-wo-wo-27480", { query: "ATM-0101", status: "HOLD" }),
      "/rikketeated/syn-wo-wo-27480?q=ATM-0101&staatus=HOLD",
    );
  });

  it("encodes the ID path segment", () => {
    assert.equal(faultCallDetailHref("a/b c"), "/rikketeated/a%2Fb%20c");
  });
});

describe("deviceHref", () => {
  it("builds list and device URLs with search, work-type filter and hash", () => {
    assert.equal(deviceHref(null), "/seadmed");
    assert.equal(deviceHref(null, { query: "0101" }), "/seadmed?q=0101");
    assert.equal(deviceHref("ATM-0101"), "/seadmed/ATM-0101");
    assert.equal(
      deviceHref("ATM-0101", { query: " 01 ", workType: "MAINTENANCE" }),
      "/seadmed/ATM-0101?q=01&liik=MAINTENANCE",
    );
    assert.equal(deviceHref("ATM-0105", {}, "syn-wo-wo-27610"), "/seadmed/ATM-0105#syn-wo-wo-27610");
  });
});

describe("withListParams", () => {
  it("adds parameters to any path", () => {
    assert.equal(withListParams("/rikketeated/x", { status: "OPEN" }), "/rikketeated/x?staatus=OPEN");
    assert.equal(withListParams("/rikketeated/x"), "/rikketeated/x");
  });
});
