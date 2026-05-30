import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { reducers } from './reducers';
import { GridViewEffects } from './effects/grid-view.effects';

/**
 * Module that provides the NgRx store feature for Grid View Manager.
 * This is needed to register the store in standalone components.
 */
@NgModule({
  imports: [
    StoreModule.forFeature('gridViewManager', reducers),
    EffectsModule.forFeature([GridViewEffects]),
  ],
})
export class GridViewManagerStoreModule {}
