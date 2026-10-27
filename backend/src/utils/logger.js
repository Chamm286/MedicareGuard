const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const currentLevel = LEVELS[process.env.LOG_LEVEL || "info"] || LEVELS.info;

const write = (level, message, meta) => {
  if (LEVELS[level] < currentLevel) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

module.exports = {
  debug: (message, meta) => write("debug", message, meta),
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};
