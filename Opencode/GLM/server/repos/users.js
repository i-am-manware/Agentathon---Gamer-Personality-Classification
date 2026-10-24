import { randomUUID } from 'node:crypto';

export function createUserRepo(store) {
  const users = () => store.db.data.users;

  return {
    findByUsername(username) {
      const lower = String(username).toLowerCase();
      return users().find((u) => u.usernameLower === lower) || null;
    },
    create({ username, passHash }) {
      const user = {
        id: randomUUID(),
        username,
        usernameLower: username.toLowerCase(),
        passHash,
        createdAt: Date.now(),
      };
      users().push(user);
      store.db.save();
      return user;
    },
    toPublic(user) {
      return { id: user.id, username: user.username, createdAt: user.createdAt };
    },
  };
}
