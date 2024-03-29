import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve} from '@angular/router';

import {globalStore} from '../../../core/store/global.store';
import {ApplicationModel} from '../../../core/store/models/application.model';
import { SpinnerService } from 'ngx-ode-ui';
import { routing } from 'src/app/core/services/routing.service';

import {BundlesService} from 'ngx-ode-sijil';

@Injectable()
export class ApplicationsResolver implements Resolve<ApplicationModel[]> {

    constructor(private spinner: SpinnerService, private bundlesService: BundlesService) { }

    resolve(route: ActivatedRouteSnapshot): Promise<ApplicationModel[]> {
        const currentStructure = globalStore.structures.data.find(
            s => s.id === routing.getParam(route, 'structureId'));
        if (currentStructure.applications.data.length > 0) {
            return Promise.resolve(currentStructure.applications.data);
        } else {

            const p = new Promise<ApplicationModel[]>((resolve, reject) => {
                currentStructure.applications.syncApps(currentStructure.id)
                .then(data => {
                    currentStructure.applications.data.map(app => app.displayName = this.bundlesService.translate(app.displayName));
                    resolve(currentStructure.applications.data);
                }, error => {
                    reject(error);
                });
            });
            return this.spinner.perform('portal-content', p);
        }
    }


}
