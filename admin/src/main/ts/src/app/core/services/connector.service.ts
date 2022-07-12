import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Mix } from "entcore-toolkit";
import { ConnectorModel } from "../store/models/connector.model";
import { RoleModel } from "../store/models/role.model";

@Injectable()
export class ConnectorService {

    constructor(private http: HttpClient) {}

    syncRoles = (connector: ConnectorModel, structureId: string, connectorId: string) => {
        return this.http.get(`/appregistry/application/external/${connectorId}/groups/roles?structureId=${structureId}`)
            .subscribe((res: Array<RoleModel>) => connector.roles = Mix.castArrayAs(RoleModel, res));
    }
}