import { Component, OnDestroy } from '@angular/core';

if (import.meta.hot) {
	import.meta.hot.accept();
}

@Component({
	selector: 'app-home-page',
	template: `
		<div class="App">
			<header class="App-header">
				<img
					src="assets/images/angular.svg"
					class="App-logo"
					alt="logo"
				/>
				<p>
					Edit <code>src/app/pages/home/home.component.ts</code> and
					save to reload.
				</p>
				<p>
					Page has been open for <code>{{ count }}</code> seconds.
				</p>
				<p>
					<a
						class="App-link"
						href="https://angular.io"
						target="_blank"
						rel="noopener noreferrer"
					>
						Learn Vuew
					</a>
				</p>
			</header>
		</div>
	`,
	styles: [
		`
			.App {
				text-align: center;
			}
			.App code {
				background: #0002;
				padding: 4px 8px;
				border-radius: 4px;
			}
			.App p {
				margin: 0.4rem;
			}

			.App-header {
				background-color: #f9f6f6;
				color: #333;
				min-height: 100vh;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				font-size: calc(10px + 2vmin);
			}
			.App-link {
				color: #ff3e00;
			}
			.App-logo {
				height: 36vmin;
				pointer-events: none;
				margin-bottom: 3rem;
				animation: App-logo-spin infinite 1.6s ease-in-out alternate;
			}
			@keyframes App-logo-spin {
				from {
					transform: scale(1);
				}
				to {
					transform: scale(1.06);
				}
			}
		`,
	],
})
export class HomePageComponent implements OnDestroy {
	count: number = 0;
	interval = setInterval(() => this.count++, 1000);

	ngOnDestroy() {
		clearInterval(this.interval);
	}
}
