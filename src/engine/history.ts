/** Command pattern: every edit is a Command that can run forwards and backwards. */
export interface Command {
  label: string;
  execute: () => void;
  undo: () => void;
}

export class History {
  private past: Command[] = [];
  private future: Command[] = [];
  private readonly limit: number;

  constructor(limit = 100) {
    this.limit = limit;
  }

  /** Record a command that has already been applied. */
  push(cmd: Command): void {
    this.past.push(cmd);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(): boolean {
    const cmd = this.past.pop();
    if (!cmd) return false;
    cmd.undo();
    this.future.push(cmd);
    return true;
  }

  redo(): boolean {
    const cmd = this.future.pop();
    if (!cmd) return false;
    cmd.execute();
    this.past.push(cmd);
    return true;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  clear(): void {
    this.past = [];
    this.future = [];
  }
}
