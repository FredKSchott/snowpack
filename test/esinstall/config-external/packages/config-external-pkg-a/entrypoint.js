import {foo} from 'config-external-pkg-b';
import {foo as foo_} from 'config-external-pkg-b/entrypoint';
import bar from 'config-external-pkg-c';
console.log(foo, foo_, bar);
