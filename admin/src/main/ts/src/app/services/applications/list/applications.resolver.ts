import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve} from '@angular/router';

import {globalStore} from '../../../core/store';
import {ApplicationModel} from '../../../core/store/models';
import {routing, SpinnerService} from '../../../core/services';

@Injectable()
export class ApplicationsResolver implements Resolve<ApplicationModel[]> {

    constructor(private spinner: SpinnerService) { }

    resolve(route: ActivatedRouteSnapshot): Promise<ApplicationModel[]> {
        const currentStructure = globalStore.structures.data.find(
            s => s.id === routing.getParam(route, 'structureId'));
        if (currentStructure.applications.data.length > 0) {
            return Promise.resolve(currentStructure.applications.data);
        } else {

            const p = new Promise<ApplicationModel[]>((resolve, reject) => {
                currentStructure.applications.syncApps(currentStructure.id)
                .then(data => {
                    resolve(currentStructure.applications.data);
                }, error => {
                    reject(error);
                });
            });
            return this.spinner.perform('portal-content', p);
        }
    }


}
