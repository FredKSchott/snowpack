import templateOrRender from './foo.html';
import './foo.global.css';

export default {
	...templateOrRender,
	setup: function() {
		return {};
	}
};
