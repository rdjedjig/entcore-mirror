import { Component, Input, Output, OnInit, OnDestroy, EventEmitter,
    ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core'
import { Subscription } from 'rxjs/Subscription'

import { UserListService, UserlistFiltersService } from '../../core/services'
import { UserModel } from '../../core/store/models'

@Component({
    selector: 'user-list',
    template: `
    <list-component
        [model]="userlist"
        [filters]="listFilters.getFormattedFilters()"
        [inputFilter]="userLS.filterByInput"
        [sort]="userLS.sorts"
        searchPlaceholder="search.user"
        noResultsLabel="list.results.no.users"
        [ngClass]="setStyles"
        [limit]="userLS.limit"
        [listScroll]="userLS.listScroll"
        (inputChange)="userLS.inputFilter = $event"
        (onSelect)="selectedUser = $event; onselect.emit($event)">
        <div toolbar class="user-toolbar">
             <i class="fa" aria-hidden="true"
                [ngClass]="{
                    'fa-sort-alpha-asc': userLS.sortsMap.alphabetical.sort === '+',
                    'fa-sort-alpha-desc': userLS.sortsMap.alphabetical.sort === '-',
                    'selected': userLS.sortsMap.alphabetical.selected
                }"
                [tooltip]="'sort.alphabetical' | translate" position="top"
                (click)="userLS.changeSorts('alphabetical')"></i>
            <i class="fa" aria-hidden="true"
                [ngClass]="{
                    'fa-sort-amount-asc': userLS.sortsMap.profile.sort === '+',
                    'fa-sort-amount-desc': userLS.sortsMap.profile.sort === '-',
                    'selected': userLS.sortsMap.profile.selected
                }"
                [tooltip]="'sort.profile' | translate" position="top"
                (click)="userLS.changeSorts('profile')"></i>
            <i class="fa fa-filter toolbar-right" aria-hidden="true"
                [tooltip]="'filters' | translate" position="top"
                (click)="companionChange.emit('filter')"></i>
        </div>

        <ng-template let-item>
            <span class="display-name">
                {{item?.lastName.toUpperCase()}} {{item?.firstName}}
            </span>
            <span class="icons">
                <i class="fa fa-lock" 
                    *ngIf="item?.code && item?.code?.length > 0"
                    [tooltip]="'user.icons.tooltip.inactive' | translate"></i>
                <i class="fa fa-ban" 
                    *ngIf="item?.blocked"
                    [tooltip]="'user.icons.tooltip.blocked' | translate"></i>
                <i class="fonticon duplicates" 
                    *ngIf="item?.duplicates && item?.duplicates?.length > 0"
                    [tooltip]="'user.icons.tooltip.duplicated' | translate"></i>
                <i class="fa fa-times-circle" 
                    *ngIf="item?.deleteDate"
                    [tooltip]="'user.icons.tooltip.deleted' | translate"></i>
                <i class="fonticon waiting-predelete" 
                    *ngIf="!item?.deleteDate && item?.disappearanceDate"
                    [tooltip]="'user.icons.tooltip.disappeared' | translate"></i>
            </span>
            <i class="profile" [ngClass]="item.type">{{item.type | translate}}</i>
        </ng-template>
    </list-component>
    `,
    styles: [`
        .user-toolbar {
            padding: 15px;
            font-size: 1.2em;
        }
        .user-toolbar i {
            cursor: pointer;
        }
    `],

    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ UserListService ]
})
export class UserList implements OnInit, OnDestroy {

    private filtersUpdatesSubscriber: Subscription

    @Input() userlist: UserModel[] = []

    @Input() listCompanion: string
    @Output("listCompanionChange") companionChange: EventEmitter<string> = new EventEmitter<string>()

    // Selection
    @Input() selectedUser: UserModel
    @Output("selectedUserChange") onselect: EventEmitter<UserModel> = new EventEmitter<UserModel>()

    constructor(private cdRef: ChangeDetectorRef,
        public userLS: UserListService,
        public listFilters: UserlistFiltersService){}

    ngOnInit() {
        this.filtersUpdatesSubscriber = this.listFilters.updateSubject.subscribe(() => {
            this.cdRef.markForCheck()
        })
    }

    ngOnDestroy() {
        this.filtersUpdatesSubscriber.unsubscribe()
    }

    setStyles = (user: UserModel) => {
        return {
            selected: this.selectedUser && user && this.selectedUser.id === user.id
        }
    }
}