import { ChangeDetectionStrategy, Component, Injector, OnInit } from '@angular/core';
import { Data } from '@angular/router';
import { OdeComponent } from 'ngx-ode-core';
import { routing } from '../../core/services/routing.service';

@Component({
    selector: 'ode-message-flash',
    template: '<router-outlet></router-outlet>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageFlashComponent extends OdeComponent implements OnInit {

    constructor(injector: Injector) {
        super(injector);
    }

    ngOnInit() {
        super.ngOnInit();
        routing.observe(this.route, 'data').subscribe(async (data: Data) => {
            if (data.structure) {
                const structure = data.structure;
                if (this.router.isActive('/admin/' + structure.id + '/management/message-flash', true)) {
                    this.router.navigate(['list'], {relativeTo: this.route});
                }
            }
        });
    }

}
