import { render } from '@testing-library/react';
import App from './App';

test('renders the app shell', () => {
  render(<App />);
  expect(document.body).toBeTruthy();
});
