const sessions = new Map();

export const createSession = (id, browser, page) => {
    sessions.set(id, { browser, page });
    console.log(`[Browser Sessions] Created session: ${id}, Total sessions: ${sessions.size}`);
    return sessions.get(id);
};

export const getSession = id => {
    const session = sessions.get(id);
    if (!session) {
        console.log(`[Browser Sessions] Session not found: ${id}, Available sessions: ${Array.from(sessions.keys()).join(', ')}`);
    }
    return session;
};

export const deleteSession = id => {
    const deleted = sessions.delete(id);
    console.log(`[Browser Sessions] Deleted session: ${id}, Success: ${deleted}, Remaining sessions: ${sessions.size}`);
    return deleted;
};
