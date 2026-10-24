import path from "node:path"

const TOOL_PATH_KEYS = {
  read: ["filePath"],
  write: ["filePath"],
  edit: ["filePath"],
  list: ["path"],
  glob: ["path", "pattern"],
  grep: ["path", "include"],
}

const DEFAULT_PATH_KEYS = [
  "filePath",
  "path",
  "pattern",
  "include",
  "dir",
  "directory",
  "file",
  "filename",
  "movePath",
]

const BASH_TOOLS = new Set(["bash", "shell"])
const PATCH_TOOLS = new Set(["patch", "apply_patch"])

function isInside(root, target) {
  const absolute = path.resolve(root, target)
  const relative = path.relative(root, absolute)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function blocked(tool, value) {
  return new Error(
    `[workspace-guard] Blocked "${tool}" call: "${value}" resolves outside this agent's assigned ` +
      `workspace root. An agent may only read and write inside its own root directory; parent ` +
      `directory traversal ("../") and absolute paths outside the root are not permitted.`,
  )
}

function hasTraversal(command) {
  return /(^|[\s"'`=<>|&;])\.\.([\\/]|$|\s|["'`<>|&;])/.test(command)
}

function firstExternalAbsolute(root, command) {
  const candidates = []
  for (const quoted of command.match(/"[^"]*"|'[^']*'/g) || []) {
    candidates.push(quoted.slice(1, -1))
  }
  const unquoted = command.replace(/"[^"]*"|'[^']*'/g, " ")
  for (const raw of unquoted.match(/(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\s"'`<>|&;]*|\\\\[^\s"'`<>|&;]+/g) || []) {
    candidates.push(raw)
  }
  for (const raw of candidates) {
    const candidate = raw.replace(/[.,;:)\]}'"]+$/, "")
    if (!/^([A-Za-z]:[\\/]|\\\\)/.test(candidate)) continue
    if (!isInside(root, candidate)) return candidate
  }
  return undefined
}

function patchPaths(text) {
  const found = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\*\*\* (?:Add|Update|Delete|Move to) File: (.+)\s*$/)
    if (match) found.push(match[1].trim())
  }
  return found
}

export const WorkspaceGuard = async ({ directory }) => {
  const root = path.resolve(directory)

  const assertPath = (tool, value) => {
    if (typeof value !== "string" || value.length === 0) return
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) return
    if (!isInside(root, value)) throw blocked(tool, value)
  }

  const inspect = (tool, args) => {
    if (tool === "webfetch" || tool === "fetch") {
      const url = typeof args.url === "string" ? args.url : ""
      if (url && !/^https?:\/\//i.test(url)) throw blocked(tool, url)
      return
    }

    if (BASH_TOOLS.has(tool)) {
      const command = typeof args.command === "string" ? args.command : ""
      if (hasTraversal(command)) throw blocked(tool, command)
      const external = firstExternalAbsolute(root, command)
      if (external) throw blocked(tool, external)
      return
    }

    if (PATCH_TOOLS.has(tool) || typeof args.patchText === "string") {
      const text = typeof args.patchText === "string" ? args.patchText : ""
      for (const filePath of patchPaths(text)) assertPath(tool, filePath)
      return
    }

    const keys = TOOL_PATH_KEYS[tool] ?? DEFAULT_PATH_KEYS
    for (const key of keys) assertPath(tool, args[key])
  }

  return {
    "tool.execute.before": async (input, output) => {
      inspect(input.tool, output.args ?? {})
    },
  }
}

export default WorkspaceGuard
