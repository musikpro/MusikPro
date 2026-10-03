import { describe, expect, it, vi } from "vitest";
import { scheduleI18nReady } from "@/lib/i18n/ready-schedule";

function fakeWindow() {
  const frames = new Map<number, () => void>();
  const listeners = new Map<string, Set<() => void>>();
  let nextId = 1;
  const win = {
    requestAnimationFrame: vi.fn((callback: () => void) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    }),
    cancelAnimationFrame: vi.fn((id: number) => {
      frames.delete(id);
    }),
    addEventListener: vi.fn((type: string, listener: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener);
    }),
  };
  return {
    win: win as unknown as Parameters<typeof scheduleI18nReady>[0],
    flushFrames() {
      const pending = [...frames.entries()];
      frames.clear();
      for (const [, callback] of pending) callback();
    },
    fire(type: string) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener();
    },
    listenerCount(type: string) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

describe("scheduleI18nReady", () => {
  it("attend l'événement load quand le document est encore en chargement (segment streamé tard)", () => {
    const env = fakeWindow();
    const onReady = vi.fn();
    scheduleI18nReady(env.win, { readyState: "interactive" }, onReady);
    env.flushFrames();
    env.flushFrames();
    expect(onReady).not.toHaveBeenCalled();
    env.fire("load");
    env.flushFrames();
    expect(onReady).not.toHaveBeenCalled();
    env.flushFrames();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(env.listenerCount("load")).toBe(0);
  });

  it("n'attend pas load s'il a déjà eu lieu au montage (readyState complete) : deux frames suffisent", () => {
    const env = fakeWindow();
    const onReady = vi.fn();
    scheduleI18nReady(env.win, { readyState: "complete" }, onReady);
    expect(env.listenerCount("load")).toBe(0);
    env.flushFrames();
    expect(onReady).not.toHaveBeenCalled();
    env.flushFrames();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("l'annulation au démontage empêche l'appel et retire l'écouteur", () => {
    const env = fakeWindow();
    const onReady = vi.fn();
    const cancel = scheduleI18nReady(env.win, { readyState: "loading" }, onReady);
    cancel();
    expect(env.listenerCount("load")).toBe(0);
    env.fire("load");
    env.flushFrames();
    env.flushFrames();
    expect(onReady).not.toHaveBeenCalled();
  });

  it("l'annulation entre les deux frames empêche l'appel", () => {
    const env = fakeWindow();
    const onReady = vi.fn();
    const cancel = scheduleI18nReady(env.win, { readyState: "complete" }, onReady);
    env.flushFrames();
    cancel();
    env.flushFrames();
    expect(onReady).not.toHaveBeenCalled();
  });
});
