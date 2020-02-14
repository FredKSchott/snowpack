const equalFn = (a, b) => a === b;
const ERROR = Symbol("error");
function createRoot(fn, detachedOwner) {
  detachedOwner && (Owner = detachedOwner);
  let owner = Owner,
      listener = Listener,
      root = fn.length === 0 ? UNOWNED : createComputationNode(null, null),
      result = undefined,
      disposer = function _dispose() {
    if (RunningClock !== null) {
      RootClock.disposes.add(root);
    } else {
      dispose(root);
    }
  };
  Owner = root;
  Listener = null;
  try {
    result = fn(disposer);
  } catch (err) {
    const fns = lookup(Owner, ERROR);
    if (!fns) throw err;
    fns.forEach(f => f(err));
  } finally {
    Owner && afterNode(Owner);
    Listener = listener;
    Owner = owner;
  }
  return result;
}
function createSignal(value, areEqual) {
  const d = new DataNode(value);
  let setter;
  if (areEqual) {
    let age = -1;
    setter = v => {
      if (!areEqual(v, value)) {
        const time = RootClock.time;
        if (time === age) {
          throw new Error(`Conflicting value update: ${v} is not the same as ${value}`);
        }
        age = time;
        value = v;
        d.next(v);
      }
    };
  } else setter = d.next.bind(d);
  return [d.current.bind(d), setter];
}
function createEffect(fn, value) {
  createComputationNode(fn, value);
}
function createMemo(fn, value, areEqual) {
  var node = createComputationNode(fn, value);
  node.comparator = areEqual || null;
  return () => {
    if (Listener !== null) {
      const state = node.state;
      if ((state & 7) !== 0) {
        liftComputation(node);
      }
      if (node.age === RootClock.time && state === 8) {
        throw new Error("Circular dependency.");
      }
      if ((state & 16) === 0) {
        if (node.log === null) node.log = createLog();
        logRead(node.log);
      }
    }
    return node.value;
  };
}
function sample(fn) {
  let result,
      listener = Listener;
  Listener = null;
  result = fn();
  Listener = listener;
  return result;
}
function onCleanup(fn) {
  if (Owner === null) console.warn("cleanups created outside a `createRoot` or `render` will never be run");else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
}
function createContext(defaultValue) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}
function useContext(context) {
  return lookup(Owner, context.id) || context.defaultValue;
}
function getContextOwner() {
  return Owner;
}
class DataNode {
  constructor(value) {
    this.value = value;
    this.pending = NOTPENDING;
    this.log = null;
  }
  current() {
    if (Listener !== null) {
      if (this.log === null) this.log = createLog();
      logRead(this.log);
    }
    return this.value;
  }
  next(value) {
    if (RunningClock !== null) {
      if (this.pending !== NOTPENDING) {
        if (value !== this.pending) {
          throw new Error("conflicting changes: " + value + " !== " + this.pending);
        }
      } else {
        this.pending = value;
        RootClock.changes.add(this);
      }
    } else {
      if (this.log !== null) {
        this.pending = value;
        RootClock.changes.add(this);
        event();
      } else {
        this.value = value;
      }
    }
    return value;
  }
}
function createComputationNode(fn, value) {
  const node = {
    fn,
    value,
    age: RootClock.time,
    state: 0,
    comparator: null,
    source1: null,
    source1slot: 0,
    sources: null,
    sourceslots: null,
    dependents: null,
    dependentslot: 0,
    dependentcount: 0,
    owner: Owner,
    owned: null,
    log: null,
    context: null,
    cleanups: null,
    afters: null
  };
  if (fn === null) return node;
  let owner = Owner,
      listener = Listener;
  if (owner === null) console.warn("computations created outside a `createRoot` or `render` will never be disposed");
  Owner = Listener = node;
  if (RunningClock === null) {
    toplevelComputation(node);
  } else {
    node.value = node.fn(node.value);
    afterNode(node);
  }
  if (owner && owner !== UNOWNED) {
    if (owner.owned === null) owner.owned = [node];else owner.owned.push(node);
  }
  Owner = owner;
  Listener = listener;
  return node;
}
function createClock() {
  return {
    time: 0,
    changes: new Queue(),
    updates: new Queue(),
    disposes: new Queue()
  };
}
function createLog() {
  return {
    node1: null,
    node1slot: 0,
    nodes: null,
    nodeslots: null
  };
}
class Queue {
  constructor() {
    this.items = [];
    this.count = 0;
  }
  reset() {
    this.count = 0;
  }
  add(item) {
    this.items[this.count++] = item;
  }
  run(fn) {
    let items = this.items;
    for (let i = 0; i < this.count; i++) {
      try {
        const item = items[i];
        items[i] = null;
        fn(item);
      } catch (err) {
        const fns = lookup(Owner, ERROR);
        if (!fns) throw err;
        fns.forEach(f => f(err));
      }
    }
    this.count = 0;
  }
}
let RootClock = createClock(),
    RunningClock = null,
Listener = null,
Owner = null,
Pending = null;
let NOTPENDING = {},
    UNOWNED = createComputationNode(null, null);
