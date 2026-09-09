/* A disposable, deterministic step player. No DOM, storage or model-time mutation. */
(() => {
  'use strict';
  CSL.createPlayer = ({onChange = () => {}, schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id), interval = 1000} = {}) => {
    let length = 0, index = 0, playing = false, speed = 1, timer = null, generation = 0, disposed = false;
    const snapshot = () => ({length, index, playing, speed, canPlay: length > 1});
    const emit = () => { if (!disposed) onChange(snapshot()); };
    const clear = () => { generation++; if (timer !== null) cancel(timer); timer = null; };
    const pause = (notify = true) => { clear(); playing = false; if (notify) emit(); };
    const queue = () => {
      const ownGeneration = generation;
      timer = schedule(() => {
        timer = null;
        if (disposed || !playing || ownGeneration !== generation) return;
        index = Math.min(index + 1, length - 1);
        if (index >= length - 1) playing = false;
        emit();
        if (playing && !disposed && ownGeneration === generation) queue();
      }, interval / speed);
    };
    const seek = value => {
      if (disposed) return;
      pause(false);
      const n = Number(value);
      if (Number.isFinite(n)) index = Math.max(0, Math.min(Math.trunc(n), Math.max(0, length - 1)));
      emit();
    };
    return {
      get state() { return snapshot(); },
      configure(count, position = 0) {
        if (disposed) return;
        pause(false);
        length = Number.isFinite(Number(count)) ? Math.max(0, Math.trunc(Number(count))) : 0;
        index = Math.max(0, Math.min(Math.trunc(Number(position)) || 0, Math.max(0, length - 1)));
        emit();
      },
      play() {
        if (disposed || length < 2) return false;
        if (playing) { pause(); return false; }
        clear();
        if (index >= length - 1) index = 0;
        playing = true;
        const ownGeneration = generation;
        emit();
        if (playing && !disposed && ownGeneration === generation) queue();
        return true;
      },
      pause: () => pause(),
      seek,
      step: delta => seek(index + Number(delta)),
      setSpeed(value) {
        const next = Number(value);
        if (!Number.isFinite(next) || next < 0.25 || next > 8 || disposed) return;
        speed = next;
        clear();
        emit();
        if (playing) queue();
      },
      dispose() { pause(false); disposed = true; }
    };
  };
})();
