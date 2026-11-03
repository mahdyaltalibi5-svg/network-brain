import { describe, expect, it } from "vitest";
import { decodeExport, leadsFromExport, parseDelimited } from "@/lib/meta/csv";

const utf16 = (s: string) => {
  const buf = new Uint8Array(2 + s.length * 2);
  buf[0] = 0xff;
  buf[1] = 0xfe;
  for (let i = 0; i < s.length; i++) {
    buf[2 + i * 2] = s.charCodeAt(i) & 0xff;
    buf[3 + i * 2] = s.charCodeAt(i) >> 8;
  }
  return buf;
};

describe("Meta lead file import", () => {
  it("reads Ads Manager's UTF-16 tab-separated download with prefixed IDs and phones", () => {
    const file = [
      "id\tcreated_time\tad_id\tad_name\tadset_id\tadset_name\tcampaign_id\tcampaign_name\tform_id\tform_name\tis_organic\tplatform\tfull_name\temail\tphone_number\twhat_are_you_shopping_for?\tlead_status",
      "l:1203344556677889\t2026-11-01T15:04:05-06:00\tag:111\tGroom video\tas:222\tSLC 25-45\tc:333\tKobe.Ascend - LEADS\tf:444\tConsult form\tfalse\tig\tJordan Reyes\tjordan@example.com\tp:+18015550199\tWedding suit\tCREATED",
    ].join("\r\n");
    const { leads, skipped } = leadsFromExport(utf16(file));
    expect(skipped).toBe(0);
    expect(leads[0]).toMatchObject({
      source: "meta",
      metaLeadId: "1203344556677889",
      fullName: "Jordan Reyes",
      email: "jordan@example.com",
      phone: "+18015550199",
      occasion: "Wedding suit",
      campaignId: "333",
      campaignName: "Kobe.Ascend - LEADS",
      adsetName: "SLC 25-45",
      platform: "ig",
    });
    expect(leads[0].createdAt?.toISOString()).toBe("2026-11-01T21:04:05.000Z");
    // Meta's bookkeeping columns (lead_status, form_name…) aren't stored as answers
    expect(leads[0].answers?.map((a) => a.question)).toEqual(["Full name", "Email", "Phone number", "What are you shopping for"]);
  });

  it("reads Leads Center's UTF-8 CSV with quoted commas and newlines", () => {
    const csv = 'id,created_time,campaign_name,full_name,email,notes\n123456789012345,2026-11-02T10:00:00+0000,"Partnership, SLC",Sam Lee,sam@example.com,"Two suits,\nwedding in June"\nnot-a-lead,,,,,\n';
    const { leads, skipped } = leadsFromExport(new TextEncoder().encode(csv));
    expect(skipped).toBe(1);
    expect(leads[0]).toMatchObject({ fullName: "Sam Lee", campaignName: "Partnership, SLC" });
    expect(leads[0].answers).toContainEqual({ question: "Notes", answer: "Two suits,\nwedding in June" });
  });

  it("parses quotes and detects the delimiter", () => {
    expect(parseDelimited('a,b\n"x ""y""",z')).toEqual([["a", "b"], ['x "y"', "z"]]);
    expect(parseDelimited("a\tb\n1,2\t3")).toEqual([["a", "b"], ["1,2", "3"]]);
    expect(decodeExport(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toBe("a");
  });
});
