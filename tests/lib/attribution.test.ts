import { describe, expect, it } from "vitest";
import { referrerDeOrigem } from "../../src/lib/attribution";

const SITE = "https://fisiogo.online";

describe("referrerDeOrigem", () => {
  it("keeps another site's origin", () => {
    expect(referrerDeOrigem("https://l.instagram.com/?u=abc", SITE, "/")).toBe(
      "https://l.instagram.com",
    );
  });

  it("ignores an empty referrer and the site itself", () => {
    expect(referrerDeOrigem("", SITE, "/")).toBeNull();
    expect(referrerDeOrigem("https://fisiogo.online/precos", SITE, "/")).toBeNull();
  });

  it("ignores the Google login return pages", () => {
    expect(referrerDeOrigem("https://oauth.lovable.app/callback", SITE, "/")).toBeNull();
    expect(referrerDeOrigem("https://accounts.google.com/", SITE, "/")).toBeNull();
  });

  it("ignores any arrival on /app (login return or confirmation e-mail link)", () => {
    expect(referrerDeOrigem("android-app://com.google.android.gm/", SITE, "/app")).toBeNull();
    expect(referrerDeOrigem("https://mail.google.com/", SITE, "/app/")).toBeNull();
  });

  it("keeps Android app referrers, whose URL origin is 'null'", () => {
    expect(referrerDeOrigem("android-app://com.instagram.android/", SITE, "/")).toBe(
      "android-app://com.instagram.android",
    );
  });

  it("ignores a malformed referrer", () => {
    expect(referrerDeOrigem("not a url", SITE, "/")).toBeNull();
  });
});
