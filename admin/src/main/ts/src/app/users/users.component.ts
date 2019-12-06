import { ChangeDetectionStrategy, Component, Injector, OnDestroy, OnInit } from '@angular/core';
import { Data, NavigationEnd } from '@angular/router';
import { OdeComponent } from 'ngx-ode-core';
import { SpinnerService } from 'ngx-ode-ui';
import { routing } from '../core/services/routing.service';
import { UserlistFiltersService } from '../core/services/userlist.filters.service';
import { UserListService } from '../core/services/userlist.service';
import { StructureModel } from '../core/store/models/structure.model';
import { UsersStore } from './users.store';

@Component({
    selector: 'ode-users-root',
    templateUrl: './users.component.html',
    providers: [UsersStore, UserListService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent extends OdeComponent implements OnInit, OnDestroy {

    constructor(
        injector: Injector,
        public usersStore: UsersStore,
        private listFilters: UserlistFiltersService,
        private spinner: SpinnerService) {
            super(injector);
    }

    ngOnInit(): void {
        super.ngOnInit();
        this.subscriptions.add(routing.observe(this.route, 'data').subscribe((data: Data) => {
            if (data.structure) {
                const structure: StructureModel = data.structure;
                this.usersStore.structure = structure;
                this.initFilters(structure);
                this.changeDetector.detectChanges();
            }
        }));

        this.subscriptions.add(this.router.events.subscribe(e => {
            if (e instanceof NavigationEnd) {
                this.changeDetector.markForCheck();
            }
        }));
    }

    closeCompanion() {
        this.router.navigate(['../users'], {relativeTo: this.route}).then(() => {
            this.usersStore.user = null;
        });
    }

    openUserDetail(user) {
        this.usersStore.user = user;
        this.spinner.perform('portal-content', this.router.navigate([user.id, 'details'], {relativeTo: this.route}));
    }

    openCompanionView(view) {
        this.router.navigate([view], {relativeTo: this.route});
    }

    private initFilters(structure: StructureModel) {
        this.listFilters.resetFilters();

        this.listFilters.setClassesComboModel(structure.classes);
        this.listFilters.setSourcesComboModel(structure.sources);

        const aafFunctions: Array<Array<string>> = [];
        structure.aafFunctions.forEach(f => {
            f.forEach(f2 => aafFunctions.push([f2[2], f2[4]]));
        });
        this.listFilters.setFunctionsComboModel(aafFunctions);

        this.listFilters.setProfilesComboModel(structure.profiles.map(p => p.name));
        this.listFilters.setFunctionalGroupsComboModel(
            structure.groups.data.filter(g => g.type === 'FunctionalGroup').map(g => g.name));
        this.listFilters.setManualGroupsComboModel(
            structure.groups.data.filter(g => g.type === 'ManualGroup').map(g => g.name));
        this.listFilters.setMailsComboModel([]);
    }
}
