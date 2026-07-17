"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageTitle, Flag, AllianceTag } from "@/components/Bits";
import { Avatar } from "@/components/Avatar";
import { IconGear, IconPlus, IconTrash, IconX } from "@/components/icons";
import { useDictionary, useLocale } from "@/components/LocaleProvider";
import { parseTags, PRESET_TAGS } from "@/lib/tags";
import type { CharacterView } from "@/lib/types";

type Row = CharacterView & { tags: string[] };

export default function BlacklistPage() {
  const locale = useLocale();
  const t = useDictionary();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/blacklist")
      .then((r) => r.json())
      .then((d: CharacterView[]) => {
        setRows(d.map((c) => ({ ...c, tags: parseTags(c.blacklistReason) })));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setAdding(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function saveTags(id: number, tags: string[]) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, tags } : r)));
    await fetch("/api/blacklist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, tags }),
    });
  }
  async function remove(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
    await fetch(`/api/blacklist?id=${id}`, { method: "DELETE" });
  }
  function addTag(id: number, tag: string) {
    const r = rows.find((x) => x.id === id);
    if (!r || !tag.trim()) return;
    saveTags(id, [...new Set([...r.tags, tag.trim()])]);
    setCustom("");
    setAdding(null);
  }
  function removeTag(id: number, tag: string) {
    const r = rows.find((x) => x.id === id);
    if (r) saveTags(id, r.tags.filter((x) => x !== tag));
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <PageTitle title={t.blacklist.title} subtitle={t.blacklist.players(rows.length)} />
        <button
          onClick={() => { setEdit((e) => !e); setAdding(null); }}
          title={edit ? t.blacklist.lockEdit : t.blacklist.unlockEdit}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
            edit
              ? "bg-primary-strong/20 text-primary border-primary/40"
              : "glass text-muted hover:text-foreground border-transparent"
          }`}
        >
          <IconGear className="w-4 h-4" />
          {edit ? t.common.editing : t.common.edit}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border border-border bg-surface-2/50 px-3.5 sm:px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2 ${
              adding === r.id ? "relative z-30" : ""
            }`}
          >
            <Avatar src={r.avatar} name={r.nickname} size={40} rounded="rounded-xl" />
            <Flag flag={r.flag} />
            <Link href={`/character/${r.id}`} className="font-semibold text-foreground hover:text-primary">
              {r.nickname}
            </Link>
            <AllianceTag alliance={r.alliance} locale={locale} />
            <Link href={`/server/${r.serverId}`} className="text-subtle text-sm hover:text-foreground">
              #{r.serverId}
            </Link>

            <div className="flex flex-wrap items-center gap-1.5">
              {r.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-danger/15 text-red-300 ring-1 ring-danger/30 px-2.5 py-0.5 text-xs font-medium"
                >
                  {tag}
                  {edit && (
                    <button
                      onClick={() => removeTag(r.id, tag)}
                      className="opacity-70 hover:opacity-100 hover:text-white"
                      title={t.blacklist.removeTag}
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {r.tags.length === 0 && !edit && (
                <span className="text-subtle text-xs italic">{t.blacklist.noReason}</span>
              )}

              {edit && (
                <div className="relative" ref={adding === r.id ? popRef : undefined}>
                  <button
                    onClick={() => setAdding(adding === r.id ? null : r.id)}
                    title={t.blacklist.addTag}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/5 text-muted ring-1 ring-border hover:text-foreground hover:bg-white/10 transition-colors"
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                  </button>
                  {adding === r.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute z-40 top-8 left-0 w-72 rounded-xl p-3 shadow-2xl ring-1 ring-black/50 border border-border-strong"
                      style={{ background: "var(--elevated)" }}
                    >
                      <div className="text-[11px] text-subtle font-semibold uppercase tracking-wider mb-2">
                        {t.blacklist.addReason}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {PRESET_TAGS.filter((t) => !r.tags.includes(t)).map((t) => (
                          <button
                            key={t}
                            onClick={() => addTag(r.id, t)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-danger/10 ring-1 ring-danger/25 text-red-300 hover:bg-danger/25 hover:text-red-200 transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          value={custom}
                          onChange={(e) => setCustom(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") addTag(r.id, custom); }}
                          placeholder={t.blacklist.customTag}
                          className="flex-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary/60"
                        />
                        <button
                          onClick={() => addTag(r.id, custom)}
                          className="text-xs px-3 rounded-lg bg-primary-strong text-white font-medium hover:opacity-90"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <span className="flex-1" />

            {edit && (
              <button
                onClick={() => remove(r.id)}
                title={t.blacklist.remove}
                className="p-1.5 rounded-lg text-danger/40 hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <IconTrash className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}

        {loaded && rows.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-muted">
            {t.blacklist.empty}
          </div>
        )}
      </div>
    </div>
  );
}
