export interface VoiceExpenseCategory {
  id: number;
  name: string;
}

export type VoiceExpenseMissingField = "amount" | "category" | "description";

export interface VoiceExpenseParseResult {
  rawText: string;
  amount: number | null;
  categoryId: number | null;
  date: string;
  description: string;
  missingFields: VoiceExpenseMissingField[];
  warnings: string[];
}

interface ParsedPart<T> {
  value: T;
  text: string;
}

const DATE_LABEL_PATTERN = "(?:日付|日にち)";
const AMOUNT_LABEL_PATTERN = "(?:金額|値段|価格|代金)";
const CATEGORY_LABEL_PATTERN = "(?:カテゴリー|カテゴリ|分類)";
const MEMO_LABEL_PATTERN = "(?:メモ|説明|内容)";

const JAPANESE_DIGITS: Record<string, number> = {
  "〇": 0,
  "零": 0,
  "一": 1,
  "壱": 1,
  "二": 2,
  "弐": 2,
  "三": 3,
  "参": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9,
};

const JAPANESE_SMALL_UNITS: Record<string, number> = {
  "十": 10,
  "百": 100,
  "千": 1000,
};

function normalizeSpeechText(text: string) {
  return text
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[，、]/g, ",")
    .replace(/／/g, "/")
    .replace(/　/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeFirst(text: string, target: string) {
  if (!target) {
    return text;
  }

  return text.replace(target, "");
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function moveDate(baseDate: Date, offsetDays: number) {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + offsetDays,
  );
}

function parseJapaneseNumber(text: string) {
  let total = 0;
  let section = 0;
  let current = 0;

  for (const char of text) {
    if (char in JAPANESE_DIGITS) {
      current = JAPANESE_DIGITS[char];
      continue;
    }

    if (char in JAPANESE_SMALL_UNITS) {
      section += (current || 1) * JAPANESE_SMALL_UNITS[char];
      current = 0;
      continue;
    }

    if (char === "万") {
      total += (section + current || 1) * 10000;
      section = 0;
      current = 0;
    }
  }

  return total + section + current;
}

function parseNumericAmount(text: string): ParsedPart<number> | null {
  const explicitMatch = text.match(
    new RegExp(`${AMOUNT_LABEL_PATTERN}[:：]?\\s*([0-9][0-9,]*)\\s*(?:円|えん)?`),
  );
  if (explicitMatch) {
    return {
      value: Number(explicitMatch[1].replace(/,/g, "")),
      text: explicitMatch[0],
    };
  }

  const yenMatch = text.match(/([0-9][0-9,]*)\s*(?:円|えん)/);
  if (yenMatch) {
    return {
      value: Number(yenMatch[1].replace(/,/g, "")),
      text: yenMatch[0],
    };
  }

  return null;
}

function parseJapaneseAmount(text: string): ParsedPart<number> | null {
  const explicitMatch = text.match(
    new RegExp(`${AMOUNT_LABEL_PATTERN}[:：]?\\s*([〇零一二三四五六七八九十百千万壱弐参]+)\\s*(?:円|えん)?`),
  );
  if (explicitMatch) {
    return {
      value: parseJapaneseNumber(explicitMatch[1]),
      text: explicitMatch[0],
    };
  }

  const yenMatch = text.match(/([〇零一二三四五六七八九十百千万壱弐参]+)\s*(?:円|えん)/);
  if (yenMatch) {
    return {
      value: parseJapaneseNumber(yenMatch[1]),
      text: yenMatch[0],
    };
  }

  return null;
}

function parseAmount(text: string) {
  return parseNumericAmount(text) ?? parseJapaneseAmount(text);
}

function buildDateResult(year: number, month: number, day: number, text: string) {
  return {
    value: formatDate(new Date(year, month - 1, day)),
    text,
  };
}

function parseDate(text: string, baseDate: Date): ParsedPart<string> | null {
  const relativeDates: Record<string, number> = {
    "一昨日": -2,
    "昨日": -1,
    "今日": 0,
    "本日": 0,
    "明日": 1,
  };

  const explicitRelativeMatch = text.match(
    new RegExp(`${DATE_LABEL_PATTERN}[:：]?\\s*(一昨日|昨日|今日|本日|明日)`),
  );
  if (explicitRelativeMatch) {
    return {
      value: formatDate(moveDate(baseDate, relativeDates[explicitRelativeMatch[1]])),
      text: explicitRelativeMatch[0],
    };
  }

  const relativeMatch = text.match(/一昨日|昨日|今日|本日|明日/);
  if (relativeMatch) {
    return {
      value: formatDate(moveDate(baseDate, relativeDates[relativeMatch[0]])),
      text: relativeMatch[0],
    };
  }

  const yearMonthDayMatch = text.match(
    new RegExp(`${DATE_LABEL_PATTERN}[:：]?\\s*(\\d{4})[-/](\\d{1,2})[-/](\\d{1,2})`),
  ) ?? text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yearMonthDayMatch) {
    return buildDateResult(
      Number(yearMonthDayMatch[1]),
      Number(yearMonthDayMatch[2]),
      Number(yearMonthDayMatch[3]),
      yearMonthDayMatch[0],
    );
  }

  const monthDayMatch = text.match(
    new RegExp(`${DATE_LABEL_PATTERN}[:：]?\\s*(\\d{1,2})月(\\d{1,2})日`),
  ) ?? text.match(/(\d{1,2})月(\d{1,2})日/);
  if (monthDayMatch) {
    return buildDateResult(
      baseDate.getFullYear(),
      Number(monthDayMatch[1]),
      Number(monthDayMatch[2]),
      monthDayMatch[0],
    );
  }

  const slashMonthDayMatch = text.match(
    new RegExp(`${DATE_LABEL_PATTERN}[:：]?\\s*(\\d{1,2})/(\\d{1,2})`),
  ) ?? text.match(/(\d{1,2})\/(\d{1,2})/);
  if (slashMonthDayMatch) {
    return buildDateResult(
      baseDate.getFullYear(),
      Number(slashMonthDayMatch[1]),
      Number(slashMonthDayMatch[2]),
      slashMonthDayMatch[0],
    );
  }

  return null;
}

