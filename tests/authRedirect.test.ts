import { getSafeReturnTo } from "../client/src/lib/auth-redirect";

describe("getSafeReturnTo", () => {
  it("preserves a local path and its query", () => {
    expect(getSafeReturnTo("/affiliate?tab=overview")).toBe("/affiliate?tab=overview");
  });

  it("uses the fallback for external, protocol-relative, and malformed targets", () => {
    expect(getSafeReturnTo("https://attacker.example/path")).toBe("/");
    expect(getSafeReturnTo("//attacker.example/path")).toBe("/");
    expect(getSafeReturnTo("/\\attacker.example")).toBe("/");
    expect(getSafeReturnTo(null, "/affiliate")).toBe("/affiliate");
  });
});