// localStorage can throw (private mode, blocked storage): never let that break the game
export const safeStorage = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  remove: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