function parseExplicitMemo(text: string) {
  const memoMatch = text.match(
    new RegExp(`${MEMO_LABEL_PATTERN}[:：]?\\s*(.*?)(?=${DATE_LABEL_PATTERN}|${AMOUNT_LABEL_PATTERN}|${CATEGORY_LABEL_PATTERN}|$)`),
  );

  return memoMatch ? cleanupDescription(memoMatch[1]) : "";
}

function sortCategories(categories: VoiceExpenseCategory[]) {
  return [...categories].sort((a, b) => b.name.length - a.name.length);
}

function parseCategory(text: string, categories: VoiceExpenseCategory[]): ParsedPart<number> | null {
  for (const category of sortCategories(categories)) {
    const categoryName = escapeRegExp(category.name);
    const explicitMatch = text.match(
      new RegExp(`${CATEGORY_LABEL_PATTERN}[:：]?\\s*${categoryName}`),
    );

    if (explicitMatch) {
      return {
        value: category.id,
        text: explicitMatch[0],
      };
    }
  }

  for (const category of sortCategories(categories)) {
    const categoryName = escapeRegExp(category.name);
    const suffixMatch = text.match(new RegExp(`${categoryName}\\s*$`));

    if (suffixMatch) {
      return {
        value: category.id,
        text: suffixMatch[0],
      };
    }

    const separatedMatch = text.match(
      new RegExp(`(?:^|[\\s,。:：])${categoryName}(?=$|[\\s,。:：])`),
    );

    if (separatedMatch) {
      return {
        value: category.id,
        text: separatedMatch[0],
      };
    }
  }

  return null;
}

function cleanupDescription(text: string) {
  return text
    .replace(new RegExp(`${DATE_LABEL_PATTERN}|${AMOUNT_LABEL_PATTERN}|${CATEGORY_LABEL_PATTERN}|${MEMO_LABEL_PATTERN}`, "g"), "")
    .replace(/[:：]/g, "")
    .replace(/[,.。]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseVoiceExpense(
  text: string,
  categories: VoiceExpenseCategory[],
  baseDate = new Date(),
): VoiceExpenseParseResult {
  const normalizedText = normalizeSpeechText(text);
  let remainingText = normalizedText;
  const warnings: string[] = [];

  const amount = parseAmount(normalizedText);
  if (amount) {
    remainingText = removeFirst(remainingText, amount.text);
  }

  const date = parseDate(normalizedText, baseDate);
  if (date) {
    remainingText = removeFirst(remainingText, date.text);
  } else {
    warnings.push("date_defaulted");
  }

  const category = parseCategory(remainingText, categories);
  if (category) {
    remainingText = removeFirst(remainingText, category.text);
  }

  const explicitMemo = parseExplicitMemo(normalizedText);
  const description = explicitMemo || cleanupDescription(remainingText);
  const missingFields: VoiceExpenseMissingField[] = [];

  if (!amount) {
    missingFields.push("amount");
  }

  if (!category) {
    missingFields.push("category");
    warnings.push("category_unresolved");
  }

  if (!description) {
    missingFields.push("description");
  }

  return {
    rawText: text,
    amount: amount?.value ?? null,
    categoryId: category?.value ?? null,
    date: date?.value ?? formatDate(baseDate),
    description,
    missingFields,
    warnings,
  };
}
