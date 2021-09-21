import {EclBuilderModule} from './ecl-builder.module';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from 'src/environments/environment';

if (environment.production) {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(EclBuilderModule)
    .catch(err => console.error(err));
