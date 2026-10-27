import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faultCallListHref } from "./links";

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
