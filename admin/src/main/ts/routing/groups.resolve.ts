import { Injectable } from '@angular/core'
import { Resolve, ActivatedRouteSnapshot } from '@angular/router'
import { structureCollection, GroupCollection } from '../models'
import { Group } from '../models/mappings'
import { LoadingService } from '../services'
import { routing } from './routing.utils'

@Injectable()
export class GroupsResolve implements Resolve<Group[]> {

    constructor(private ls: LoadingService){}

    resolve(route: ActivatedRouteSnapshot): Promise<Group[]> {
        let currentStructure = structureCollection.data.find(s => s.id === routing.getParam(route, 'structureId'))
        if(currentStructure.groups.data.length > 0) {
            return Promise.resolve(currentStructure.groups.data)
        } else {
            return this.ls.perform('portal-content', currentStructure.groups.sync()
                .then(() => {
                    return currentStructure.groups.data
                }).catch(e => {
                    console.error(e)
                }))
        }
    }

}