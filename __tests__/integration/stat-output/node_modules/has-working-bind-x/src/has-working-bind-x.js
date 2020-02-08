import noop from 'noop-x';

const {bind} = noop;

const test1 = function test1() {
  let a1 = null;
  let a2 = null;
  let context = null;
  const testThis = [];

  const test1Fn = function test1Fn(arg1, arg2) {
    /* eslint-disable-next-line babel/no-invalid-this */
    context = this;
    a1 = arg1;
    a2 = arg2;

    /* eslint-disable-next-line prefer-rest-params */
    return arguments;
  };

  try {
    const boundFn = bind.apply(test1Fn, [testThis, 1]);
    const args = boundFn(2);

    return boundFn.length === 1 && args.length === 2 && a1 === 1 && a2 === 2 && context === testThis;
  } catch (e) {
    return false;
  }
};

const test2 = function test2() {
  let a1 = null;
  let a2 = null;
  let context = null;
  const oracle = [1, 2, 3];

  const Ctr = function Ctr(arg1, arg2) {
    a1 = arg1;
    a2 = arg2;
    context = this;

    return oracle;
  };

  try {
    const BoundFn = bind.apply(Ctr, [null]);
    const returned = new BoundFn(1, 2);

    return BoundFn.length === Ctr.length && returned === oracle && a1 === 1 && a2 === 2 && context !== oracle;
  } catch (e) {
    return false;
  }
};

/**
 * Indicates if the engine has a working bind function.
 *
 * @type {boolean}
 */
const isWorking = typeof bind === 'function' && test1() && test2();

export default isWorking;
