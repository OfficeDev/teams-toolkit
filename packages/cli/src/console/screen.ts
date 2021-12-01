// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import readline from "readline";

export type ContentCB = () => string;

export class Row {
  private _content: string;
  private _freezed: boolean;

  private cb?: ContentCB;

  constructor(content: string | ContentCB, freezed = false) {
    if (typeof content === "string") {
      this._content = content;
    } else {
      this.cb = content;
      this._content = this.cb();
    }
    this._freezed = freezed;
  }

  get content() {
    return this._content;
  }

  update(content?: string): string {
    if (content) {
      this._content = content;
    } else {
      if (this.cb) {
        this._content = this.cb();
      }
    }
    return this._content;
  }

  removeCB() {
    this.cb = undefined;
  }

  get freezed() {
    return this._freezed;
  }

  freeze() {
    if (!this._freezed) {
      this._freezed = true;
      ScreenManager.getInstance().freeze(this);
    }
  }
}

/**
 * Manages the screen and refresh progresses or questions on time.
 * @todo manage the questions.
 */
export class ScreenManager {
  private static instance: ScreenManager;

  public static getInstance() {
    if (!this.instance) {
      this.instance = new ScreenManager();
    }
    return this.instance;
  }

  private streams: {
    in: NodeJS.ReadStream;
    out: NodeJS.WriteStream;
    err: NodeJS.WriteStream;
  };

  private rows: Row[];
  private cursorY: number;

  // private rl?: Interface;

  private paused: boolean;
  private cacheLogs: [string, boolean][];
  readonly fps;

  private timer?: NodeJS.Timeout;

  private constructor() {
    this.streams = {
      in: process.stdin,
      out: process.stdout,
      err: process.stderr,
    };

    // if input stream is not TTY, it cannot prompt questions and let users answer.
    // if (this.isTTY("in")) {
    //   this.rl = readline.createInterface(this.streams.in, this.streams.out);
    //   this.rl.pause();
    // }

    // no rows when initialize the screen.
    this.rows = [];

    // current row index of the cursor.
    this.cursorY = 0;

    // whether to render the progresses.
    this.paused = false;

    // cache the written logs when pausing the screen.
    this.cacheLogs = [];

    // set fps, 20 if stdout is TTY, otherwise 0.2.
    this.fps = this.isTTY("out") ? 20 : 0.2;

    // show cursor at first
    this.showCursor();
    // localize the cursor position
    this.moveCursorDown(0);
  }

  /**
   * Adds a progress to the out stream.
   * @param message the specified message.
   */
  addProgress(cb: ContentCB): Row {
    const row = new Row(cb);
    this.rows.push(row);
    this.refresh();
    return row;
  }

  /**
   * Writes a message to the out/err stream.
   * @param message the specified message.
   * @param error true if the message is an error message.
   */
  write(message: string, error?: boolean) {
    if (this.paused) {
      this.cacheLogs.push([message, error || false]);
      return;
    }

    this.clearScreen();
    if (error) {
      this.streams.err.write(message);
    } else {
      this.streams.out.write(message);
    }
    this.renderScreen();
  }

  /**
   * Writes the message to the out/err stream and add "\n" to the end.
   * @param message the specified message.
   * @param error true if the message is an error message.
   */
  writeLine(message: string, error?: boolean) {
    this.write(message + "\n", error);
  }

  /**
   * Refreshes progresses and questions of the screen.
   */
  refresh() {
    this.clearTimer();
    this.renderScreen();
    this.setTimer();
  }

  /**
   * Freezes one row of the screen.
   * @param row
   */
  freeze(row: Row) {
    const idx = this.rows.findIndex((r) => r === row);
    if (idx > -1) {
      this.rows.splice(idx, 1);
      this.writeLine(row.update());
    }
  }

  pause() {
    this.paused = true;
    this.clearScreen();
  }

  continue() {
    this.cacheLogs.forEach(([message, error]) => {
      this.write(message, error);
    });
    this.cacheLogs = [];
    this.paused = false;
  }

  private wrap(message: string) {
    if (this.isTTY("out") && message.length > this.streams.out.columns + 10) {
      return message.substring(0, this.streams.out.columns + 10 - 3) + "...";
    }
    return message;
  }

  private setTimer() {
    if (!this.timer && this.rows.length > 0) {
      this.timer = setTimeout(this.refresh.bind(this), 1000 / this.fps);
    }
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Moves the cursor down (dy), also the first char of the row.
   * @param dy
   */
  private moveCursorDown(dy: number) {
    if (!this.isTTY("out")) {
      return;
    }
    // move cursor to the first char of the row.
    readline.cursorTo(this.streams.out, 0, undefined);
    // move cursor to the index row.
    if (readline.moveCursor(this.streams.out, 0, dy)) {
      this.cursorY = this.cursorY + dy;
    }
  }

  /**
   * Clears the no-freezed rows in the out stream.
   */
  private clearScreen() {
    if (!this.isTTY("out")) {
      this.cursorY = 0;
      return;
    }
    this.moveCursorDown(-this.cursorY);
    readline.clearScreenDown(this.streams.out);
    this.showCursor();
  }

  private renderScreen() {
    if (this.paused) {
      return;
    }
    if (this.rows.length > 0) {
      this.hideCursor();
      this.moveCursorDown(-this.cursorY);
      this.rows.forEach((row) => {
        this.streams.out.write(this.wrap(row.update()) + "\n");
        this.cursorY++;
      });
      readline.clearScreenDown(this.streams.out);
    } else {
      this.showCursor();
    }
  }

  /**
   * Shows the cursor.
   */
  private showCursor() {
    if (!this.isTTY("out")) {
      return;
    }
    this.streams.out.write("\x1B[?25h");
  }

  /**
   * Hides cursor
   */
  private hideCursor() {
    if (!this.isTTY("out")) {
      return;
    }
    this.streams.out.write("\x1B[?25l");
  }

  /**
   * Determines whether tty is.
   */
  isTTY(type: "in" | "out" | "err") {
    return this.streams[type].isTTY;
  }
}

export default ScreenManager.getInstance();
