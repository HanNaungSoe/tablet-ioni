import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HomePage } from './home.page';
import { AppInitService } from '../services/app-init.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let appInitServiceSpy: jasmine.SpyObj<AppInitService>;

  beforeEach(async () => {
    appInitServiceSpy = jasmine.createSpyObj<AppInitService>('AppInitService', ['initialize', 'reloadWebsite']);
    appInitServiceSpy.initialize.and.resolveTo();
    appInitServiceSpy.reloadWebsite.and.resolveTo();

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [{ provide: AppInitService, useValue: appInitServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should run app initialization on init', () => {
    expect(appInitServiceSpy.initialize).toHaveBeenCalled();
  });

  it('should reload website', async () => {
    await component.reload();
    expect(appInitServiceSpy.reloadWebsite).toHaveBeenCalled();
  });
});
