import { render, screen } from '@testing-library/angular';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
	test('should render text', async () => {
		await render(HomePageComponent, {});

		expect(screen.getByText('Learn Angular'));
	});
});
