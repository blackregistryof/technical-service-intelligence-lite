import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NavLinks } from "@/components/NavLinks";

describe("NavLinks (server-rendered current section)", () => {
  for (const current of ["rikketeated", "seadmed"] as const) {
    it(`marks only ${current} with aria-current, without client-side code`, () => {
      const html = renderToStaticMarkup(<NavLinks current={current} />);
      assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
      assert.match(html, new RegExp(`aria-current="page"[^>]*href="/${current}"|href="/${current}"[^>]*aria-current="page"`));
      assert.match(html, /<nav aria-label="Põhinavigatsioon">/);
      assert.ok(html.includes(">Rikketeated<") && html.includes(">Seadmed<"));
    });
  }
});
