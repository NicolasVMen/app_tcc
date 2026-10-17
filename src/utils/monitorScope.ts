import type { useCallback, useEffect, useRef, useState } from 'react';

/** The monitor's four lifecycle primitives, independent of a visible React root. */
export type MonitorHooks = {
  useCallback: typeof useCallback;
  useEffect: typeof useEffect;
  useRef: typeof useRef;
  useState: typeof useState;
};

type Slot = {
  kind: 'state' | 'ref' | 'callback' | 'effect';
  value?: unknown;
  deps?: readonly unknown[];
  setter?: (value: unknown) => void;
  effect?: () => void | (() => void);
  cleanup?: () => void;
  pending?: boolean;
};
const sameDependencies = (a?: readonly unknown[], b?: readonly unknown[]) =>
  a !== undefined && b !== undefined && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

/**
 * Account-owned observable controller scope. View subscriptions never own its
 * timers/BLE resources. Only explicit disposal runs the controller cleanups.
 * The existing monitor rules use the same primitives in the legacy React hook.
 */
export class MonitorScope<T> {
  private slots: Slot[] = [];
  private cursor = 0;
  private snapshot!: T;
  private started = false;
  private disposed = false;
  private scheduled = false;
  private listeners = new Set<() => void>();
  private readonly hooks: MonitorHooks;

  constructor(private readonly renderMonitor: (hooks: MonitorHooks) => T) {
    this.hooks = {
      useRef: ((initial: unknown) => {
        const slot = this.slot('ref');
        if (!('value' in slot)) slot.value = { current: initial };
        return slot.value;
      }) as MonitorHooks['useRef'],
      useState: ((initial?: unknown) => {
        const slot = this.slot('state');
        if (!('value' in slot)) slot.value = typeof initial === 'function' ? initial() : initial;
        if (!slot.setter) slot.setter = (next: unknown) => {
          if (this.disposed) return;
          const value = typeof next === 'function' ? next(slot.value) : next;
          if (Object.is(slot.value, value)) return;
          slot.value = value;
          this.refresh();
        };
        return [slot.value, slot.setter];
      }) as MonitorHooks['useState'],
      useCallback: ((callback: Function, deps: readonly unknown[]) => {
        const slot = this.slot('callback');
        if (!sameDependencies(slot.deps, deps)) { slot.value = callback; slot.deps = deps; }
        return slot.value;
      }) as MonitorHooks['useCallback'],
      useEffect: ((effect: () => void | (() => void), deps?: readonly unknown[]) => {
        const slot = this.slot('effect');
        if (!sameDependencies(slot.deps, deps)) {
          slot.deps = deps;
          slot.effect = effect;
          slot.pending = true;
        }
      }) as MonitorHooks['useEffect'],
    };
    this.evaluate(); // Snapshot available before the shutdown barrier allows effects.
  }

  private slot(kind: Slot['kind']): Slot {
    const index = this.cursor++;
    const slot = this.slots[index] ?? (this.slots[index] = { kind });
    if (slot.kind !== kind) throw new Error('Monitor lifecycle order changed.');
    return slot;
  }

  private evaluate() {
    this.cursor = 0;
    this.snapshot = this.renderMonitor(this.hooks);
    if (this.cursor !== this.slots.length) throw new Error('Monitor lifecycle length changed.');
  }

  private commitEffects() {
    for (const slot of this.slots) {
      if (this.disposed) return;
      if (slot.kind !== 'effect' || !slot.pending) continue;
      slot.pending = false;
      slot.cleanup?.();
      slot.cleanup = undefined;
      const cleanup = slot.effect?.();
      if (typeof cleanup === 'function') slot.cleanup = cleanup;
    }
  }

  start() {
    if (this.started || this.disposed) return;
    this.started = true;
    this.commitEffects();
  }

  refresh = () => {
    if (this.disposed || this.scheduled) return;
    this.scheduled = true;
    Promise.resolve().then(() => {
      this.scheduled = false;
      if (this.disposed) return;
      this.evaluate();
      if (this.started) this.commitEffects();
      this.listeners.forEach(listener => listener());
    });
  };

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    if (this.disposed) return () => {};
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    for (const slot of this.slots) {
      try { slot.cleanup?.(); } catch (error) { console.warn('Escolta: monitor cleanup failed', error); }
      slot.cleanup = undefined;
    }
  }
}
