import { describe, expect, it } from "vitest";
import { isElovioApiOriginAllowed } from "../lib/elovio-provider/api-origin";

describe("Elovio API origin policy", () => {
  it("allows same-origin browser requests and exact configured preview origins", () => {
    expect(isElovioApiOriginAllowed("https://elovio.vercel.app", "https://elovio.vercel.app")).toBe(true);
    expect(isElovioApiOriginAllowed("https://preview.example", "https://elovio.vercel.app", ["https://preview.example"])).toBe(true);
  });

  it("rejects untrusted, malformed and non-HTTPS browser origins", () => {
    expect(isElovioApiOriginAllowed("https://attacker.example", "https://elovio.vercel.app")).toBe(false);
    expect(isElovioApiOriginAllowed("http://attacker.example", "https://elovio.vercel.app")).toBe(false);
    expect(isElovioApiOriginAllowed("https://elovio.vercel.app/path", "https://elovio.vercel.app")).toBe(false);
    expect(isElovioApiOriginAllowed("not a URL", "https://elovio.vercel.app")).toBe(false);
  });

  it("allows native bearer-token requests without an Origin header", () => {
    expect(isElovioApiOriginAllowed(null, "https://elovio.vercel.app")).toBe(true);
  });
});
