const sessions = new Map();

export const createSession = (id, browser, page) => {
    sessions.set(id, { browser, page });
    return sessions.get(id);
};

export const getSession = id => {
    return sessions.get(id);
};

export const deleteSession = id => {
    return sessions.delete(id);
};
