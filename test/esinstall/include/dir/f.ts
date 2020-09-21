// test 6: TypeScript decorators
import {test} from 'package-01';

function f() {
  console.log('f(): evaluated');
  return function (target, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log('f(): called');
  };
}

function g() {
  console.log('g(): evaluated');
  return function (target, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log('g(): called');
  };
}

class C {
  @f()
  @g()
  // @ts-ignore
  method() {}
}
