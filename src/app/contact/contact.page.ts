import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
  standalone: false,
})
export class ContactPage {
  readonly contactItems = [
    { label: 'Support Team', value: 'TKKS Device Support' },
    { label: 'Phone', value: '+95 9 123 456 789' },
    { label: 'Email', value: 'support@tkks.example' },
    { label: 'Hours', value: 'Mon - Fri, 9:00 AM - 5:00 PM' },
  ];
}
