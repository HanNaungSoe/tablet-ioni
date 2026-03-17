import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartupPage } from './startup.page';
import { AppInitService } from '../services/app-init.service';

describe('StartupPage', () => {
  let component: StartupPage;
  let fixture: ComponentFixture<StartupPage>;
  let appInitServiceSpy: jasmine.SpyObj<AppInitService>;

  beforeEach(async () => {
    appInitServiceSpy = jasmine.createSpyObj<AppInitService>('AppInitService', ['initialize']);
    appInitServiceSpy.initialize.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [StartupPage],
      providers: [{ provide: AppInitService, useValue: appInitServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(StartupPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize app on ngOnInit', async () => {
    await component.ngOnInit();
    expect(appInitServiceSpy.initialize).toHaveBeenCalledWith({ openWebsite: true });
  });
});
