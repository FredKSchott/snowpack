---
layout: ../../main.njk
title: React + Loadable Components
---

_Based on [app-template-react](../../create-snowpack-app/app-template-react)_

You can lazy load React components in Snowpack when needed with React‘s builtin `React.lazy` ([docs][react-lazy]):

```jsx
import React, {useState, useEffect, Suspense} from 'react';

const Async = React.lazy(() => import('./Async'));

function Component() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <Async />
      </Suspense>
    </div>
  );
}
```

This works out-of-the-box in Snowpack, with no configuration needed!

### Learn more

- [`React.lazy` documentation on reactjs.org][react-lazy]

[react-lazy]: https://reactjs.org/docs/code-splitting.html#reactlazy
