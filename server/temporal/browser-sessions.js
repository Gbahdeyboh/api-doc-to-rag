const sessions = new Map();

export const createSession = (id, browser, page) => sessions.set(id, { browser, page });
export const getSession = id => sessions.get(id);
export const deleteSession = id => sessions.delete(id);
