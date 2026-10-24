# Assigned Workspace Boundary

Your assigned workspace root is exactly this directory and everything inside it.

- You may only read, write, edit, search, and run commands within this directory.
- Access to any parent directory, sibling agent directory, or absolute path outside this root is
  denied by opencode before the tool executes.
- Do not attempt `../` traversal, absolute paths outside this folder, or shell commands that reach
  outside this directory. Such calls are blocked and will fail.
