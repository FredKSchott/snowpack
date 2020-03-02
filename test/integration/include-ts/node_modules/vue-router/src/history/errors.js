export class NavigationDuplicated extends Error {
  constructor (normalizedLocation) {
    super()
    this.name = this._name = 'NavigationDuplicated'
    // passing the message to super() doesn't seem to work in the transpiled version
    this.message = `Navigating to current location ("${
      normalizedLocation.fullPath
    }") is not allowed`
    // add a stack property so services like Sentry can correctly display it
    Object.defineProperty(this, 'stack', {
      value: new Error().stack,
      writable: true,
      configurable: true
    })
    // we could also have used
    // Error.captureStackTrace(this, this.constructor)
    // but it only exists on node and chrome
  }
}

// support IE9
NavigationDuplicated._name = 'NavigationDuplicated'
