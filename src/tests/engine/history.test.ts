import { describe, expect, it } from 'vitest';
import { History } from '../../engine/history';

const make = (log: string[], name: string) => ({
  label: name, execute: () => log.push(`do ${name}`), undo: () => log.push(`undo ${name}`),
});

describe('History', () => {
  it('undoes and redoes in order', () => {
    const log: string[] = [];
    const h = new History();
    h.push(make(log, 'a'));
    h.push(make(log, 'b'));
    h.undo();
    h.undo();
    h.redo();
    expect(log).toEqual(['undo b', 'undo a', 'do a']);
    expect([h.canUndo, h.canRedo]).toEqual([true, true]);
  });

  it('a new edit clears the redo stack', () => {
    const h = new History();
    h.push(make([], 'a'));
    h.undo();
    h.push(make([], 'b'));
    expect(h.canRedo).toBe(false);
  });

  it('keeps only the newest commands past the limit', () => {
    const h = new History(3);
    for (let i = 0; i < 5; i++) h.push(make([], String(i)));
    let n = 0;
    while (h.undo()) n++;
    expect(n).toBe(3);
  });
});
