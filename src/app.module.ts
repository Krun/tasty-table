import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';

import { AppComponent, Column1, Column2, Column3 }  from './app.component';
import { TableModule } from './table.module';

@NgModule({
  imports:      [ BrowserModule, TableModule, FormsModule ],
  declarations: [ AppComponent, Column1, Column2, Column3 ],
  entryComponents: [ Column1, Column2, Column3 ],
  bootstrap:    [ AppComponent ]
})
export class AppModule { }
