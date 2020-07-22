import { options } from 'preact';
import { DIFF_OPTION, VNODE_COMPONENT } from '../constants';

const oldDiff = options[DIFF_OPTION];
options[DIFF_OPTION] = newVNode => {
	if (newVNode[VNODE_COMPONENT]) {
		newVNode[VNODE_COMPONENT].constructor = newVNode.type;
	}

	if (oldDiff) oldDiff(newVNode);
};
