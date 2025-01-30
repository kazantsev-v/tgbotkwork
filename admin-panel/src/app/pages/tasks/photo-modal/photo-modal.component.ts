import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-photo-modal',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule 
   ],
  templateUrl: './photo-modal.component.html',
  styleUrl: './photo-modal.component.scss'
})
export class PhotoModalComponent {
  photos: { photo_url: string }[];

  constructor(
    public dialogRef: MatDialogRef<PhotoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { photos: { photo_url: string }[] }
  ) {
    this.photos = data.photos;
  }

  close() {
    this.dialogRef.close();
  }
}
