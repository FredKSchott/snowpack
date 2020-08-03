import { n, d } from '../common/preact.module-dcd0ec8f.js';

// all vnodes referencing a given constructor
const vnodesForComponent = new WeakMap();

const oldVnode = n.vnode;
n.vnode = vnode => {
	if (vnode && typeof vnode.type === 'function') {
		const vnodes = vnodesForComponent.get(vnode.type);
		if (!vnodes) {
			vnodesForComponent.set(vnode.type, [vnode]);
		} else {
			vnodes.push(vnode);
		}
	}

	if (oldVnode) oldVnode(vnode);
};

const VNODE_COMPONENT = '__c';
const DIFF_OPTION = '__b';
const NAMESPACE = '__PREFRESH__';
const COMPONENT_HOOKS = '__H';
const HOOKS_LIST = '__';
const EFFECTS_LIST = '__h';

const oldDiff = n[DIFF_OPTION];
n[DIFF_OPTION] = newVNode => {
	if (newVNode[VNODE_COMPONENT]) {
		newVNode[VNODE_COMPONENT].constructor = newVNode.type;
	}

	if (oldDiff) oldDiff(newVNode);
};

const oldUnmount = n.unmount;
n.unmount = vnode => {
	const type = (vnode || {}).type;
	if (typeof type === 'function' && vnodesForComponent.has(type)) {
		const vnodes = vnodesForComponent.get(type);
		const index = vnodes.indexOf(vnode);
		if (index !== -1) {
			vnodes.splice(index, 1);
		}
	}
	if (oldUnmount) oldUnmount(vnode);
};

// Options for Preact.

const signaturesForType = new WeakMap();

/**
 *
 * This part has been vendored from "react-refresh"
 * https://github.com/facebook/react/blob/master/packages/react-refresh/src/ReactFreshRuntime.js#L83
 */
const computeKey = signature => {
	let fullKey = signature.key;
	let hooks;

	try {
		hooks = signature.getCustomHooks();
	} catch (err) {
		signature.forceReset = true;
		return fullKey;
	}

	for (let i = 0; i < hooks.length; i++) {
		const hook = hooks[i];
		if (typeof hook !== 'function') {
			signature.forceReset = true;
			return fullKey;
		}

		const nestedHookSignature = signaturesForType.get(hook);
		if (nestedHookSignature === undefined) continue;

		const nestedHookKey = computeKey(nestedHookSignature);
		if (nestedHookSignature.forceReset) signature.forceReset = true;

		fullKey += '\n---\n' + nestedHookKey;
	}

	return fullKey;
};

function sign(type, key, forceReset, getCustomHooks, status) {
	if (type) {
		let signature = signaturesForType.get(type);
		if (status === 'begin') {
			signaturesForType.set(type, {
				type,
				key,
				forceReset,
				getCustomHooks: getCustomHooks || (() => [])
			});

			return 'needsHooks';
		} else if (status === 'needsHooks') {
			signature.fullKey = computeKey(signature);
		}
	}
}

function replaceComponent(OldType, NewType, resetHookState) {
	const vnodes = vnodesForComponent.get(OldType);
	if (!vnodes) return;

	// migrate the list to our new constructor reference
	vnodesForComponent.delete(OldType);
	vnodesForComponent.set(NewType, vnodes);

	vnodes.forEach(vnode => {
		// update the type in-place to reference the new component
		vnode.type = NewType;

		if (vnode[VNODE_COMPONENT]) {
			vnode[VNODE_COMPONENT].constructor = vnode.type;

			try {
				if (vnode[VNODE_COMPONENT] instanceof OldType) {
					const oldInst = vnode[VNODE_COMPONENT];

					const newInst = new NewType(
						vnode[VNODE_COMPONENT].props,
						vnode[VNODE_COMPONENT].context
					);

					vnode[VNODE_COMPONENT] = newInst;
					// copy old properties onto the new instance.
					//   - Objects (including refs) in the new instance are updated with their old values
					//   - Missing or null properties are restored to their old values
					//   - Updated Functions are not reverted
					//   - Scalars are copied
					for (let i in oldInst) {
						const type = typeof oldInst[i];
						if (!(i in newInst)) {
							newInst[i] = oldInst[i];
						} else if (type !== 'function' && typeof newInst[i] === type) {
							if (
								type === 'object' &&
								newInst[i] != null &&
								newInst[i].constructor === oldInst[i].constructor
							) {
								Object.assign(newInst[i], oldInst[i]);
							} else {
								newInst[i] = oldInst[i];
							}
						}
					}
				}
			} catch (e) {
				/* Functional component */
			}

			if (resetHookState) {
				vnode[VNODE_COMPONENT][COMPONENT_HOOKS] = {
					[HOOKS_LIST]: [],
					[EFFECTS_LIST]: []
				};
			}

			d.prototype.forceUpdate.call(vnode[VNODE_COMPONENT]);
		}
	});
}

function register(type, id) {
	// Unused atm
}

self[NAMESPACE] = {
	getSignature: type => signaturesForType.get(type),
	register,
	replaceComponent,
	sign,
	computeKey
};