function lookup(owner, key) {
  return owner && (owner.context && owner.context[key] || owner.owner && lookup(owner.owner, key));
}
function resolveChildren(children) {
  if (typeof children === "function") return createMemo(() => resolveChildren(children()));
  if (Array.isArray(children)) {
    const results = [];
    for (let i = 0; i < children.length; i++) {
      let result = resolveChildren(children[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children;
}
function createProvider(id) {
  return function provider(props) {
    let rendered;
    createComputationNode(() => {
      Owner.context = {
        [id]: props.value
      };
      rendered = sample(() => resolveChildren(props.children));
    });
    return rendered;
  };
}
function logRead(from) {
  let to = Listener,
      fromslot,
      toslot = to.source1 === null ? -1 : to.sources === null ? 0 : to.sources.length;
  if (from.node1 === null) {
    from.node1 = to;
    from.node1slot = toslot;
    fromslot = -1;
  } else if (from.nodes === null) {
    if (from.node1 === to) return;
    from.nodes = [to];
    from.nodeslots = [toslot];
    fromslot = 0;
  } else {
    fromslot = from.nodes.length;
    if (from.nodes[fromslot - 1] === to) return;
    from.nodes.push(to);
    from.nodeslots.push(toslot);
  }
  if (to.source1 === null) {
    to.source1 = from;
    to.source1slot = fromslot;
  } else if (to.sources === null) {
    to.sources = [from];
    to.sourceslots = [fromslot];
  } else {
    to.sources.push(from);
    to.sourceslots.push(fromslot);
  }
}
function liftComputation(node) {
  if ((node.state & 6) !== 0) {
    applyUpstreamUpdates(node);
  }
  if ((node.state & 1) !== 0) {
    updateNode(node);
  }
  resetComputation(node, 31);
}
function event() {
  let owner = Owner;
  RootClock.updates.reset();
  RootClock.time++;
  try {
    run(RootClock);
  } finally {
    Owner && afterNode(Owner);
    RunningClock = Listener = null;
    Owner = owner;
  }
}
function toplevelComputation(node) {
  RunningClock = RootClock;
  RootClock.changes.reset();
  RootClock.updates.reset();
  try {
    node.value = node.fn(node.value);
    if (RootClock.changes.count > 0 || RootClock.updates.count > 0) {
      RootClock.time++;
      run(RootClock);
    }
  } catch (err) {
    const fns = lookup(Owner, ERROR);
    if (!fns) throw err;
    fns.forEach(f => f(err));
  } finally {
    Owner && afterNode(Owner);
    RunningClock = Owner = Listener = null;
  }
}
function run(clock) {
  let running = RunningClock,
      count = 0;
  RunningClock = clock;
  clock.disposes.reset();
  while (clock.changes.count !== 0 || clock.updates.count !== 0 || clock.disposes.count !== 0) {
    if (count > 0)
      clock.time++;
    clock.changes.run(applyDataChange);
    clock.updates.run(updateNode);
    clock.disposes.run(dispose);
    if (count++ > 1e5) {
      throw new Error("Runaway clock detected");
    }
  }
  RunningClock = running;
}
function applyDataChange(data) {
  data.value = data.pending;
  data.pending = NOTPENDING;
  if (data.log) setComputationState(data.log, stateStale);
}
function updateNode(node) {
  const state = node.state;
  if ((state & 16) === 0) {
    if ((state & 2) !== 0) {
      node.dependents[node.dependentslot++] = null;
      if (node.dependentslot === node.dependentcount) {
        resetComputation(node, 14);
      }
    } else if ((state & 1) !== 0) {
      if ((state & 4) !== 0) {
        liftComputation(node);
      } else if (node.comparator) {
        const current = updateComputation(node);
        const comparator = node.comparator;
        if (!comparator(current, node.value)) {
          markDownstreamComputations(node, false, true);
        }
      } else {
        updateComputation(node);
      }
    }
  }
}
function updateComputation(node) {
  const value = node.value,
        owner = Owner,
        listener = Listener;
  Owner = Listener = node;
  node.state = 8;
  cleanupNode(node, false);
  node.value = node.fn(node.value);
  resetComputation(node, 31);
  Owner = owner;
  Listener = listener;
  return value;
}
function stateStale(node) {
  const time = RootClock.time;
  if (node.age < time) {
    node.state |= 1;
    node.age = time;
    setDownstreamState(node, !!node.comparator);
  }
}
function statePending(node) {
  const time = RootClock.time;
  if (node.age < time) {
    node.state |= 2;
    let dependents = node.dependents || (node.dependents = []);
    dependents[node.dependentcount++] = Pending;
    setDownstreamState(node, true);
  }
}
function pendingStateStale(node) {
  if ((node.state & 2) !== 0) {
    node.state = 1;
    const time = RootClock.time;
    if (node.age < time) {
      node.age = time;
      if (!node.comparator) {
        markDownstreamComputations(node, false, true);
      }
    }
  }
}
function setDownstreamState(node, pending) {
  RootClock.updates.add(node);
  if (node.comparator) {
    const pending = Pending;
    Pending = node;
    markDownstreamComputations(node, true, false);
    Pending = pending;
  } else {
    markDownstreamComputations(node, pending, false);
  }
}
function markDownstreamComputations(node, onchange, dirty) {
  const owned = node.owned;
  if (owned !== null) {
    const pending = onchange && !dirty;
    markForDisposal(owned, pending, RootClock.time);
  }
  const log = node.log;
  if (log !== null) {
    setComputationState(log, dirty ? pendingStateStale : onchange ? statePending : stateStale);
  }
}
function setComputationState(log, stateFn) {
  const node1 = log.node1,
        nodes = log.nodes;
  if (node1 !== null) stateFn(node1);
  if (nodes !== null) {
    for (let i = 0, ln = nodes.length; i < ln; i++) {
      stateFn(nodes[i]);
    }
  }
}
function markForDisposal(children, pending, time) {
  for (let i = 0, ln = children.length; i < ln; i++) {
    const child = children[i];
    if (child !== null) {
      if (pending) {
        if ((child.state & 16) === 0) {
          child.state |= 4;
        }
      } else {
        child.age = time;
        child.state = 16;
      }
      const owned = child.owned;
      if (owned !== null) markForDisposal(owned, pending, time);
    }
  }
}
function applyUpstreamUpdates(node) {
  if ((node.state & 4) !== 0) {
    const owner = node.owner;
    if ((owner.state & 7) !== 0) liftComputation(owner);
    node.state &= ~4;
  }
  if ((node.state & 2) !== 0) {
    const slots = node.dependents;
    for (let i = node.dependentslot, ln = node.dependentcount; i < ln; i++) {
      const slot = slots[i];
      if (slot != null) liftComputation(slot);
      slots[i] = null;
    }
    node.state &= ~2;
  }
}
function cleanupNode(node, final) {
  let source1 = node.source1,
      sources = node.sources,
      sourceslots = node.sourceslots,
      cleanups = node.cleanups,
      owned = node.owned,
      i,
      len;
  if (cleanups !== null) {
    for (i = 0; i < cleanups.length; i++) {
      cleanups[i](final);
    }
    node.cleanups = null;
  }
  node.context = null;
  if (owned !== null) {
    for (i = 0; i < owned.length; i++) {
      dispose(owned[i]);
    }
    node.owned = null;
  }
  if (source1 !== null) {
    cleanupSource(source1, node.source1slot);
    node.source1 = null;
  }
  if (sources !== null) {
    for (i = 0, len = sources.length; i < len; i++) {
      cleanupSource(sources.pop(), sourceslots.pop());
    }
  }
}
function cleanupSource(source, slot) {
  let nodes = source.nodes,
      nodeslots = source.nodeslots,
      last,
      lastslot;
  if (slot === -1) {
    source.node1 = null;
  } else {
    last = nodes.pop();
    lastslot = nodeslots.pop();
    if (slot !== nodes.length) {
      nodes[slot] = last;
      nodeslots[slot] = lastslot;
      if (lastslot === -1) {
        last.source1slot = slot;
      } else {
        last.sourceslots[lastslot] = slot;
      }
    }
  }
}
function afterNode(node) {
  const afters = node.afters;
  if (afters !== null) {
    for (let i = 0; i < afters.length; i++) afters[i]();
    node.afters = null;
  }
}
function resetComputation(node, flags) {
  node.state &= ~flags;
  node.dependentslot = 0;
  node.dependentcount = 0;
}
function dispose(node) {
  node.fn = null;
  node.log = null;
  node.dependents = null;
  cleanupNode(node, true);
  resetComputation(node, 31);
}

const FALLBACK = Symbol("fallback");
function mapArray(list, mapFn, options) {
  if (typeof mapFn !== "function") {
    options = mapFn || {};
    mapFn = list;
    return map;
  }
  options || (options = {});
  return map(list);
  function map(list) {
    let items = [],
        mapped = [],
        disposers = [],
        len = 0;
    onCleanup(() => {
      for (let i = 0, length = disposers.length; i < length; i++) disposers[i]();
    });
    return () => {
      let newItems = list() || [],
          i,
          j;
      return sample(() => {
        let newLen = newItems.length,
            newIndices,
            newIndicesNext,
            temp,
            tempdisposers,
            start,
            end,
            newEnd,
            item;
        if (newLen === 0) {
          if (len !== 0) {
            for (i = 0; i < len; i++) disposers[i]();
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot(disposer => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
        }
        else if (len === 0) {
            for (j = 0; j < newLen; j++) {
              items[j] = newItems[j];
              mapped[j] = createRoot(mapper);
            }
            len = newLen;
          } else {
            temp = new Array(newLen);
            tempdisposers = new Array(newLen);
            for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++);
            for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
              temp[newEnd] = mapped[end];
              tempdisposers[newEnd] = disposers[end];
            }
            if (start > newEnd) {
              for (j = end; start <= j; j--) disposers[j]();
              const rLen = end - start + 1;
              if (rLen > 0) {
                mapped.splice(start, rLen);
                disposers.splice(start, rLen);
              }
              items = newItems.slice(0);
              len = newLen;
              return mapped;
            }
            if (start > end) {
              for (j = start; j <= newEnd; j++) mapped[j] = createRoot(mapper);
              for (; j < newLen; j++) {
                mapped[j] = temp[j];
                disposers[j] = tempdisposers[j];
              }
              items = newItems.slice(0);
              len = newLen;
              return mapped;
            }
            newIndices = new Map();
            newIndicesNext = new Array(newEnd + 1);
            for (j = newEnd; j >= start; j--) {
              item = newItems[j];
              i = newIndices.get(item);
              newIndicesNext[j] = i === undefined ? -1 : i;
              newIndices.set(item, j);
            }
            for (i = start; i <= end; i++) {
              item = items[i];
              j = newIndices.get(item);
              if (j !== undefined && j !== -1) {
                temp[j] = mapped[i];
                tempdisposers[j] = disposers[i];
                j = newIndicesNext[j];
                newIndices.set(item, j);
              } else disposers[i]();
            }
            for (j = start; j < newLen; j++) {
              if (j in temp) {
                mapped[j] = temp[j];
                disposers[j] = tempdisposers[j];
              } else mapped[j] = createRoot(mapper);
            }
            len = mapped.length = newLen;
            items = newItems.slice(0);
          }
        return mapped;
      });
      function mapper(disposer) {
        disposers[j] = disposer;
        return mapFn(newItems[j], j);
      }
    };
  }
}

const runtimeConfig = {};

function createActivityTracker() {
  let count = 0,
      active = false;
  const [read, trigger] = createSignal();
  return [() => (read(), active), () => count++ === 0 && (active = true, trigger()), () => --count <= 0 && (active = false, trigger())];
}
const SuspenseContext = createContext({});
const [active, increment, decrement] = createActivityTracker();
SuspenseContext.active = active;
SuspenseContext.increment = increment;
SuspenseContext.decrement = decrement;
function awaitSuspense(fn) {
  const {
    state
  } = useContext(SuspenseContext);
  let cached;
  return state ? () => state() === "suspended" ? cached : cached = fn() : fn;
}

const Types = {
  ATTRIBUTE: "attribute",
  PROPERTY: "property"
},
      Attributes = {
  href: {
    type: Types.ATTRIBUTE
  },
  style: {
    type: Types.PROPERTY,
    alias: "style.cssText"
  },
  for: {
    type: Types.PROPERTY,
    alias: "htmlFor"
  },
  class: {
    type: Types.PROPERTY,
    alias: "className"
  },
  spellCheck: {
    type: Types.PROPERTY,
    alias: "spellcheck"
  },
  allowFullScreen: {
    type: Types.PROPERTY,
    alias: "allowFullscreen"
  },
  autoCapitalize: {
    type: Types.PROPERTY,
    alias: "autocapitalize"
  },
  autoFocus: {
    type: Types.PROPERTY,
    alias: "autofocus"
  },
  autoPlay: {
    type: Types.PROPERTY,
    alias: "autoplay"
  }
},
      SVGAttributes = {
  className: {
    type: Types.ATTRIBUTE,
    alias: "class"
  },
  htmlFor: {
    type: Types.ATTRIBUTE,
    alias: "for"
  },
  tabIndex: {
    type: Types.ATTRIBUTE,
    alias: "tabindex"
  },
  allowReorder: {
    type: Types.ATTRIBUTE
  },
  attributeName: {
    type: Types.ATTRIBUTE
  },
  attributeType: {
    type: Types.ATTRIBUTE
  },
  autoReverse: {
    type: Types.ATTRIBUTE
  },
  baseFrequency: {
    type: Types.ATTRIBUTE
  },
  calcMode: {
    type: Types.ATTRIBUTE
  },
  clipPathUnits: {
    type: Types.ATTRIBUTE
  },
  contentScriptType: {
    type: Types.ATTRIBUTE
  },
  contentStyleType: {
    type: Types.ATTRIBUTE
  },
  diffuseConstant: {
    type: Types.ATTRIBUTE
  },
  edgeMode: {
    type: Types.ATTRIBUTE
  },
  externalResourcesRequired: {
    type: Types.ATTRIBUTE
  },
  filterRes: {
    type: Types.ATTRIBUTE
  },
  filterUnits: {
    type: Types.ATTRIBUTE
  },
  gradientTransform: {
    type: Types.ATTRIBUTE
  },
  gradientUnits: {
    type: Types.ATTRIBUTE
  },
  kernelMatrix: {
    type: Types.ATTRIBUTE
  },
  kernelUnitLength: {
    type: Types.ATTRIBUTE
  },
  keyPoints: {
    type: Types.ATTRIBUTE
  },
  keySplines: {
    type: Types.ATTRIBUTE
  },
  keyTimes: {
    type: Types.ATTRIBUTE
  },
  lengthAdjust: {
    type: Types.ATTRIBUTE
  },
  limitingConeAngle: {
    type: Types.ATTRIBUTE
  },
  markerHeight: {
    type: Types.ATTRIBUTE
  },
  markerUnits: {
    type: Types.ATTRIBUTE
  },
  maskContentUnits: {
    type: Types.ATTRIBUTE
  },
  maskUnits: {
    type: Types.ATTRIBUTE
  },
  numOctaves: {
    type: Types.ATTRIBUTE
  },
  pathLength: {
    type: Types.ATTRIBUTE
  },
  patternContentUnits: {
    type: Types.ATTRIBUTE
  },
  patternTransform: {
    type: Types.ATTRIBUTE
  },
  patternUnits: {
    type: Types.ATTRIBUTE
  },
  pointsAtX: {
    type: Types.ATTRIBUTE
  },
  pointsAtY: {
    type: Types.ATTRIBUTE
  },
  pointsAtZ: {
    type: Types.ATTRIBUTE
  },
  preserveAlpha: {
    type: Types.ATTRIBUTE
  },
  preserveAspectRatio: {
    type: Types.ATTRIBUTE
  },
  primitiveUnits: {
    type: Types.ATTRIBUTE
  },
  refX: {
    type: Types.ATTRIBUTE
  },
  refY: {
    type: Types.ATTRIBUTE
  },
  repeatCount: {
    type: Types.ATTRIBUTE
  },
  repeatDur: {
    type: Types.ATTRIBUTE
  },
  requiredExtensions: {
    type: Types.ATTRIBUTE
  },
  requiredFeatures: {
    type: Types.ATTRIBUTE
  },
  specularConstant: {
    type: Types.ATTRIBUTE
  },
  specularExponent: {
    type: Types.ATTRIBUTE
  },
  spreadMethod: {
    type: Types.ATTRIBUTE
  },
  startOffset: {
    type: Types.ATTRIBUTE
  },
  stdDeviation: {
    type: Types.ATTRIBUTE
  },
  stitchTiles: {
    type: Types.ATTRIBUTE
  },
  surfaceScale: {
    type: Types.ATTRIBUTE
  },
  systemLanguage: {
    type: Types.ATTRIBUTE
  },
  tableValues: {
    type: Types.ATTRIBUTE
  },
  targetX: {
    type: Types.ATTRIBUTE
  },
  targetY: {
    type: Types.ATTRIBUTE
  },
  textLength: {
    type: Types.ATTRIBUTE
  },
  viewBox: {
    type: Types.ATTRIBUTE
  },
  viewTarget: {
    type: Types.ATTRIBUTE
  },
  xChannelSelector: {
    type: Types.ATTRIBUTE
  },
  yChannelSelector: {
    type: Types.ATTRIBUTE
  },
  zoomAndPan: {
    type: Types.ATTRIBUTE
  }
};
const NonComposedEvents = new Set(["abort", "animationstart", "animationend", "animationiteration", "blur", "change", "copy", "cut", "error", "focus", "load", "loadend", "loadstart", "mouseenter", "mouseleave", "paste", "progress", "reset", "select", "submit", "transitionstart", "transitioncancel", "transitionend", "transitionrun"]);

const eventRegistry = new Set();
const config = runtimeConfig;
function template(html, isSVG) {
  const t = document.createElement('template');
  t.innerHTML = html;
  if (t.innerHTML !== html) throw new Error(`Template html does not match input:\n${t.innerHTML}\n${html}`);
  let node = t.content.firstChild;
  if (isSVG) node = node.firstChild;
  return node;
}
function createComponent(Comp, props, dynamicKeys) {
  if (dynamicKeys) {
    for (let i = 0; i < dynamicKeys.length; i++) dynamicProp(props, dynamicKeys[i]);
  }
  return sample(() => Comp(props));
}
function delegateEvents(eventNames) {
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!eventRegistry.has(name)) {
      eventRegistry.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}
function clearDelegatedEvents() {
  for (let name of eventRegistry.keys()) document.removeEventListener(name, eventHandler);
  eventRegistry.clear();
}
function classList(node, value, prev) {
  const classKeys = Object.keys(value);
  for (let i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
          classValue = value[key],
          classNames = key.split(/\s+/);
    if (prev && prev[key] === classValue) continue;
    for (let j = 0, nameLen = classNames.length; j < nameLen; j++) node.classList.toggle(classNames[j], classValue);
  }
}
function spread(node, accessor, isSVG, skipChildren) {
  if (typeof accessor === 'function') {
    createEffect(current => spreadExpression(node, accessor(), current, isSVG, skipChildren));
  } else spreadExpression(node, accessor, undefined, isSVG, skipChildren);
}
function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== 'function') return insertExpression(parent, accessor, initial, marker);
  createEffect(current => insertExpression(parent, accessor(), current, marker), initial);
}
function renderToString(code, options = {}) {
  options = {
    timeoutMs: 10000,
    ...options
  };
  config.hydrate = {
    id: '',
    count: 0
  };
  const container = document.createElement("div");
  return new Promise(resolve => {
    setTimeout(() => resolve(container.innerHTML), options.timeoutMs);
    if (!code.length) {
      insert(container, code());
      resolve(container.innerHTML);
    } else insert(container, code(() => resolve(container.innerHTML)));
  });
}
function hydrate(code, root) {
  config.hydrate = {
    id: '',
    count: 0,
    registry: new Map()
  };
  const templates = root.querySelectorAll(`*[_hk]`);
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    config.hydrate.registry.set(node.getAttribute('_hk'), node);
  }
  code();
  delete config.hydrate;
}
function getNextElement(template, isSSR) {
  const hydrate = config.hydrate;
  let node, key;
  if (!hydrate || !hydrate.registry || !(node = hydrate.registry.get(key = `${hydrate.id}:${hydrate.count++}`))) {
    const el = template.cloneNode(true);
    if (isSSR && hydrate) el.setAttribute('_hk', `${hydrate.id}:${hydrate.count++}`);
    return el;
  }
  if (window && window._$HYDRATION) window._$HYDRATION.completed.add(key);
  return node;
}
function getNextMarker(start) {
  let end = start,
      count = 0,
      current = [];
  if (config.hydrate && config.hydrate.registry) {
    while (end) {
      if (end.nodeType === 8) {
        const v = end.nodeValue;
        if (v === "#") count++;else if (v === "/") {
          if (count === 0) return [end, current];
          count--;
        }
      }
      current.push(end);
      end = end.nextSibling;
    }
  }
  return [end, current];
}
function runHydrationEvents(id) {
  if (window && window._$HYDRATION) {
    const {
      completed,
      events
    } = window._$HYDRATION;
    while (events.length) {
      const [id, e] = events[0];
      if (!completed.has(id)) return;
      eventHandler(e);
      events.shift();
    }
  }
}
function generateHydrationEventsScript(eventNames) {
  return `!function(){function t(t){const e=function t(e){return e&&(e.getAttribute("_hk")||t(e.host&&e.host instanceof Node?e.host:e.parentNode))}(t.composedPath&&t.composedPath()[0]||t.target);e&&!window._$HYDRATION.completed.has(e)&&window._$HYDRATION.events.push([e,t])}window._$HYDRATION={events:[],completed:new Set},["${eventNames.join('","')}"].forEach(e=>document.addEventListener(e,t))}();`;
}
function dynamicProp(props, key) {
  const src = props[key];
  Object.defineProperty(props, key, {
    get() {
      return src();
    },
    enumerable: true
  });
}
function lookup$1(el) {
  return el && (el.model || lookup$1(el.host || el.parentNode));
}
function eventHandler(e) {
  const key = `__${e.type}`;
  let node = e.composedPath && e.composedPath()[0] || e.target;
  if (e.target !== node) {
    Object.defineProperty(e, 'target', {
      configurable: true,
      value: node
    });
  }
  Object.defineProperty(e, 'currentTarget', {
    configurable: true,
    get() {
      return node;
    }
  });
  while (node !== null) {
    const handler = node[key];
    if (handler) {
      const model = handler.length > 1 ? lookup$1(node) : undefined;
      handler(e, model);
      if (e.cancelBubble) return;
    }
    node = node.host && node.host instanceof Node ? node.host : node.parentNode;
  }
}
function spreadExpression(node, props, prevProps = {}, isSVG, skipChildren) {
  let info;
  if (!skipChildren && "children" in props) {
    createEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children));
  }
  createEffect(() => {
    for (const prop in props) {
      if (prop === "children") continue;
      const value = props[prop];
      if (value === prevProps[prop]) continue;
      if (prop === "style") {
        Object.assign(node.style, value);
      } else if (prop === "classList") {
        classList(node, value, prevProps[prop]);
      } else if (prop === "ref" || prop === "forwardRef") {
        value(node);
      } else if (prop.slice(0, 2) === "on") {
        const lc = prop.toLowerCase();
        if (lc !== prop && !NonComposedEvents.has(lc.slice(2))) {
          const name = lc.slice(2);
          node[`__${name}`] = value;
          delegateEvents([name]);
        } else node[lc] = value;
      } else if (prop === "events") {
        for (const eventName in value) node.addEventListener(eventName, value[eventName]);
      } else if (info = Attributes[prop]) {
        if (info.type === "attribute") {
          node.setAttribute(prop, value);
        } else node[info.alias] = value;
      } else if (isSVG) {
        if (info = SVGAttributes[prop]) {
          if (info.alias) node.setAttribute(info.alias, value);else node.setAttribute(prop, value);
        } else node.setAttribute(prop.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`), value);
      } else node[prop] = value;
      prevProps[prop] = value;
    }
  });
  return prevProps;
}
function normalizeIncomingArray(normalized, array, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
        t;
    if (item instanceof Node) {
      normalized.push(item);
    } else if (item == null || item === true || item === false) ; else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item) || dynamic;
    } else if ((t = typeof item) === 'string') {
      normalized.push(document.createTextNode(item));
    } else if (t === 'function') {
      if (unwrap) {
        const idx = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(idx) ? idx : [idx]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else normalized.push(document.createTextNode(item.toString()));
  }
  return dynamic;
}
function appendNodes(parent, array, marker) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return parent.textContent = '';
  const node = replacement || document.createTextNode('');
  if (current.length) {
    node !== current[0] && parent.replaceChild(node, current[0]);
    for (let i = current.length - 1; i > 0; i--) parent.removeChild(current[i]);
  } else parent.insertBefore(node, marker);
  return [node];
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value,
        multi = marker !== undefined;
  parent = multi && current[0] && current[0].parentNode || parent;
  if (t === 'string' || t === 'number') {
    if (t === 'number') value = value.toString();
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data = value;
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== '' && typeof current === 'string') {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === 'boolean') {
    if (config.hydrate && config.hydrate.registry) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === 'function') {
    createEffect(() => current = insertExpression(parent, value(), current, marker));
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    if (normalizeIncomingArray(array, value, unwrapArray)) {
      createEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }
    if (config.hydrate && config.hydrate.registry) return current;
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else {
      if (Array.isArray(current)) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else reconcileArrays(parent, current, array);
      } else if (current == null || current === '') {
        appendNodes(parent, array);
      } else {
        reconcileArrays(parent, multi && current || [parent.firstChild], array);
      }
    }
    current = array;
  } else if (value instanceof Node) {
    if (Array.isArray(current)) {
      if (multi) return current = cleanChildren(parent, current, marker, value);
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === '') {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  }
  return current;
}
var NOMATCH = -1;
function reconcileArrays(parent, ns, us) {
  var ulen = us.length,
  nmin = 0,
      nmax = ns.length - 1,
      umin = 0,
      umax = ulen - 1,
  n = ns[nmin],
      u = us[umin],
  nx = ns[nmax],
      ux = us[umax],
  ul = nx.nextSibling,
      i,
      loop = true;
  fixes: while (loop) {
    loop = false;
    while (u === n) {
      umin++;
      nmin++;
      if (umin > umax || nmin > nmax) break fixes;
      u = us[umin];
      n = ns[nmin];
    }
    while (ux === nx) {
      ul = nx;
      umax--;
      nmax--;
      if (umin > umax || nmin > nmax) break fixes;
      ux = us[umax];
      nx = ns[nmax];
    }
    while (u === nx) {
      loop = true;
      parent.insertBefore(nx, n);
      umin++;
      nmax--;
      if (umin > umax || nmin > nmax) break fixes;
      u = us[umin];
      nx = ns[nmax];
    }
    while (ux === n) {
      loop = true;
      if (ul === null) parent.appendChild(n);else parent.insertBefore(n, ul);
      ul = n;
      umax--;
      nmin++;
      if (umin > umax || nmin > nmax) break fixes;
      ux = us[umax];
      n = ns[nmin];
    }
  }
  if (umin > umax) {
    while (nmin <= nmax) {
      parent.removeChild(ns[nmax]);
      nmax--;
    }
    return;
  }
  if (nmin > nmax) {
    while (umin <= umax) {
      parent.insertBefore(us[umin], ul);
      umin++;
    }
    return;
  }
  const P = new Array(umax - umin + 1),
        I = new Map();
  for (let i = umin; i <= umax; i++) {
    P[i] = NOMATCH;
    I.set(us[i], i);
  }
  let reusingNodes = umin + us.length - 1 - umax,
      toRemove = [];
  for (let i = nmin; i <= nmax; i++) {
    if (I.has(ns[i])) {
      P[I.get(ns[i])] = i;
      reusingNodes++;
    } else toRemove.push(i);
  }
  if (reusingNodes === 0) {
    if (n !== parent.firstChild || nx !== parent.lastChild) {
      for (i = nmin; i <= nmax; i++) parent.removeChild(ns[i]);
      while (umin <= umax) {
        parent.insertBefore(us[umin], ul);
        umin++;
      }
      return;
    }
    parent.textContent = '';
    while (umin <= umax) {
      parent.appendChild(us[umin]);
      umin++;
    }
    return;
  }
  var lcs = longestPositiveIncreasingSubsequence(P, umin),
      nodes = [],
      tmp = ns[nmin],
      lisIdx = lcs.length - 1,
      tmpB;
  for (let i = nmin; i <= nmax; i++) {
    nodes[i] = tmp;
    tmp = tmp.nextSibling;
  }
  for (let i = 0; i < toRemove.length; i++) parent.removeChild(nodes[toRemove[i]]);
  for (let i = umax; i >= umin; i--) {
    if (lcs[lisIdx] === i) {
      ul = nodes[P[lcs[lisIdx]]];
      lisIdx--;
    } else {
      tmpB = P[i] === NOMATCH ? us[i] : nodes[P[i]];
      parent.insertBefore(tmpB, ul);
      ul = tmpB;
    }
  }
}
function longestPositiveIncreasingSubsequence(ns, newStart) {
  let seq = [],
      is = [],
      l = -1,
      pre = new Array(ns.length);
  for (let i = newStart, len = ns.length; i < len; i++) {
    let n = ns[i];
    if (n < 0) continue;
    let j = findGreatestIndexLEQ(seq, n);
    if (j !== -1) pre[i] = is[j];
    if (j === l) {
      l++;
      seq[l] = n;
      is[l] = i;
    } else if (n < seq[j + 1]) {
      seq[j + 1] = n;
      is[j + 1] = i;
    }
  }
  for (let i = is[l]; l >= 0; i = pre[i], l--) {
    seq[l] = i;
  }
  return seq;
}
function findGreatestIndexLEQ(seq, n) {
  var lo = -1,
      hi = seq.length;
  if (hi > 0 && seq[hi - 1] <= n) return hi - 1;
  while (hi - lo > 1) {
    var mid = Math.floor((lo + hi) / 2);
    if (seq[mid] > n) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return lo;
}

const SuspenseListContext = createContext();
function SuspenseList(props) {
  let index = 0,
      suspenseSetter,
      showContent,
      showFallback;
  const listContext = useContext(SuspenseListContext);
  if (listContext) {
    const [state, stateSetter] = createSignal("running", equalFn);
    suspenseSetter = stateSetter;
    [showContent, showFallback] = listContext.register(state);
  }
  const registry = [],
        comp = createComponent(SuspenseListContext.Provider, {
    value: {
      register: state => {
        const [showingContent, showContent] = createSignal(false, equalFn),
              [showingFallback, showFallback] = createSignal(false, equalFn);
        registry[index++] = {
          state,
          showContent,
          showFallback
        };
        return [showingContent, showingFallback];
      }
    },
    children: () => props.children
  }, ["children"]);
  createEffect(() => {
    const reveal = props.revealOrder,
          tail = props.tail,
          visibleContent = showContent ? showContent() : true,
          visibleFallback = showFallback ? showFallback() : true,
          reverse = reveal === "backwards";
    if (reveal === "together") {
      const all = registry.every(i => i.state() === "running");
      suspenseSetter && suspenseSetter(all ? "running" : "fallback");
      registry.forEach(i => {
        i.showContent(all && visibleContent);
        i.showFallback(visibleFallback);
      });
      return;
    }
    let stop = false;
    for (let i = 0, len = registry.length; i < len; i++) {
      const n = reverse ? len - i - 1 : i,
            s = registry[n].state();
      if (!stop && (s === "running" || s === "suspended")) {
        registry[n].showContent(visibleContent);
        registry[n].showFallback(visibleFallback);
      } else {
        const next = !stop;
        if (next && suspenseSetter) suspenseSetter("fallback");
        if (!tail || next && tail === "collapsed") {
          registry[n].showFallback(visibleFallback);
        } else registry[n].showFallback(false);
        stop = true;
        registry[n].showContent(next);
      }
    }
    if (!stop && suspenseSetter) suspenseSetter("running");
  });
  return comp;
}
function Suspense(props) {
  let counter = 0,
      t,
      state = "running",
      showContent,
      showFallback,
      transition;
  const [get, next] = createSignal(),
        store = {
    increment: () => {
      if (++counter === 1) {
        if (!store.initializing) {
          if (SuspenseContext.transition) {
            state = "suspended";
            !transition && (transition = SuspenseContext.transition).increment();
            t = setTimeout(() => (state = "fallback", next()), SuspenseContext.transition.timeoutMs);
          } else state = "fallback";
          next();
        } else state = "fallback";
        SuspenseContext.increment();
      }
    },
    decrement: () => {
      if (--counter === 0) {
        t && clearTimeout(t);
        if (state !== "running") {
          state = "running";
          transition && transition.decrement();
          transition = undefined;
          next();
          SuspenseContext.decrement();
        }
      }
    },
    state: () => {
      get();
      return state;
    },
    initializing: true
  };
  const listContext = useContext(SuspenseListContext);
  if (listContext) [showContent, showFallback] = listContext.register(store.state);
  return createComponent(SuspenseContext.Provider, {
    value: store,
    children: () => {
      let dispose;
      const rendered = sample(() => props.children),
            marker = document.createTextNode(""),
            doc = document.implementation.createHTMLDocument();
      Object.defineProperty(doc.body, "host", {
        get() {
          return marker && marker.parentNode;
        }
      });
      return () => {
        const value = store.state(),
              visibleContent = showContent ? showContent() : true,
              visibleFallback = showFallback ? showFallback() : true;
        if (store.initializing) store.initializing = false;
        dispose && dispose();
        dispose = null;
        if (value === "running" && visibleContent || value === "suspended") return [marker, rendered];
        if (!visibleFallback) return [marker];
        return [marker, props.fallback];
      };
    }
  }, ["children"]);
}

function render(code, element) {
  let disposer;
  createRoot(dispose => {
    disposer = dispose;
    insert(element, code());
  });
  return disposer;
}
function renderToString$1(code, options) {
  return createRoot(dispose => renderToString(done => {
    const rendered = code();
    createEffect(() => {
      if (!SuspenseContext.active()) {
        dispose();
        done();
      }
    });
    return rendered;
  }, options));
}
function hydrate$1(code, element) {
  let disposer;
  hydrate(() => {
    disposer = render(code, element);
  }, element);
  return disposer;
}
function wrapCondition(fn) {
  return createMemo(fn, undefined, equalFn);
}
function For(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  },
        mapped = awaitSuspense(createMemo(mapArray(() => props.each, props.children, fallback ? fallback : undefined)));
  return props.transform ? props.transform(mapped) : mapped;
}
function Show(props) {
  const useFallback = "fallback" in props,
        condition = createMemo(() => !!props.when, undefined, equalFn),
        mapped = awaitSuspense(createMemo(() => condition() ? sample(() => props.children) : useFallback ? sample(() => props.fallback) : undefined));
  return props.transform ? props.transform(mapped) : mapped;
}
function Switch(props) {
  let conditions = props.children;
  Array.isArray(conditions) || (conditions = [conditions]);
  const useFallback = "fallback" in props,
        evalConditions = createMemo(() => {
    for (let i = 0; i < conditions.length; i++) {
      if (conditions[i].when) return i;
    }
    return -1;
  }, undefined, equalFn),
        mapped = awaitSuspense(createMemo(() => {
    const index = evalConditions();
    return sample(() => index < 0 ? useFallback && props.fallback : conditions[index].children);
  }));
  return props.transform ? props.transform(mapped) : mapped;
}
function Match(props) {
  return props;
}
function Portal(props) {
  const {
    useShadow
  } = props,
        container = document.createElement("div"),
        marker = document.createTextNode(""),
        mount = props.mount || document.body,
        renderRoot = useShadow && container.attachShadow ? container.attachShadow({
    mode: "open"
  }) : container;
  Object.defineProperty(container, "host", {
    get() {
      return marker.parentNode;
    }
  });
  insert(renderRoot, sample(() => props.children));
  mount.appendChild(container);
  props.ref && props.ref(container);
  onCleanup(() => mount.removeChild(container));
  return marker;
}

export { For, Match, Portal, Show, Suspense, SuspenseList, Switch, classList, clearDelegatedEvents, createComponent, getContextOwner as currentContext, delegateEvents, generateHydrationEventsScript, getNextElement, getNextMarker, hydrate$1 as hydrate, insert, render, renderToString$1 as renderToString, runHydrationEvents, spread, template, createEffect as wrap, wrapCondition, createMemo as wrapMemo };
