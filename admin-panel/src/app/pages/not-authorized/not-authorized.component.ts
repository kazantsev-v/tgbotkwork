import { Component } from '@angular/core';
import { MatButtonModule,  } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-authorized',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './not-authorized.component.html',
  styleUrl: './not-authorized.component.scss'
})
export class NotAuthorizedComponent {

}
