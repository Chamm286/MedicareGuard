const normalizePrefix = (regexp) => {
  if (!regexp || !regexp.source) return "";
  let source = regexp.source;
  source = source.replace(/^\^/, "").replace(/\$$/, "").replace(/\\\/\?\(\?=\\\/\|\$\)/g, "").replace(/\\\/\?$/g, "");
  source = source.replace(/\\\//g, "/").replace(/\/i$/, "");
  if (source === "/?" || source === "/" || source === "") return "";
  return source.startsWith("/") ? source : `/${source}`;
};

const enumerateRoutes = (app) => {
  const routes = [];
  const walk = (stack, prefix = "") => {
    stack.forEach((layer) => {
      if (layer.route) {
        const path = `${prefix}${layer.route.path === "/" ? "" : layer.route.path}` || "/";
        Object.keys(layer.route.methods).forEach((method) => {
          routes.push({ method: method.toUpperCase(), path });
        });
      } else if (layer.name === "router" && layer.handle?.stack) {
        walk(layer.handle.stack, `${prefix}${normalizePrefix(layer.regexp)}`);
      }
    });
  };
  const stack = app._router?.stack || app.router?.stack || [];
  walk(stack);
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
};

module.exports = { enumerateRoutes };
