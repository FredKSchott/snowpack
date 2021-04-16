import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';
import App from './components/App';

const Articles = React.lazy(() => import('./components/Articles'));

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <Switch>
        <Route exact path="/">
          <App layout="fullPage">
            <Articles />
          </App>
        </Route>
      </Switch>
    </Router>
  </React.StrictMode>,
  document.querySelector('#app'),
);
