import {DoBootstrap, Injector, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BrowserModule} from '@angular/platform-browser';
import {EclBuilderComponent} from './ecl-builder/ecl-builder.component';
import {FormsModule} from '@angular/forms';
import {NgbTypeaheadModule} from '@ng-bootstrap/ng-bootstrap';
import {HttpService} from './services/http.service';
import {HttpClientModule} from '@angular/common/http';
import {EclService} from './services/ecl.service';
import {createCustomElement} from '@angular/elements';


@NgModule({
    declarations: [EclBuilderComponent],
    imports: [
        CommonModule,
        BrowserModule,
        FormsModule,
        NgbTypeaheadModule,
        HttpClientModule
    ],
    exports: [EclBuilderComponent],
    providers: [
        HttpService,
        EclService
    ]
})
export class EclBuilderModule implements DoBootstrap {
    constructor(private injector: Injector) {
    }

    ngDoBootstrap(): void {
        const el = createCustomElement(
            EclBuilderComponent,
            {injector: this.injector}
        );

        if (!customElements.get('ecl-builder')) {
            customElements.define('ecl-builder', el);
        }
    }
}
