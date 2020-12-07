// NOTE:
// Despite index.scss is within the matching range of `lit-css` proxy type, by adding the type
// as query parameter the value `load-css` takes over and the module gets loaded in the page styles.

import './index.scss?type=load-css'

import './app-root';
