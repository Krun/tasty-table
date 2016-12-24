import { NgModule }      from '@angular/core';
import { CommonModule } from '@angular/common';
import { FunctionColumnComponent, TableComponent, DataTableCellInsertPoint }  from './table.component';
import { FormsModule }   from '@angular/forms';

@NgModule({
  imports: [ CommonModule, FormsModule ],
  entryComponents: [FunctionColumnComponent],
  declarations: [ TableComponent, DataTableCellInsertPoint, FunctionColumnComponent ],
  exports: [ TableComponent ],
})
export class TableModule { }