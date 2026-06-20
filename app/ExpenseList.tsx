"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import ExpenseListDisplay from "@/components/custom/ExpenseListDisplay";
import { useAppContext } from "@/components/custom/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { parseVoiceExpense } from "@/lib/voiceExpenseParser";
import type { Category, Expense } from "@/types";

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  [index: number]: BrowserSpeechRecognitionAlternative | undefined;
}

interface BrowserSpeechRecognitionEvent {
  results: {
    [index: number]: BrowserSpeechRecognitionResult | undefined;
  };
}

interface BrowserSpeechRecognitionErrorEvent {
  error?: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface BrowserSpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
}

const missingFieldLabels: Record<string, string> = {
  amount: "金額",
  category: "分類",
  description: "説明",
};

export default function ExpenseList() {
  const { currentGroup, loading: appLoading, session } = useAppContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const fetchCategories = async (groupId: string) => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, group_id, name, created_at, updated_at")
      .eq("group_id", groupId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }

    setCategories((data ?? []) as Category[]);
  };

  const fetchExpenses = async (groupId: string) => {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, group_id, category_id, created_by, amount, description, date, created_at, updated_at, category:categories!expenses_category_group_fkey(id, name)")
      .eq("group_id", groupId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
      return;
    }

    const normalizedExpenses =
      data?.map((expense) => ({
        ...expense,
        category: Array.isArray(expense.category) ? expense.category[0] ?? null : expense.category,
      })) ?? [];

    setExpenses(normalizedExpenses as Expense[]);
  };

  useEffect(() => {
    const syncGroupData = async () => {
      if (!currentGroup?.id) {
        setExpenses([]);
        setCategories([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchExpenses(currentGroup.id),
        fetchCategories(currentGroup.id),
      ]);
      setLoading(false);
    };

    void syncGroupData();
  }, [currentGroup?.id]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.stop();
    };
  }, []);

  const applyVoiceExpense = (spokenText: string) => {
    const parsedExpense = parseVoiceExpense(spokenText, categories);

    setVoiceTranscript(spokenText);
    setAmount(parsedExpense.amount === null ? "" : String(parsedExpense.amount));
    setDate(parsedExpense.date);
    setSelectedCategory(parsedExpense.categoryId);
    setDescription(parsedExpense.description);
    setVoiceMessage(
      parsedExpense.missingFields.length > 0
        ? `未入力: ${parsedExpense.missingFields.map((field) => missingFieldLabels[field]).join(", ")}`
        : "音声入力をフォームに反映しました。",
    );
  };

  const handleVoiceInput = () => {
    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as BrowserSpeechRecognitionWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceMessage("このブラウザでは音声入力に対応していません。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const spokenText = event.results[0]?.[0]?.transcript?.trim() ?? "";

      if (!spokenText) {
        setVoiceMessage("音声を認識できませんでした。");
        return;
      }

      applyVoiceExpense(spokenText);
    };
    recognition.onerror = (event) => {
      setVoiceMessage(
        event.error ? `音声入力に失敗しました: ${event.error}` : "音声入力に失敗しました。",
      );
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };

    speechRecognitionRef.current = recognition;
    setIsListening(true);
    setVoiceMessage("音声を聞き取っています。");

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      speechRecognitionRef.current = null;
      setVoiceMessage("音声入力を開始できませんでした。");
    }
  };

  const addExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentGroup?.id || !selectedCategory || !session?.user.id) {
      return;
    }

    const { error } = await supabase.from("expenses").insert([
      {
        amount: Number(amount),
        category_id: selectedCategory,
        created_by: session.user.id,
        date: new Date(date).toISOString(),
        description,
        group_id: currentGroup.id,
      },
    ]);

    if (error) {
      console.error("Error adding expense:", error);
      return;
    }

    await fetchExpenses(currentGroup.id);
    setAmount("");
    setDescription("");
    setDate("");
    setSelectedCategory(null);
  };

  if (appLoading || loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (!currentGroup) {
    return <div className="p-4">利用可能なグループがありません。</div>;
  }

  return (
    <div className="p-4">
      <h1 className="mb-2 text-2xl font-bold">支出一覧</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        現在のグループ: {currentGroup.name}
      </p>
      <ExpenseListDisplay expenses={expenses} limit={3} />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>支出を追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addExpense} className="space-y-4">
            <div className="space-y-2 rounded-md border border-input p-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleVoiceInput}
                disabled={categories.length === 0}
              >
                {isListening ? <MicOff /> : <Mic />}
                {isListening ? "停止" : "音声入力"}
              </Button>
              {voiceTranscript ? (
                <p className="text-sm text-muted-foreground">認識: {voiceTranscript}</p>
              ) : null}
              {voiceMessage ? (
                <p className="text-sm text-muted-foreground">{voiceMessage}</p>
              ) : null}
            </div>
            <Input
              type="number"
              placeholder="金額"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              type="date"
              placeholder="日付"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Select
              value={selectedCategory?.toString()}
              onValueChange={(value) => setSelectedCategory(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="分類を選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="説明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <Button type="submit" disabled={categories.length === 0}>
              追加
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
