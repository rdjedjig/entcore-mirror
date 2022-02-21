import { Routes } from '@angular/router';
import { ConfigResolver } from 'src/app/core/resolvers/config.resolver';
import { AdmcSearchComponent } from './admc-search.component';
import { AdmcSearchTransverseComponent } from './transverse/admc-search-transverse.component';
import { AdmcSearchUnlinkedComponent } from './unlinked/admc-search-unlinked.component';
import { AdmcSearchUnlinkedResolver } from './unlinked/admc-search-unlinked.resolver';
import { UnlinkedUserDetailsComponent } from './unlinked/details/user-details.component';
import { UserDetailsResolver } from './unlinked/details/user-details.resolver';

export let routes: Routes = [
    {
        path: '', 
        component: AdmcSearchComponent,
        children: [
            {
                path: 'transverse',
                component: AdmcSearchTransverseComponent
            }, {
                path: 'unlinked',
                component: AdmcSearchUnlinkedComponent,
                resolve: {
                    unlinked: AdmcSearchUnlinkedResolver
                },
                children: [
                    {
                        path: ':userId/details', 
                        component: UnlinkedUserDetailsComponent, 
                        resolve: {
                            config: ConfigResolver,
                            userDetails: UserDetailsResolver
                        }
                    }
                ]
            }
        ]
    }
];