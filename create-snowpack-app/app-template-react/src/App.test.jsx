import * as React from 'react';
import { render } from '@testing-library/react';
import { expect } from '@esm-bundle/chai';
import App from './App.jsx';

it('renders learn react link', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/learn react/i);
  expect(document.body.contains(linkElement));
});
