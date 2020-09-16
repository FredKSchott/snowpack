import {foo} from 'config-external-pkg-b';
import {foo as foo_} from 'config-external-pkg-b/entrypoint';
console.log(foo, foo_);
