import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { HomePageComponent } from './home-page.component';

const routes: Routes = [
	{
		path: '',
		component: HomePageComponent,
	},
];

@NgModule({
	declarations: [HomePageComponent],
	imports: [RouterModule.forChild(routes), CommonModule],
})
export class HomePageModule {}
