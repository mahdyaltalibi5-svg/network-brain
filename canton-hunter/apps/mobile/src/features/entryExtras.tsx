/** Journal extras on an entry: tags and a team notes thread. */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { usePeople } from "@/lib/data";
import { all, insert, myId, patch, softDelete, useTable, type Row } from "@/lib/store";
import { syncSoon } from "@/lib/sync";
import { Button, C, Chip, Row as HRow, Section, T } from "@/ui/kit";

export const cleanTag = (t: string) => t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 24);

/** Tag editor: current tags (tap to remove), suggestions from other entries, and a free-text add. */
export function TagEditor({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const finds = useTable("finds");
  const [draft, setDraft] = useState("");
  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of finds) for (const t of f.tags_user ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const t of ["call-back", "sample-requested", "factory", "gift", "q4", "needs-cert"]) if (!counts.has(t)) counts.set(t, 0);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).filter((t) => !value.includes(t)).slice(0, 8);
  }, [finds, value]);
  const add = (t: string) => { const c = cleanTag(t); if (c && !value.includes(c)) onChange([...value, c]); setDraft(""); };
  return (
    <View>
      <HRow>
        {value.map((t) => <Chip key={t} label={`#${t}  ×`} active onPress={() => onChange(value.filter((x) => x !== t))} />)}
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => add(draft)} placeholder="Add a tag" placeholderTextColor="#A8A4A0"
          autoCapitalize="none" returnKeyType="done" style={st.tagInput} />
      </HRow>
      {suggestions.length ? (
        <HRow style={{ marginTop: 8 }}>
          {suggestions.map((t) => <Pressable key={t} onPress={() => add(t)}><T size={13} dim style={{ paddingVertical: 4 }}>+#{t}</T></Pressable>)}
        </HRow>
      ) : null}
    </View>
  );
}

/** Team notes: a small thread on each entry ("called them back, price is 1.90 at 2k"). */
export function NotesThread({ f }: { f: Row }) {
  useTable("entry_notes");
  const people = usePeople();
  const [text, setText] = useState("");
  const notes = all("entry_notes").filter((n) => n.find_id === f.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  function add() {
    const body = text.trim();
    if (!body) return;
    insert("entry_notes", { find_id: f.id, body });
    setText("");
    syncSoon();
  }
  return (
    <Section title={`Team notes${notes.length ? ` · ${notes.length}` : ""}`}>
      <View style={st.box}>
        {notes.length === 0 ? <T dim size={14} style={{ padding: 14 }}>No notes yet. Add what you learn: callbacks, new prices, what the others think.</T> : null}
        {notes.map((n, i) => (
          <View key={n.id} style={[st.note, i > 0 && st.divider]}>
            <HRow style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <T size={13} bold>{people.get(n.created_by)?.name ?? "Someone"} <T size={13} dim>· {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</T></T>
              {n.created_by === myId() ? <Pressable hitSlop={8} onPress={() => softDelete("entry_notes", n.id)}><T size={12} dim>Delete</T></Pressable> : null}
            </HRow>
            <T size={15} style={{ marginTop: 4 }} selectable>{n.body}</T>
          </View>
        ))}
        <View style={[st.note, notes.length ? st.divider : null, { flexDirection: "row", gap: 10, alignItems: "flex-end" }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a note…" placeholderTextColor="#A8A4A0" multiline style={st.input} />
          <Button title="Add" onPress={add} disabled={!text.trim()} />
        </View>
      </View>
    </Section>
  );
}

export function setTags(f: Row, tags: string[]) {
  patch("finds", f.id, { tags_user: tags });
}

const st = StyleSheet.create({
  box: { backgroundColor: C.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: "hidden" },
  note: { paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  input: { flex: 1, minHeight: 40, fontSize: 15, color: C.text, paddingVertical: 8 },
  tagInput: { minWidth: 120, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: "#D6D3CF", backgroundColor: C.card, fontSize: 14, color: C.text },
});
