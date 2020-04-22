import { render } from "@testing-library/vue";
import App from "./App";

test("renders learn svelte link", () => {
  const { getByText } = render(App);
  const linkElement = getByText(/learn vue/i);
  expect(linkElement).toBeInTheDocument();
});
