import { render } from "@testing-library/svelte";
import App from "./App.svelte";

test("renders learn svelte link", () => {
  const { getByText } = render(App);
  const linkElement: HTMLElement = getByText(/learn svelte/i);
  expect(linkElement).toBeInTheDocument();
});
