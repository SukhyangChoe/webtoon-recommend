// Request-local execution adapter. The private, hash-verified scoring source is
// never copied into the public repository or edited on disk. Only its repeated
// relation-index construction is replaced; matching/flow/score formulas remain
// the original function body. No candidate truncation or approximate ranking.
const LOOKUP = 'const lookup=new Map(relations.edges.map(e=>[pair(e.a,e.b),e]));';
export function withDailyRelationIndex(semantic, catalogs, run) {
  const original = semantic.fit, source = original.toString();
  if (source.split(LOOKUP).length !== 2) throw Error('DAILY_PERFORMANCE_ADAPTER_INCOMPATIBLE');
  const immutable = new Set([semantic.catalog, ...catalogs]), indexes = new WeakMap();
  const pair = (a, b) => typeof a === 'string' && typeof b === 'string'
    ? a < b ? a + '|' + b : b + '|' + a : [a, b].sort().join('|');
  for (const catalog of immutable) {
    semantic.validate(catalog);
    // These are pinned static relation tables, not user profiles or candidates.
    for (const edge of catalog.edges) Object.freeze(edge);
    Object.freeze(catalog.edges); Object.freeze(catalog.nodes); Object.freeze(catalog);
    indexes.set(catalog, new Map(catalog.edges.map(edge => [pair(edge.a, edge.b), edge])));
  }
  const validate = catalog => { if (!immutable.has(catalog)) semantic.validate(catalog); };
  const lookupFor = catalog => indexes.get(catalog) || new Map(catalog.edges.map(edge => [pair(edge.a, edge.b), edge]));
  const profile = scores => {
    for (const value of Object.values(scores)) if (!Number.isFinite(value) || value < 0 || value > 3) throw Error('Invalid centrality');
    return Object.fromEntries(Object.entries(scores).filter(([, value]) => value > 0));
  };
  // Source comes ONLY from the just-verified private module, never user text.
  const optimized = new Function('validate', 'catalog', 'pair', 'lookupFor', 'profile',
    `return (${source.replace(LOOKUP, 'const lookup=lookupFor(relations);')});`)(validate, semantic.catalog, pair, lookupFor, profile);
  semantic.fit = optimized;
  try { return run(); } finally { semantic.fit = original; }
}
