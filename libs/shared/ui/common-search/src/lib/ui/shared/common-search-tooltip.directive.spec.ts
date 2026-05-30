import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Component,
  DebugElement,
  EnvironmentInjector,
  NgModule,
} from '@angular/core';
import { CommonSearchTooltipDirective } from './common-search-tooltip.directive';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import {
  TrackingEventName,
  TrackingService,
} from '@fmr-pr000539/eqt-tracking-module';
import { UsageStatsService } from '@fmr-pr000264/ames-usagestats-service';
import { moduleName } from '../../model/external-services.constant';

@NgModule({
  declarations: [CommonSearchTooltipDirective],
  exports: [CommonSearchTooltipDirective],
})
class CommonSearchTooltipDirectiveTestModule {}

@Component({
  standalone: true,
  imports: [CommonSearchTooltipDirectiveTestModule],
  template: `<div [commonSearchTooltip]="tooltipData"></div>`,
})
class TestComponent {
  tooltipData = { column: 'Test Column', value: 'Test Value' };
}

describe('CommonSearchTooltipDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let debugElement: DebugElement;
  let directiveInstance: CommonSearchTooltipDirective;
  let trackingService: TrackingService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(1000000));

    trackingService = {} as TrackingService;
    trackingService.trackEvent = jest.fn();

    const usageStatsService = {} as UsageStatsService;
    usageStatsService.logEvent = jest.fn();

    TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        MatTooltip,
        { provide: TrackingService, useValue: trackingService },
        { provide: UsageStatsService, useValue: usageStatsService },
      ],
    });

    const injector = TestBed.inject(EnvironmentInjector);

    injector.runInContext(() => {
      fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
      debugElement = fixture.debugElement.query(
        By.directive(CommonSearchTooltipDirective),
      );
      directiveInstance = debugElement.injector.get(
        CommonSearchTooltipDirective,
      );
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should create the directive', () => {
    expect(directiveInstance).toBeTruthy();
  });

  it('should show tooltip after delay on mouseenter', () => {
    const showSpy = jest.spyOn(directiveInstance.matTooltip, 'show');
    directiveInstance.delay = 400;

    debugElement.triggerEventHandler('mouseenter', {});
    fixture.detectChanges();

    jest.advanceTimersByTime(401);
    fixture.detectChanges();

    expect(directiveInstance.matTooltip.message).toBe('Test Column');
    expect(showSpy).toHaveBeenCalled();
  });

  it('should hide tooltip and track event on mouseleave', () => {
    directiveInstance.delay = 700;
    directiveInstance['tooltipStartTime'] =
      1000000 - (directiveInstance.delay + 50);

    jest
      .spyOn(directiveInstance.matTooltip, '_isTooltipVisible')
      .mockReturnValue(true);
    const hideSpy = jest.spyOn(directiveInstance.matTooltip, 'hide');

    let trackEventSpy;
    if (directiveInstance.trackingService) {
      trackEventSpy = jest.spyOn(
        directiveInstance.trackingService,
        'trackEvent',
      );
    }

    debugElement.triggerEventHandler('mouseleave', {});
    fixture.detectChanges();

    jest.runOnlyPendingTimers();
    fixture.detectChanges();

    expect(hideSpy).toHaveBeenCalled();
    expect(trackEventSpy).toHaveBeenCalledWith({
      action: TrackingEventName.TooltipHovered,
      appModule: moduleName,
      additionalAttributes: {
        tooltipValue: 'Test Value',
        tooltipColumn: 'Test Column',
        duration: directiveInstance.delay + 50,
      },
    });
  });

  it('should clear timer and hide tooltip on destroy', () => {
    const hideSpy = jest.spyOn(directiveInstance.matTooltip, 'hide');

    directiveInstance['timer'] = setTimeout(() => {}, 1000);
    directiveInstance.ngOnDestroy();

    expect(hideSpy).toHaveBeenCalled();
    expect(directiveInstance['timer']).toBeUndefined();
  });
});
