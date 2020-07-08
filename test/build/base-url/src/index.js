import {flatten} from 'array-flatten';

const {MODE} = import.meta.env;
export function consoleMode() {
  console.log(MODE);
}

export default function doNothing() {
  // I do nothing 🎉
}
