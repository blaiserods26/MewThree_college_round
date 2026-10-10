export async function resolve(specifier, context, nextResolve) {
  if (specifier === "bun:test") {
    return {
      format: "module",
      shortCircuit: true,
      url: new URL("./test-shim.mjs", import.meta.url).href,
    };
  }
  return nextResolve(specifier, context);
}
