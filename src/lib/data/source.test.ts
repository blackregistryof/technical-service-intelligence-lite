import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DataSourceConfigError, resolveDataSource } from "./source";

describe("resolveDataSource", () => {
  it("uses synthetic when explicitly configured, in any environment", () => {
    assert.equal(resolveDataSource({ DATA_SOURCE: "synthetic", NODE_ENV: "production" }), "synthetic");
    assert.equal(resolveDataSource({ DATA_SOURCE: " synthetic ", NODE_ENV: "development" }), "synthetic");
  });

  it("defaults to synthetic only outside production", () => {
    assert.equal(resolveDataSource({ NODE_ENV: "development" }), "synthetic");
    assert.equal(resolveDataSource({ NODE_ENV: "test" }), "synthetic");
    assert.equal(resolveDataSource({}), "synthetic");
  });

  it("fails closed in production when DATA_SOURCE is missing or empty", () => {
    assert.throws(() => resolveDataSource({ NODE_ENV: "production" }), DataSourceConfigError);
    assert.throws(
      () => resolveDataSource({ DATA_SOURCE: "", NODE_ENV: "production" }),
      DataSourceConfigError,
    );
    assert.throws(
      () => resolveDataSource({ DATA_SOURCE: "   ", NODE_ENV: "production" }),
      DataSourceConfigError,
    );
  });

  it("rejects unknown values instead of falling back to synthetic", () => {
    for (const NODE_ENV of ["production", "development"]) {
      assert.throws(() => resolveDataSource({ DATA_SOURCE: "postgres", NODE_ENV }), DataSourceConfigError);
      assert.throws(() => resolveDataSource({ DATA_SOURCE: "Synthetic", NODE_ENV }), DataSourceConfigError);
    }
  });
});
