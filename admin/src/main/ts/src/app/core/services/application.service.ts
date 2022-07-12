import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Mix } from "entcore-toolkit";
import { ApplicationModel } from "../store/models/application.model";
import { RoleModel } from "../store/models/role.model";

@Injectable()
export class ApplicationService {
    constructor(private http: HttpClient) {}

    fetchApps = (structureId: string) => {
        return this.http.get(`/appregistry/applications/roles?structureId=${structureId}`).
            subscribe(
                (res: Array<ApplicationModel>) => {
                    return Mix.castArrayAs(ApplicationModel,
                        res.reduce((apps, item) => {
                            if (!item.isExternal) { apps.push(item); }
                            return apps;
                        }, [])
                    );
                }
            );
    }

    syncRoles = (application: ApplicationModel, structureId: string) => {
        return this.http.get(`/appregistry/structure/${structureId}/application/${application.id}/groups/roles`)
            .subscribe((res: Array<RoleModel>) => application.roles = Mix.castArrayAs(RoleModel, res));
    }
}