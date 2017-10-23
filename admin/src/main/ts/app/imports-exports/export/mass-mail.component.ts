import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core'
import { Subscription, Subject } from 'rxjs'
import { ActivatedRoute, Router, Data, NavigationEnd } from '@angular/router'
import { routing } from '../../core/services/routing.service'
import { UserlistFiltersService, UserFilter } from '../../core/services/userlist.filters.service'
import { NotifyService } from '../../core/services/notify.service'
import { SpinnerService } from '../../core/services/spinner.service'
import { StructureModel, UserModel } from '../../core/store'
import { MassMailService } from './mass-mail.service'
import { BundlesService } from 'sijil'


@Component({
    selector: 'mass-mail',
    template: `
            <side-layout [showCompanion]="true">
            <div side-card>
            <div class="padded">
            <div *ngFor="let filter of listFilters.filters">
                <div *ngIf="filter.comboModel.length > 0">
                    <multi-combo
                        [comboModel]="filter.comboModel"
                        [(outputModel)]="filter.outputModel"
                        [title]="filter.label | translate"
                        [display]="filter.display || translate"
                        [orderBy]="filter.order || orderer"
                        [filter]="resetCount()"
                    ></multi-combo>
                    <div class="multi-combo-companion">
                        <div *ngFor="let item of filter.outputModel"
                            (click)="deselect(filter, item)">
                            <span *ngIf="filter.display">
                                {{ item[filter.display] }}
                            </span>
                            <span *ngIf="!filter.display">
                                {{ item | translate }}
                            </span>
                            <i class="fa fa-trash" (click)="check()"></i>
                        </div>
                    </div>
                </div>
            </div>

            </div>
            </div>
            <div side-companion class="padded">
                <a>Lancer le publipostage : </a>
                <button class="cell" (click)="processMassMail('pdf')">
                    <s5l>massmail.pdf</s5l>
                </button>
                <button class="cell" (click)="processMassMail('mail')">
                    <s5l>massmail.mail</s5l>
                </button>
                <div style="text-align: center">
                    <div >{{countUsers}} <s5l>massmail.users.total</s5l></div>
                    <div >{{countUsersWithoutMail}} <s5l>massmail.users.nomail</s5l></div>
                </div>
            </div>
            <div side-companion>
            
            <hr>
            
               
            <table>
                <thead>
                    <tr>
                        <th (click)="setUserOrder('lastName')"><s5l>lastName</s5l></th>
                        <th (click)="setUserOrder('firstName')"><s5l>firstName</s5l></th>
                        <th (click)="setUserOrder('profile')"><s5l>profile</s5l></th>
                        <th (click)="setUserOrder('login')"><s5l>login</s5l></th>
                        <th (click)="setUserOrder('activationCode')"><s5l>activation.code</s5l></th>
                        <th (click)="setUserOrder('email')"><s5l>email</s5l></th>
                        <th (click)="setUserOrder('classesStr')"><s5l>create.user.classe</s5l></th>
                        <th><s5l>link</s5l></th>
                    </tr>
                    <tr>    
                        <th>
                            <input class="twelve" type="text" [(ngModel)]="sortObject.lastName" placeholder="search"/></th>
                        <th>
                            <input type="text" [(ngModel)]="sortObject.firstName" placeholder="search"/>
                        </th>
                        <th>
                        </th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th>
                            <input type="text" [(ngModel)]="sortObject.classesStr" placeholder="search"/>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let user of (data | filter: filters | filter: sortObject) | orderBy: userOrder; ">
                        {{count(user)}}
                        <td> 
                        <i class="fa fa-lock"  *ngIf="user?.code && user?.code?.length > 0"
                        [tooltip]="'user.icons.tooltip.inactive' | translate"></i> {{user.lastName}}</td>
                        <td>{{user.firstName}}</td>
                        <td [ngClass]="user.type">{{user.type | translate}}</td>
                        <td>{{user.login}}</td>
                        <td>{{user.code}}</td>
                        <td>{{user.email}}</td>
                        <td>{{user.classesStr}}
                        </td>
                        <td>
                            <a  [routerLink]="'/admin/'+structureId+'/users/'+user.id"
                            routerLinkActive="active">
                                <button  class="fa fa-external-link"></button>
                            </a>
                        </td>
                
                </tbody>
</table>
            </div>
        </side-layout>`,
    changeDetection: ChangeDetectionStrategy.OnPush


})
export class MassMailComponent implements OnInit, OnDestroy {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        public listFilters: UserlistFiltersService,
        public cdRef: ChangeDetectorRef,
        public bundles: BundlesService,
        private ns: NotifyService,
        private spinner: SpinnerService,
    ) { }
    sortObject = {};
    dataSubscriber: Subscription
    routerSubscriber: Subscription
    countUsers = 0;
    countUsersWithoutMail = 0;
    structureId;
    filters;
    data;
    userOrder;
    addFilter = false;
    downloadAnchor = null;
    downloadObjectUrl = null;

    translate = (...args) => { return (<any>this.bundles.translate)(...args) }

    ngOnInit(): void {
        this.dataSubscriber = routing.observe(this.route, "data").subscribe(async (data: Data) => {
            console.log(data);
            if (data['structure']) {
                let structure: StructureModel = data['structure']
                this.spinner.perform('portal-content', this.getList(structure._id))
                    .then(() => {
                        this.structureId = structure._id;
                        this.initFilters(structure)
                        this.filters = this.listFilters.getFormattedFilters();
                        console.log(this.listFilters)
                        this.cdRef.detectChanges();
                    }).catch(err => {
                        this.ns.error("massmail.error", "error", err);
                    })
            }
        })

        this.routerSubscriber = this.router.events.subscribe(e => {
            if (e instanceof NavigationEnd)
                this.cdRef.markForCheck()
        })
    }

    ngOnDestroy(): void {
        this.dataSubscriber.unsubscribe()
        this.routerSubscriber.unsubscribe()
    }

    private initFilters(structure: StructureModel) {
        this.listFilters.resetFilters()
        if (this.listFilters.filters.length < 8) {
            this.listFilters.pushNewFilter(new MailFilter(new Subject<any>()))
            this.addFilter = true
        }
        this.listFilters.setClasses(structure.classes)
        this.listFilters.setProfiles(structure.profiles.map(p => p.name))
    }

    private createDownloadAnchor() {
        this.downloadAnchor = document.createElement('a');
        this.downloadAnchor.style = "display: none";
        document.body.appendChild(this.downloadAnchor);
    }

    private ajaxDownload(blob, filename) {
        if (window.navigator.msSaveOrOpenBlob) {
            //IE specific
            window.navigator.msSaveOrOpenBlob(blob, filename);
        } else {
            //Other browsers
            if (this.downloadAnchor === null)
                this.createDownloadAnchor()
            if (this.downloadObjectUrl !== null)
                window.URL.revokeObjectURL(this.downloadObjectUrl);
            this.downloadObjectUrl = window.URL.createObjectURL(blob)
            var anchor = this.downloadAnchor
            anchor.href = this.downloadObjectUrl
            anchor.download = filename
            anchor.click()
        }
    }

    private async getList(id) {
        this.data = await MassMailService.getList(id);
        console.log(this.data)
    }

    async processMassMail(type: String) {
        let outputModels = this.listFilters.getFormattedOutputModels();
        let params: any = {
            p: outputModels['type'],
            c: outputModels['classes'].map(c => c.id),
            a: 'all'
        }
        if (outputModels['email'].length == 1) {
            params.mail = outputModels['email'][0].indexOf('users.with.mail') >= 0;
        }
        console.log(params)
        if (outputModels['code'].length == 1) {
            
            params.a = outputModels['code'][0].indexOf('users.activated') >= 0;
            
        }
        console.log(params) 
       this.spinner.perform('portal-content', MassMailService.massMailProcess(this.structureId, type, params))
            .then(blob => {
                if (type.indexOf("pdf") > -1) {
                    this.ajaxDownload(blob, this.translate("massmail.filename") + ".pdf");
                    this.ns.success("massmail.pdf.done");
                } else {
                    this.ns.success("massmail.mail.done");
                }
            }).catch(err => {
                this.ns.error("massmail.error", "error", err);
            })
    }

    deselect(filter, item) {
        filter.outputModel.splice(filter.outputModel.indexOf(item), 1)
        filter.observable.next()
    }

    setUserOrder(order: string) {
        this.userOrder = this.userOrder === order ? '-' + order : order;
    }

    resetCount() {
        this.countUsers = 0;
        this.countUsersWithoutMail = 0;
    }

    count(user) {
        this.countUsers++;
        if (!user.email)
            this.countUsersWithoutMail++;
    }
}

export class MailFilter extends UserFilter<string> {
    type = 'email'
    label = 'email'
    comboModel = ['users.with.mail', 'users.without.mail']

    filter = (mail: string) => {
        let outputModel = this.outputModel
        return outputModel.length === 0 ||
            outputModel.indexOf('users.without.mail') >= 0 && !mail ||
            outputModel.indexOf('users.with.mail') >= 0 && !(!mail)
    }
}
