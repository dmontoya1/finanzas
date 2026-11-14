import assert from "node:assert/strict";
import { hasRuleFor, matchesPattern, suggestPattern } from "../../src/lib/merchantRules.ts";

Deno.test("suggestPattern: documented examples", () => {
  const cases: [string, string | null][] = [
    ["PAYPAL *SPOTIFY", "PAYPAL *SPOTIFY"],
    ["PAYPAL*SPOTIFY", "PAYPAL*SPOTIFY"],
    ["SQ *COFFEE SHOP", "SQ *COFFEE SHOP"],
    ["UBER   *TRIP", "UBER   *TRIP"],
    ["AMZN MKTP ES*2K4TY9", "AMZN MKTP ES"],
    ["AMAZON MKTPL*2X4Y9", "AMAZON MKTPL"],
    ["MERCADONA 1234", "MERCADONA"],
    ["Carrefour Express #45", "CARREFOUR EXPRESS"],
    ["Café Mañana 12", "CAFÉ MAÑANA"],
    ["Mercadona", "MERCADONA"],
  ];
  for (const [input, expected] of cases) assert.equal(suggestPattern(input), expected, input);
});

Deno.test("suggestPattern: null for empty or too short", () => {
  for (const v of [null, undefined, "", "   ", "AB", "#123", "12"]) assert.equal(suggestPattern(v), null, String(v));
});

Deno.test("matchesPattern is case-insensitive", () => {
  assert.equal(matchesPattern("Mercadona Centro", "MERCADONA"), true);
  assert.equal(matchesPattern("mercadona", "Mercadona"), true);
  assert.equal(matchesPattern("Lidl", "MERCADONA"), false);
  assert.equal(matchesPattern(null, "MERCADONA"), false);
});

Deno.test("hasRuleFor: equal, covering, none", () => {
  assert.equal(hasRuleFor([{ pattern: " mercadona " }], "MERCADONA"), true);
  assert.equal(hasRuleFor([{ pattern: "MERCADONA" }], "MERCADONA CENTRO", "Mercadona Centro 12"), true);
  assert.equal(hasRuleFor([{ pattern: "LIDL" }], "MERCADONA", "Mercadona 1"), false);
  assert.equal(hasRuleFor([], "MERCADONA", "Mercadona"), false);
});

Deno.test("property: a suggested pattern always matches its own merchant", () => {
  const merchants = [
    "PAYPAL*SPOTIFY", "PAYPAL *SPOTIFY", "UBER   *TRIP", "UBER\t*TRIP", "SQ *COFFEE SHOP",
    "AMZN MKTP ES*2K4TY9", "AMAZON MKTPL*2X4Y9", "MERCADONA 1234", "Carrefour Express #45",
    "Café Mañana 12", "mercadona   centro 99", "  lidl  ", "GLOVO*ORDER 1234", "APPLE.COM/BILL",
    "REPSOL  E.S. 4567", "Zara\tHome 23", "NETFLIX.COM", "ALDI #123 MADRID", "*TIP", "A*B", "Bar El Pez 3 4 5",
    "IBERIA 0752 *X1", "Pastelería Ñandú*Dulce", "H&M  #9",
  ];
  for (const m of merchants) {
    const p = suggestPattern(m);
    assert.ok(p === null || matchesPattern(m, p), `${JSON.stringify(m)} -> ${JSON.stringify(p)}`);
  }
});
