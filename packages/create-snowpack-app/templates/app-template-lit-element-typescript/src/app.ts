import { customElement, LitElement, html, css } from "lit-element";

@customElement("my-app")
export class App extends LitElement {
    static get styles() {
        return css`
            .wrapper {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
                height: 100vh;
                background-color: #2196F3;
            }

            .link {
                color: white;
            }
        `
    }

    render() {
        return html`
            <div class="wrapper">
                <h1>Snowpack Lit Element + TypeScript Starter</h1>
                <p>
                    Edit <code>src/app.ts</code> and save to reload.
                </p>
                <a
                  class="link"
                  href="https://lit-element.polymer-project.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                    Learn Lit Element
                </a>
            </div>
        `
    }
}
