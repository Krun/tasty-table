import { Component, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { ColumnComponent, TableComponent, TableModel, SelectionEvent } from './table.component';

type DataType = { first: number, second: string, third: string[] };

/**
 * Extending BasicColumnComponent lets you define a simple template
 * that exports the data object in its 'data' member;
 */
@Component({ template: '{{data.first}}' })
export class Column1 extends ColumnComponent<DataType> { }

/**
 * Columns can have complex templates to represent any kind of data type.
 */
@Component({
  template: `
  <p>{{data.third.toString()}}</p>
  <ul><li *ngFor="let s of data.third">{{s}}</li></ul>`
})
export class Column2 extends ColumnComponent<DataType> { }

/**
 * Columns can define any kind of data transformations.
 */
@Component({ template: '<p>{{myData.a}} - {{myData.b}}</p>' })
export class Column3 implements ColumnComponent<DataType> {
  data: DataType;

  get myData() {
    return {
      a: this.data.first * 2,
      b: String(this.data.first)
    };
  }
}

@Component({
  selector: 'my-app',
  template: `
    <h1>Responsive Data Tables</h1>
    Number of data rows: <input [(ngModel)]="numberOfRows" type="number"><button (click)="updateData()">update</button>
    <label> With checkboxes <input type="checkbox" [(ngModel)]="selectable"></label>
    <data-table title="Example" [model]="tableModel" [selectable]="selectable" (selectionChange)="tableSelect($event)"></data-table>
  `,
})
export class AppComponent {
  selectable = true;
  numberOfRows = 5000;
  tableModel: TableModel<DataType> = {
    columns: [
      // By setting numeric: true the column will be sorted numerically
      { title: "Column 1", component: Column1, numeric: true },
      { title: "Column 2", component: Column2 },
      { title: "Column 3", component: Column3 },
      // For simple data types, instead of a template component we can simply define
      // a function which will yield the cell content.
      // This is way more efficient, by the way!
      { title: "Column 4", func: (x: DataType) => x.second },
      { title: "Column 5", func: (x: DataType) => x.first },
    ],
    data: []
  };

  constructor(private changeDetector: ChangeDetectorRef) { }

  tableSelect(event: SelectionEvent) {
    // We can listen to selections in table rows.
    console.log(event);
  }

  ngAfterViewInit() {
    this.updateData();
  }

  updateData() {
    this.tableModel.data = Array(this.numberOfRows).fill(0).map((_, i) => ({ first: i, second: "b" + (3000 - i), third: ["a" + i, "b" + i] }));
    this.changeDetector.detectChanges();
  }
}
