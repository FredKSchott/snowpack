import { enableProdMode, NgModuleRef, ApplicationRef } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from './environments/environment';
import { AppModule } from './app/app.module';
import { createNewHosts } from '@angularclass/hmr';

import './polyfills';
// import 'styles/main.css';

if (environment.production) {
	enableProdMode();
}

const bootstrap = () => platformBrowserDynamic().bootstrapModule(AppModule);

// if (import.meta.hot) {
// 	hmrBootstrap(bootstrap);
// } else {
bootstrap().catch((err) => console.log(err));
// }
