import { describe, expect, test } from "vitest";
import { parseVoiceExpense } from "@/lib/voiceExpenseParser";

const categories = [
  { id: 1, name: "食費" },
  { id: 2, name: "交通費" },
];

const baseDate = new Date(2026, 5, 20);

describe("parseVoiceExpense", () => {
  test("空白なしの発話から支出ドラフトを作る", () => {
    expect(parseVoiceExpense("今日ランチ1200円食費", categories, baseDate)).toMatchObject({
      amount: 1200,
      categoryId: 1,
      date: "2026-06-20",
      description: "ランチ",
      missingFields: [],
    });
  });

  test("明示キーワードで項目を指定できる", () => {
    expect(
      parseVoiceExpense("金額1200円分類食費メモランチ日付昨日", categories, baseDate),
    ).toMatchObject({
      amount: 1200,
      categoryId: 1,
      date: "2026-06-19",
      description: "ランチ",
      missingFields: [],
    });
  });

  test("漢数字の金額を解釈する", () => {
    expect(parseVoiceExpense("昨日電車四百八十円交通費", categories, baseDate)).toMatchObject({
      amount: 480,
      categoryId: 2,
      date: "2026-06-19",
      description: "電車",
      missingFields: [],
    });
  });

  test("カテゴリ名が説明の一部ならカテゴリとして消さない", () => {
    expect(parseVoiceExpense("今日食費の本300円", categories, baseDate)).toMatchObject({
      amount: 300,
      categoryId: null,
      date: "2026-06-20",
      description: "食費の本",
      missingFields: ["category"],
    });
  });
});
