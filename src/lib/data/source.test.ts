import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DataSourceConfigError, dataSourceStartupLog, resolveDataSource } from "./source";

const rejects = (env: { DATA_SOURCE?: string; NODE_ENV?: string }, message: RegExp) =>
  assert.throws(
    () => resolveDataSource(env),
    (error) => error instanceof DataSourceConfigError && message.test(error.message),
  );

describe("resolveDataSource in production", () => {
  const NODE_ENV = "production";

  it("accepts only postgres", () => {
    assert.equal(resolveDataSource({ DATA_SOURCE: "postgres", NODE_ENV }), "postgres");
    assert.equal(resolveDataSource({ DATA_SOURCE: " postgres ", NODE_ENV }), "postgres");
  });

  it("rejects synthetic unconditionally", () => {
    rejects({ DATA_SOURCE: "synthetic", NODE_ENV }, /not allowed in production/);
    rejects({ DATA_SOURCE: " synthetic ", NODE_ENV }, /not allowed in production/);
  });

  it("rejects missing, empty and blank values instead of defaulting to synthetic", () => {
    rejects({ NODE_ENV }, /not set/);
    rejects({ DATA_SOURCE: "", NODE_ENV }, /not set/);
    rejects({ DATA_SOURCE: "   ", NODE_ENV }, /not set/);
  });

  it("rejects unknown values, including other spellings", () => {
    for (const DATA_SOURCE of ["Postgres", "postgresql", "Synthetic", "prisma", "memory"]) {
      rejects({ DATA_SOURCE, NODE_ENV }, /Unsupported DATA_SOURCE value/);
    }
  });
});

describe("resolveDataSource outside production", () => {
  it("keeps synthetic as the default in development and test", () => {
    assert.equal(resolveDataSource({ NODE_ENV: "development" }), "synthetic");
    assert.equal(resolveDataSource({ NODE_ENV: "test" }), "synthetic");
    assert.equal(resolveDataSource({ DATA_SOURCE: "", NODE_ENV: "development" }), "synthetic");
    assert.equal(resolveDataSource({}), "synthetic");
  });

  it("accepts synthetic and postgres explicitly", () => {
    for (const NODE_ENV of ["development", "test"]) {
      assert.equal(resolveDataSource({ DATA_SOURCE: "synthetic", NODE_ENV }), "synthetic");
      assert.equal(resolveDataSource({ DATA_SOURCE: "postgres", NODE_ENV }), "postgres");
    }
  });

  it("rejects unknown values instead of falling back to synthetic", () => {
    for (const NODE_ENV of ["development", "test"]) {
      rejects({ DATA_SOURCE: "Synthetic", NODE_ENV }, /Unsupported DATA_SOURCE value/);
      rejects({ DATA_SOURCE: "postgresql", NODE_ENV }, /Unsupported DATA_SOURCE value/);
    }
  });
});

describe("configuration errors and startup log", () => {
  const leaked = "postgresql://user:s3cret-value@db.example.invalid:5432/tsi";

  it("never echo the configured value", () => {
    for (const NODE_ENV of ["production", "development"]) {
      assert.throws(
        () => resolveDataSource({ DATA_SOURCE: leaked, NODE_ENV }),
        (error) => error instanceof Error && !error.message.includes("s3cret") && !error.message.includes("example"),
      );
      assert.ok(!dataSourceStartupLog({ DATA_SOURCE: leaked, NODE_ENV }).message.includes("s3cret"));
    }
  });

  it("names the selected source type", () => {
    assert.deepEqual(dataSourceStartupLog({ DATA_SOURCE: "synthetic", NODE_ENV: "development" }), {
      level: "warn",
      message: "[data] Data source: synthetic (TEMPORARY read-only in-memory dataset, not PostgreSQL).",
    });
    assert.equal(dataSourceStartupLog({ NODE_ENV: "development" }).level, "warn");
    const postgres = dataSourceStartupLog({ DATA_SOURCE: "postgres", NODE_ENV: "production" });
    assert.equal(postgres.level, "error");
    assert.match(postgres.message, /^\[data\] Data source: postgres\. .*not implemented yet/);
  });

  it("reports invalid production configuration as an error", () => {
    for (const DATA_SOURCE of [undefined, "", "synthetic", "unknown"]) {
      const log = dataSourceStartupLog({ DATA_SOURCE, NODE_ENV: "production" });
      assert.equal(log.level, "error", String(DATA_SOURCE));
      assert.match(log.message, /^\[data\] Data source configuration error: .* Data pages will fail closed\.$/);
    }
  });
});
