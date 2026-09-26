import { describe, expect, it } from "vitest";
import { findSupplierMatch, normalizeCompanyName, normalizePhone, parseBoothCode, similarity } from "../src/index.ts";

describe("normalize", () => {
  it("phones", () => {
    expect(normalizePhone("138 0013 8000")).toBe("+8613800138000");
    expect(normalizePhone("+86 138-0013-8000")).toBe("+8613800138000");
    expect(normalizePhone("0086 13800138000")).toBe("+8613800138000");
    expect(normalizePhone("020-8888 6666")).toBe("+862088886666");
    expect(normalizePhone("(801) 555-1234")).toBe("+18015551234");
    expect(normalizePhone("abc")).toBeNull();
  });
  it("company names", () => {
    expect(normalizeCompanyName("Guangzhou Sunny Lighting Co., Ltd.")).toBe("sunny lighting");
    expect(normalizeCompanyName("SUNNY LIGHTING CO LTD")).toBe("sunny lighting");
    expect(normalizeCompanyName("广州市阳光照明有限公司")).toBe("阳光照明");
  });
  it("booth codes", () => {
    expect(parseBoothCode("Booth 11.2 A 15")).toEqual({ hall: "11.2", booth: "11.2A15" });
    expect(parseBoothCode("9.1-C23")).toEqual({ hall: "9.1", booth: "9.1C23" });
    expect(parseBoothCode("no booth")).toBeNull();
  });
  it("similarity", () => {
    expect(similarity("sunny lighting", "sunny lighting")).toBe(1);
    expect(similarity("sunny lighting", "sunny lightings")).toBeGreaterThan(0.6);
    expect(similarity("sunny lighting", "ocean toys")).toBeLessThan(0.2);
  });
});

describe("findSupplierMatch", () => {
  const existing = [
    { id: "a", name_en: "Guangzhou Sunny Lighting Co., Ltd.", name_cn: null, phones: ["13800138000"], emails: [], wechat_id: null, booth_code: "11.2A15" },
    { id: "b", name_en: "Ocean Toys Factory", name_cn: null, phones: [], emails: ["sales@ocean.cn"], wechat_id: "oceantoys", booth_code: null },
  ];
  it("auto-merges on phone", () => {
    const r = findSupplierMatch({ name_en: "Sunny", name_cn: null, phones: ["+86 138 0013 8000"], emails: [], wechat_id: null, booth_code: null }, existing);
    expect(r).toMatchObject({ kind: "auto", id: "a" });
  });
  it("auto-merges on email and wechat case-insensitively", () => {
    expect(findSupplierMatch({ name_en: null, name_cn: null, phones: [], emails: ["SALES@ocean.cn "], wechat_id: null, booth_code: null }, existing)).toMatchObject({ kind: "auto", id: "b" });
    expect(findSupplierMatch({ name_en: null, name_cn: null, phones: [], emails: [], wechat_id: "OceanToys", booth_code: null }, existing)).toMatchObject({ kind: "auto", id: "b" });
  });
  it("auto-merges on booth", () => {
    expect(findSupplierMatch({ name_en: null, name_cn: null, phones: [], emails: [], wechat_id: null, booth_code: "11.2 a15" }, existing)).toMatchObject({ kind: "auto", id: "a" });
  });
  it("candidate on similar name", () => {
    const r = findSupplierMatch({ name_en: "Sunny Lightings Ltd", name_cn: null, phones: [], emails: [], wechat_id: null, booth_code: null }, existing);
    expect(r.kind).toBe("candidate");
  });
  it("none", () => {
    expect(findSupplierMatch({ name_en: "Totally Different Bags", name_cn: null, phones: [], emails: [], wechat_id: null, booth_code: null }, existing).kind).toBe("none");
  });
});
