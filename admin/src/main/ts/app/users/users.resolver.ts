import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { routing } from '../core/services/routing.service';

import { globalStore, UserModel, StructureModel } from '../core/store';
import { SpinnerService } from '../core/services';
import { sync } from '../structure/structure.resolver';

@Injectable()
export class UsersResolver implements Resolve<UserModel[]> {

    constructor(private spinner: SpinnerService) {
    }

    resolve(route: ActivatedRouteSnapshot): Promise<UserModel[]> {
        let currentStructure: StructureModel = globalStore.structures.data.find(s => s.id === routing.getParam(route, 'structureId'));

        if (route.queryParams.sync) {
            sync(currentStructure, true);
        }

        if(currentStructure.users.data.length > 0 && !route.queryParams.sync) {
            return Promise.resolve(currentStructure.users.data)
        } else {
            return this.spinner.perform('portal-content', currentStructure.users.sync()
                .then(() => {
                    return Promise.resolve(currentStructure.users.data);
                }).catch(e => {
                    console.error(e);
                    return Promise.resolve([]);
                })
            );
        }
    }
}
