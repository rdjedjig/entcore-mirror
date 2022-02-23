import { Component, EventEmitter, Injector, Input, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { OdeComponent } from 'ngx-ode-core';
import { SelectOption, SpinnerService } from 'ngx-ode-ui';
import { ApplicationModel } from 'src/app/core/store/models/application.model';
import { WidgetModel } from 'src/app/core/store/models/widget.model';
import { Profile, Structure } from '../../_shared/services-types';
import { routing } from "src/app/core/services/routing.service";
import { Data, Params } from "@angular/router";
import { ServicesStore } from '../../services.store';
import { DefaultBookmarks, WidgetService } from 'src/app/core/services/widgets.service';
import { filterApplicationsByLevelsOfEducation, filterApplicationsByRoles, filterApplicationsByType } from '../../_shared/services-list/services-list.component';
import { ConnectorModel, IConnector } from 'src/app/core/store/models/connector.model';

const emptyBookmarks = {
    'Guest': null,
    'Personnel': null,
    'Relative': null,
    'Student': null,
    'Teacher': null,
    'AdminLocal': null
}

@Component({
    selector: 'ode-widget-myapps-parameters',
    templateUrl: 'widget-myapps-parameters.component.html',
    styleUrls: [
        'widget-myapps-parameters.component.scss'
    ]
})

export class WidgetMyAppsParametersComponent extends OdeComponent {
    public structure:Structure;
    public widget: WidgetModel;

    public addApplicationForm: FormGroup = new FormGroup({
        selectedApp: new FormControl(),
        profiles: new FormControl()
    });
    public addConnectorForm: FormGroup = new FormGroup({
        selectedConnector: new FormControl(),
        profiles: new FormControl()
    });
    
    public selectedApp:ApplicationModel = null;
    public selectedConnector:ConnectorModel = null;
    public applicationOptions: Array<SelectOption<ApplicationModel>>;
    public connectorOptions: Array<SelectOption<IConnector>>;

    // Profiles are shared between app and connector widgets
    public selectedProfiles: Array<Profile> = [];
    public profileOptions: Array<SelectOption<string>> = [];
    public profileTrackByFn = (p: Profile) => p;

    public showAppLightbox:boolean = false;
    public showConnectorLightbox:boolean = false;

    private defaultBookmarks:DefaultBookmarks = emptyBookmarks;

    constructor(
            injector: Injector,
            public servicesStore: ServicesStore,
            private spinner:SpinnerService,
            private widgetSvc:WidgetService
        ) {
        super(injector);
        this.reset();
    }

    ngOnInit() {
        // Retrieve selected profiles in the lightboxes
        this.addApplicationForm.get('profiles').valueChanges.subscribe((profiles: Array<Profile>) => {
            this.selectedProfiles = profiles || [];
        });

        // Listen to widget changes in the route
        this.subscriptions.add(this.route.params.subscribe((params: Params) => {
            if (params['widgetId']) {
                this.widget = this.servicesStore.structure.widgets.data.find(a => a.id === params['widgetId']);
            }
        }));

        // Listen to structure changes in the route
        this.subscriptions.add(routing.observe(this.route, 'data').subscribe((data: Data) => {
            if (data.structure) {
                this.structure = data.structure;
                this.updateAppList();
                this.updateConnectorList();
            }
            this.defaultBookmarks = data.bookmarks || emptyBookmarks;
        }));

        this.updateAppList();
        this.updateConnectorList();
    }

    /** Get all apps from the route resolver, and filter them. */
    private updateAppList() {
        let apps:Array<ApplicationModel> = this.route.snapshot.data.apps;
        apps = filterApplicationsByLevelsOfEducation( apps, this.servicesStore.structure.levelsOfEducation );
        apps = filterApplicationsByType( apps, false /*ADMC cannot modify myapps preferences*/ );
        apps = filterApplicationsByRoles( apps, this.servicesStore.structure.distributions );

        this.applicationOptions = apps.sort((a, b) => {
            return (a && a.displayName && b && b.displayName) ? a.displayName.localeCompare(b.displayName) : 0;
        })
        .map( app => ({label:app.displayName, value:app}));
    }

    /** Get all connectors from the route resolver, and filter them. */
    private updateConnectorList() {
        let connectors:Array<IConnector> = this.route.snapshot.data.connectors;
        this.connectorOptions = connectors.sort((a, b) => {
            return (a && a.displayName && b && b.displayName) ? a.displayName.localeCompare(b.displayName) : 0;
        })
        .map( app => ({label:app.displayName, value:app}));
    }

    public onApplicationChange(e:ApplicationModel) {
        this.selectedApp = e;
        if( e ) {
            // Update currently selected profiles, according to the default parameters.
            this.addApplicationForm.get('profiles').setValue( this.extractProfilesForParam(e.displayName) );
        } else {
            this.addApplicationForm.get('profiles').reset();
        }
    }
    public onConnectorChange(e:ConnectorModel) {
        this.selectedConnector = e;
        if( e ) {
            // Update currently selected profiles, according to the default parameters.
            this.addConnectorForm.get('profiles').setValue( this.extractProfilesForParam(e.displayName) );
        } else {
            this.addConnectorForm.get('profiles').reset();
        }
    }
    private extractProfilesForParam( paramName:string ) {
        const profiles = [];
        for( const profile in this.defaultBookmarks ) {
            const paramsForProfile = (this.defaultBookmarks[profile] || []) as Array<string>;
            if( paramsForProfile.indexOf(paramName) >=0 ) {
                profiles.push( profile );
            }
        }
        return profiles;
    }


    public addApplication() {
        if( this.selectedApp )
            this.addToDefaultParameters(this.selectedApp.displayName);
    }
    public addConnector() {
        if( this.selectedConnector )
            this.addToDefaultParameters(this.selectedConnector.displayName);
    }

    private addToDefaultParameters( paramName:string ) {
        const applyToProfiles = (this.addApplicationForm.get('profiles').value || []) as Array<string>;

        ['Guest', 'Personnel', 'Relative', 'Student', 'Teacher', 'AdminLocal'].forEach( profile => {
            // Null arrays not allowed for now
            const profileParameters = (this.defaultBookmarks[profile] || []) as Array<string>;
            const indexOfParamInProfileParameters = profileParameters.indexOf(paramName);
            if( applyToProfiles && applyToProfiles.indexOf && applyToProfiles.indexOf(profile)>=0 ) {
                // Add app to this profile, if not already present.
                if( indexOfParamInProfileParameters < 0 ) {
                    profileParameters.push( paramName );
                }
            } else {
                // Remove app from this profile, if needed.
                if( indexOfParamInProfileParameters >= 0 ) {
                    profileParameters.splice( indexOfParamInProfileParameters, 1 );
                }
            }

            // Update (or remove empty) parameters for this profile
            if( profileParameters.length > 0 ) {
                this.defaultBookmarks[profile] = profileParameters;
            } else if( this.defaultBookmarks[profile] ) {
                delete this.defaultBookmarks[profile];
            }
        });
        this.spinner.perform(
            "portal-content", 
            this.widgetSvc.setMyAppsParameters(this.structure, this.defaultBookmarks)
        );
    }

    /** [Re]init the app/connectors lightboxes. */
    public reset() {
        this.selectedApp = null;
        this.selectedConnector = null;
        this.profileOptions = ['Guest', 'Personnel', 'Relative', 'Student', 'Teacher', 'AdminLocal'].map( p => ({
            value:p, 
            label:p
        }) );
        this.addApplicationForm.get('selectedApp').reset();
        this.addConnectorForm.get('selectedConnector').reset();
        this.addApplicationForm.get('profiles').reset();
        this.showAppLightbox = this.showConnectorLightbox = false;
    }
}