/// <reference types="cypress" />
/// <reference types="@testing-library/cypress" />

context('Example', () => {
	beforeEach(() => {
		cy.visit('http://localhost:8080');
	});

	it('should render title', () => {
		cy.findByText('Demo app is running!').should('exist');
	});
});
